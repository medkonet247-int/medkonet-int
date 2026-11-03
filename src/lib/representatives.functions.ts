import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDevMode } from "./security.server";
import {
  communityReportSchema, proposalSchema, representativeChangeSchema, representativeReportStatusSchema,
  representativeReviewSchema, representativeSchema,
  type RepContext, type WelcomeMember, type DirectoryReps, type RepresentativeAdminData,
} from "./representatives";

type Db = SupabaseClient<Database>;
async function admin(db: Db, user: string) {
  if (isDevMode()) throw new Error("Administrator privileges are disabled while development mode is on.");
  const { data } = await db.rpc("has_role", { _user_id: user, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}
async function representativeUniversityId(db: Db): Promise<string> {
  const r = await db.rpc("representative_context");
  if (r.error) throw new Error("Forbidden");
  const ctx = r.data as unknown as RepContext;
  if (!ctx.active || !ctx.university) throw new Error("Forbidden");
  return ctx.university.id;
}

export const readRepresentativeContext = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const r = await context.supabase.rpc("representative_context");
  if (r.error) throw new Error("Could not load representative status.");
  return r.data as unknown as RepContext;
});

export const readWelcomeList = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const r = await context.supabase.rpc("representative_welcome_list");
  if (r.error) throw new Error("Could not load the welcome list.");
  return (r.data as unknown as WelcomeMember[]) ?? [];
});

export const readMySubmissions = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [proposals, reports] = await Promise.all([
    context.supabase.from("representative_announcements").select("id,university_id,created_by,title,message,status,admin_note,created_at,reviewed_at").order("created_at", { ascending: false }).limit(100),
    context.supabase.from("representative_reports").select("id,university_id,category,message,status,admin_note,created_at,reviewed_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (proposals.error || reports.error) throw new Error("Could not load your submissions.");
  return { proposals: proposals.data ?? [], reports: reports.data ?? [] };
});

export const submitProposal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => proposalSchema.parse(d)).handler(async ({ data, context }) => {
  const universityId = await representativeUniversityId(context.supabase);
  const r = await context.supabase.from("representative_announcements").insert({ university_id: universityId, created_by: context.userId, title: data.title, message: data.message }).select("id").single();
  if (r.error) throw new Error(r.error.code === "23514" ? "Check the title and message lengths." : "Could not submit the proposal.");
  return { ok: true };
});
export const editProposal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => proposalSchema.parse(d)).handler(async ({ data, context }) => {
  if (!data.id) throw new Error("Missing proposal reference.");
  const r = await context.supabase.from("representative_announcements").update({ title: data.title, message: data.message }).eq("id", data.id).eq("created_by", context.userId).select("id").single();
  if (r.error) throw new Error(r.error.code === "PGRST116" ? "Only proposals still awaiting approval can be edited." : "Could not save the proposal.");
  return { ok: true };
});
export const withdrawProposal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
  const r = await context.supabase.from("representative_announcements").update({ status: "Withdrawn" }).eq("id", data.id).eq("created_by", context.userId).select("id").single();
  if (r.error) throw new Error(r.error.code === "PGRST116" ? "Only proposals still awaiting approval can be withdrawn." : "Could not withdraw the proposal.");
  return { ok: true };
});
export const submitReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => communityReportSchema.parse(d)).handler(async ({ data, context }) => {
  const universityId = await representativeUniversityId(context.supabase);
  const r = await context.supabase.from("representative_reports").insert({ university_id: universityId, created_by: context.userId, category: data.category, message: data.message }).select("id").single();
  if (r.error) throw new Error(r.error.code === "23514" ? "Check the message length." : "Could not submit the report.");
  return { ok: true };
});

export const readDirectoryReps = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const r = await context.supabase.rpc("representative_directory");
  if (r.error) throw new Error("Could not load representatives.");
  return r.data as unknown as DirectoryReps;
});

export const readRepresentativeAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await admin(context.supabase, context.userId);
  const [allowlist, universities, proposals, reports, settings] = await Promise.all([
    context.supabase.rpc("representative_allowlist_admin"),
    context.supabase.from("universities").select("id,name,state").eq("active", true).eq("verification_status", "Verified").order("name").limit(500),
    context.supabase.from("representative_announcements").select("id,university_id,created_by,title,message,status,admin_note,created_at,reviewed_at").order("created_at", { ascending: false }).limit(200),
    context.supabase.from("representative_reports").select("id,university_id,category,message,status,admin_note,created_at,reviewed_at").order("created_at", { ascending: false }).limit(200),
    context.supabase.from("membership_settings").select("representative_programme_active").maybeSingle(),
  ]);
  if (allowlist.error || universities.error || proposals.error || reports.error || settings.error) throw new Error("Could not load representative management.");
  return {
    programme: (settings.data as { representative_programme_active: boolean } | null)?.representative_programme_active ?? false,
    allowlist: (allowlist.data as unknown as RepresentativeAdminData["allowlist"]) ?? [],
    proposals: proposals.data ?? [],
    reports: reports.data ?? [],
    universities: universities.data ?? [],
  } satisfies RepresentativeAdminData;
});

export const addRepresentative = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => representativeSchema.parse(d)).handler(async ({ data, context }) => {
  await admin(context.supabase, context.userId);
  const u = await context.supabase.from("universities").select("id").eq("id", data.university_id).eq("active", true).eq("verification_status", "Verified").maybeSingle();
  if (!u.data) throw new Error("Choose an active, verified university.");
  const r = await context.supabase.from("representative_allowlist").insert({ email: data.email, university_id: data.university_id, notes: data.notes }).select("id").single();
  if (r.error) throw new Error(r.error.code === "23505" ? "This email is already on the representative allowlist." : "Could not add the representative.");
  return { ok: true };
});
export const changeRepresentative = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => representativeChangeSchema.parse(d)).handler(async ({ data, context }) => {
  await admin(context.supabase, context.userId);
  const values = data.action === "suspend" ? { status: "Suspended" } : data.action === "reinstate" ? { status: "Active" } : data.action === "revoke" ? { status: "Revoked" } : data.action === "directory" ? { show_on_directory: data.show_on_directory === true } : { notes: data.notes ?? "" };
  const r = await context.supabase.from("representative_allowlist").update(values).eq("id", data.id).select("id").single();
  if (r.error) throw new Error("Could not update the representative.");
  return { ok: true };
});
export const reviewProposal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => representativeReviewSchema.parse(d)).handler(async ({ data, context }) => {
  await admin(context.supabase, context.userId);
  const r = await context.supabase.rpc("representative_review_proposal", {
    _id: data.id, _action: data.action,
    ...data.title !== undefined ? { _title: data.title } : {}, ...data.message !== undefined ? { _message: data.message } : {},
    ...data.note ? { _note: data.note } : {}, _national: data.national,
  });
  if (r.error) throw new Error(r.error.message === "This proposal was already reviewed" ? "This proposal was already reviewed." : "Could not review the proposal.");
  return { ok: true };
});
export const updateCommunityReport = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => representativeReportStatusSchema.parse(d)).handler(async ({ data, context }) => {
  await admin(context.supabase, context.userId);
  const r = await context.supabase.rpc("representative_update_report", { _id: data.id, _status: data.status, _note: data.note });
  if (r.error) throw new Error("Could not update the report.");
  return { ok: true };
});
