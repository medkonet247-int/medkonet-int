import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { sendEmail, verificationEmail } from "@/lib/email/provider.server";
import { hmac, isDevMode, randomCode, randomToken, requestOrigin, safeEqual } from "@/lib/security.server";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_S = 60;
export const EMAIL_HOURLY_CAP = 5;
export const IP_HOURLY_CAP = 20;

export type SendStatus = "sent" | "not_configured" | "send_failed" | "rate_limited";
export type IssueResult = { status: SendStatus; cooldownSeconds: number; message?: string; devCode?: string };

const hourAgo = () => new Date(Date.now() - 3600_000).toISOString();

export async function countEvents(kind: string, key: string, sinceIso: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("rate_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("key", key)
    .gte("created_at", sinceIso);
  return count ?? 0;
}

export async function recordEvent(kind: string, key: string) {
  await supabaseAdmin.from("rate_events").insert({ kind, key });
}

export async function issueCode(userId: string, email: string, ip: string): Promise<IssueResult> {
  // Cooldown and hourly caps (per email and per IP)
  const { data: last } = await supabaseAdmin
    .from("verification_codes")
    .select("created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last) {
    const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_S) {
      return { status: "rate_limited", cooldownSeconds: Math.ceil(RESEND_COOLDOWN_S - elapsed), message: "Please wait before requesting another code." };
    }
  }
  const [emailCount, ipCount] = await Promise.all([
    supabaseAdmin.from("verification_codes").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", hourAgo()),
    supabaseAdmin.from("verification_codes").select("id", { count: "exact", head: true }).eq("request_ip", ip).gte("created_at", hourAgo()),
  ]);
  if ((emailCount.count ?? 0) >= EMAIL_HOURLY_CAP || (ipCount.count ?? 0) >= IP_HOURLY_CAP) {
    return { status: "rate_limited", cooldownSeconds: 3600, message: "Too many codes requested. Please try again in an hour." };
  }

  const code = randomCode();
  const token = randomToken();
  const now = new Date().toISOString();
  // A new code invalidates all earlier ones.
  await supabaseAdmin
    .from("verification_codes")
    .update({ invalidated_at: now })
    .eq("email", email)
    .is("consumed_at", null)
    .is("invalidated_at", null);
  const { error } = await supabaseAdmin.from("verification_codes").insert({
    user_id: userId,
    email,
    code_hash: await hmac(`code:${email}:${code}`),
    token_hash: await hmac(`link:${token}`),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    request_ip: ip,
  });
  if (error) throw new Error("Could not create verification code");

  const link = `${requestOrigin()}/verify-email?t=${token}`;
  const mail = verificationEmail(code, link);
  const res = await sendEmail({ to: email, ...mail });
  const devCode = isDevMode() ? code : undefined;
  const status: SendStatus = !res.configured ? "not_configured" : res.sent ? "sent" : "send_failed";
  // Surface the provider's exact error so delivery problems are diagnosable.
  const message = !res.configured || res.sent ? undefined : res.error;
  return { status, cooldownSeconds: RESEND_COOLDOWN_S, ...(devCode ? { devCode } : {}), ...(message ? { message } : {}) };
}

export type VerifyOutcome =
  | { ok: true; role: "admin" | "applicant"; tokenHash: string; email: string }
  | { ok: false; reason: "invalid" | "expired" | "wrong" | "locked" | "rate_limited"; attemptsRemaining?: number };

export async function finalize(userId: string, email: string): Promise<VerifyOutcome> {
  const { data: role, error } = await supabaseAdmin.rpc("complete_registration", { _user_id: userId, _dev_mode: isDevMode() });
  if (error) throw new Error("Could not complete registration");
  const upd = await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });
  if (upd.error) throw new Error("Could not confirm email");
  const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) throw new Error("Could not start session");
  return { ok: true, role: role === "admin" ? "admin" : "applicant", tokenHash, email };
}

export async function verifyByCode(email: string, code: string): Promise<VerifyOutcome> {
  const { data: row } = await supabaseAdmin
    .from("verification_codes")
    .select("*")
    .eq("email", email)
    .is("consumed_at", null)
    .is("invalidated_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return { ok: false, reason: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("verification_codes").update({ invalidated_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, reason: "expired" };
  }
  const match = safeEqual(await hmac(`code:${email}:${code}`), row.code_hash);
  if (!match) {
    const attempts = row.attempts + 1;
    await supabaseAdmin
      .from("verification_codes")
      .update({ attempts, ...(attempts >= MAX_ATTEMPTS ? { invalidated_at: new Date().toISOString() } : {}) })
      .eq("id", row.id);
    if (attempts >= MAX_ATTEMPTS) return { ok: false, reason: "locked", attemptsRemaining: 0 };
    return { ok: false, reason: "wrong", attemptsRemaining: MAX_ATTEMPTS - attempts };
  }
  // Single use: consume atomically (only if still unconsumed)
  const { data: consumed } = await supabaseAdmin
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id");
  if (!consumed?.length) return { ok: false, reason: "invalid" };
  return finalize(row.user_id, row.email);
}

export async function verifyByToken(token: string): Promise<VerifyOutcome> {
  if (!/^[a-f0-9]{64}$/.test(token)) return { ok: false, reason: "invalid" };
  const { data: row } = await supabaseAdmin
    .from("verification_codes")
    .select("*")
    .eq("token_hash", await hmac(`link:${token}`))
    .maybeSingle();
  if (!row || row.consumed_at || row.invalidated_at) return { ok: false, reason: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  const { data: consumed } = await supabaseAdmin
    .from("verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id");
  if (!consumed?.length) return { ok: false, reason: "invalid" };
  return finalize(row.user_id, row.email);
}

export function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
