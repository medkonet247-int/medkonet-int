import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { codeSchema, emailSchema, registrationSchema } from "@/lib/validation";
import { clientIp, isDevMode, requestOrigin } from "@/lib/security.server";
import { isEmailConfigured, passwordResetEmail, sendEmail } from "@/lib/email/provider.server";
import {
  countEvents,
  issueCode,
  publicClient,
  recordEvent,
  verifyByCode,
  verifyByToken,
  type IssueResult,
  type VerifyOutcome,
} from "@/lib/verification.server";

const GENERIC = "Something went wrong. Please try again.";

export const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => ({
  emailConfigured: isEmailConfigured(),
  devMode: isDevMode(),
}));

export const getRegistrationStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().rpc("registration_is_open");
  if (error) throw new Error("Could not check registration availability.");
  return { open: data };
});

export type RegisterResult =
  | { result: "already_verified" }
  | ({ result: "verify"; email: string } & IssueResult)
  | { result: "error"; message: string; fieldErrors?: Record<string, string> };

export const registerApplicant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data }): Promise<RegisterResult> => {
    const { data: open, error: configError } = await publicClient().rpc("registration_is_open");
    if (configError || !open) return { result: "error", message: "Registration is currently closed. Please contact the MedKonet team." };
    const parsed = registrationSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return { result: "error", message: "Please correct the highlighted fields.", fieldErrors };
    }
    const f = parsed.data;
    const ip = clientIp();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if ((await countEvents("register_ip", ip, new Date(Date.now() - 3600_000).toISOString())) >= 10) {
      return { result: "error", message: "Too many registration attempts. Please try again later." };
    }
    await recordEvent("register_ip", ip);

    const lookup = async () => {
      const { data: rows } = await supabaseAdmin.rpc("auth_user_status", { _email: f.email });
      return rows?.[0] as { user_id: string; confirmed: boolean } | undefined;
    };

    let existing = await lookup();
    if (!existing) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: f.email,
        password: f.password,
        email_confirm: false,
        user_metadata: { full_name: f.full_name },
      });
      if (created.error || !created.data.user) {
        // Likely a concurrent double submit; fall through to existing handling.
        existing = await lookup();
        if (!existing) return { result: "error", message: GENERIC };
      } else {
        const userId = created.data.user.id;
        const { error } = await supabaseAdmin.from("pending_registrations").insert({
          user_id: userId,
          email: f.email,
          data: {
            full_name: f.full_name,
            whatsapp_number: f.whatsapp_number,
            university: f.university,
            university_type: f.university_type,
            state: f.state,
            course: f.course,
            current_level: f.current_level,
            reason_for_joining: f.reason_for_joining,
          },
        });
        if (error) {
          await supabaseAdmin.auth.admin.deleteUser(userId); // never leave half-created accounts
          return { result: "error", message: GENERIC };
        }
        const issued = await issueCode(userId, f.email, ip);
        return { result: "verify", email: f.email, ...issued };
      }
    }
    if (existing.confirmed) return { result: "already_verified" };
    const issued = await issueCode(existing.user_id, f.email, ip);
    return { result: "verify", email: f.email, ...issued };
  });

export const resendCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }): Promise<IssueResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.rpc("auth_user_status", { _email: data.email });
    const u = rows?.[0];
    if (!u || u.confirmed) {
      // Do not reveal whether the address exists.
      return { status: isEmailConfigured() ? "sent" : "not_configured", cooldownSeconds: 60 };
    }
    return issueCode(u.user_id, data.email, clientIp());
  });

export type VerifyResult = VerifyOutcome | { ok: false; reason: "rate_limited" };

export const verifyEmailCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) => z.object({ email: emailSchema, code: codeSchema }).parse(d))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const ip = clientIp();
    if ((await countEvents("verify_ip", ip, new Date(Date.now() - 3600_000).toISOString())) >= 30) {
      return { ok: false, reason: "rate_limited" };
    }
    await recordEvent("verify_ip", ip);
    return verifyByCode(data.email, data.code);
  });

export const verifyEmailLink = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().max(128) }).parse(d))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const ip = clientIp();
    if ((await countEvents("verify_ip", ip, new Date(Date.now() - 3600_000).toISOString())) >= 30) {
      return { ok: false, reason: "rate_limited" };
    }
    await recordEvent("verify_ip", ip);
    return verifyByToken(data.token);
  });

export type LoginResult =
  | { result: "ok"; access_token: string; refresh_token: string }
  | { result: "unverified"; email: string }
  | { result: "error"; message: string };

export const loginWithPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) =>
    z.object({ email: emailSchema, password: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }): Promise<LoginResult> => {
    const ip = clientIp();
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const [byEmail, byIp] = await Promise.all([
      countEvents("login_fail", data.email, since),
      countEvents("login_fail_ip", ip, since),
    ]);
    if (byEmail >= 5 || byIp >= 20) {
      return { result: "error", message: "Too many failed attempts. Please wait 15 minutes and try again." };
    }
    const { data: auth, error } = await publicClient().auth.signInWithPassword(data);
    if (error || !auth.session) {
      if (error?.code === "email_not_confirmed" || /not confirmed/i.test(error?.message ?? "")) {
        return { result: "unverified", email: data.email };
      }
      await Promise.all([recordEvent("login_fail", data.email), recordEvent("login_fail_ip", ip)]);
      return { result: "error", message: "Incorrect email or password." };
    }
    return { result: "ok", access_token: auth.session.access_token, refresh_token: auth.session.refresh_token };
  });

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }) => {
    const configured = isEmailConfigured();
    const ip = clientIp();
    const since = new Date(Date.now() - 3600_000).toISOString();
    const [byEmail, byIp] = await Promise.all([countEvents("reset", data.email, since), countEvents("reset_ip", ip, since)]);
    if (byEmail >= 3 || byIp >= 10) return { configured, limited: true };
    await Promise.all([recordEvent("reset", data.email), recordEvent("reset_ip", ip)]);
    if (!configured) return { configured, limited: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.rpc("auth_user_status", { _email: data.email });
    if (rows?.[0]?.confirmed) {
      const link = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: { redirectTo: `${requestOrigin()}/reset-password` },
      });
      const url = link.data?.properties?.action_link;
      if (url) await sendEmail({ to: data.email, ...passwordResetEmail(url) });
    }
    return { configured, limited: false };
  });
