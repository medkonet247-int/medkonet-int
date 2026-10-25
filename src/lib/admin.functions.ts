import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDevMode } from "@/lib/security.server";
import { DEFAULT_INVITATION, settingsSchema } from "./membership";

async function assertAdmin(db: SupabaseClient<Database>, userId: string) {
  if (isDevMode()) throw new Error("Administrator privileges are disabled while development mode is on.");
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}
export type Summary = { total: number; pending: number; approved: number; rejected: number; universities: number; states: number; applicants: number; awaiting: number; onboarded: number; universityOptions: string[]; stateOptions: string[] };
export const getAdminData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context.supabase, context.userId);
  const [summary, settings, profiles] = await Promise.all([
    context.supabase.rpc("admin_membership_summary"), context.supabase.from("membership_settings").select("*").maybeSingle(), context.supabase.from("profiles").select("id,full_name,email"),
  ]);
  if (summary.error || settings.error || profiles.error) throw new Error("Could not load membership overview.");
  return { counts: summary.data as unknown as Summary, settings: settings.data ?? { whatsapp_link: "", invitation_template: DEFAULT_INVITATION, registration_open: true }, profiles: profiles.data ?? [] };
});
export const listApplications = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().max(200).default(""), status: z.enum(["", "Pending", "Approved", "Rejected"]).default(""), university: z.string().max(160).default(""), state: z.string().max(100).default(""), oldest: z.boolean().default(false), page: z.number().int().min(1).default(1), group: z.enum(["all", "applicants", "awaiting", "onboarded"]).default("all") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let query = context.supabase.from("applications").select("*,membership_management(*)", { count: "exact" });
    const q = data.q.replace(/[^\p{L}\p{N}@ ._+-]/gu, "").replace(/[%_]/g, "");
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
    if (data.status) query = query.eq("application_status", data.status);
    if (data.university) query = query.eq("university", data.university);
    if (data.state) query = query.eq("state", data.state);
    if (data.group === "applicants") query = query.neq("application_status", "Approved");
    if (data.group === "awaiting" || data.group === "onboarded") {
      const m = await context.supabase.from("membership_management").select("application_id").not("onboarded_at", "is", null);
      if (m.error) throw new Error("Could not load onboarding status.");
      const ids = (m.data ?? []).map(r => r.application_id);
      query = query.eq("application_status", "Approved");
      if (data.group === "onboarded") { if (!ids.length) return { applications: [], total: 0 }; query = query.in("id", ids); }
      else if (ids.length) query = query.not("id", "in", `(${ids.join(",")})`);
    }
    const result = await query.order("submitted_at", { ascending: data.oldest }).order("id").range((data.page - 1) * 12, data.page * 12 - 1);
    if (result.error) throw new Error("Could not load applications.");
    return { applications: result.data ?? [], total: result.count ?? 0 };
  });
export const manageMembership = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ action: z.enum(["review", "invited", "onboarded", "settings", "grant", "revoke"]), target: z.string().uuid().optional(), data: z.record(z.string(), z.union([z.string().max(5000), z.boolean()])).default({}) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.action === "settings") settingsSchema.parse(data.data);
    if (data.action === "grant" || data.action === "revoke") z.string().trim().email().parse(data.data["email"]);
    if (data.action === "review") z.object({ status: z.enum(["Approved", "Rejected"]), reason: z.string().max(2000).optional() }).parse(data.data);
    const { error } = await context.supabase.rpc("manage_membership", { _action: data.action, ...data.target ? { _target: data.target } : {}, _data: data.data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const getAdministrators = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { data, error } = await context.supabase.from("admin_allowlist").select("*").order("created_at");
  if (error) throw new Error("Could not load administrators.");
  return { administrators: data ?? [] };
});
export const getAuditLog = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: { page: number }) => z.object({ page: z.number().int().min(1) }).parse(d)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { data: rows, error, count } = await context.supabase.from("audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((data.page-1)*25,data.page*25-1);
  if (error) throw new Error("Could not load audit history.");
  return { entries: rows ?? [], total: count ?? 0 };
});
