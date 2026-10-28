import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { unzipSync } from "fflate";
import { contentSchema, kinds, SIGNED_SECONDS, validateFileMeta } from "./content";
import { isDevMode } from "./security.server";

export const listContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ kind: z.enum(kinds), admin: z.boolean().default(false) }).parse(v)).handler(async ({ data, context }) => {
  if (data.admin) { const r = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (isDevMode() || r.error || !r.data) throw new Error("Forbidden"); }
  let query = context.supabase.from("content_items").select("*").eq("kind", data.kind).order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (!data.admin) query = query.eq("published", true);
  const { data: rows, error } = await query;
  if (error) throw new Error("Could not load content.");
  return rows ?? [];
});
export const getCategories = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { const r = await context.supabase.from("resource_categories").select("name").order("name"); if (r.error) throw new Error("Could not load categories."); return r.data.map(v => v.name); });
export const addCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.string().trim().min(1).max(100).parse(v)).handler(async ({ data, context }) => { const r = await context.supabase.from("resource_categories").insert({ name: data }); if (r.error) throw new Error("Could not add category. Check that it is unique."); return { ok: true }; });
export const saveContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: FormData) => { if (!(v instanceof FormData)) throw new Error("Invalid form."); return v; }).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isDevMode() || role.error || !role.data) throw new Error("Forbidden");
  const payload = contentSchema.parse(JSON.parse(String(data.get("payload"))));
  const id = payload.id ?? crypto.randomUUID();
  const previous = payload.id ? await context.supabase.from("content_items").select("file_path,kind").eq("id", id).single() : null;
  if (previous?.error || (previous?.data && previous.data.kind !== payload.kind)) throw new Error("Content not found.");
  let path = previous?.data?.file_path ?? null;
  const file = data.get("file");
  let uploaded: string | null = null;
  let storage: Awaited<typeof import("@/integrations/supabase/client.server")> | null = null;
  if (file instanceof File && file.size) {
    if (payload.kind !== "resources" || payload.details.external_url) throw new Error("Choose either a resource file or an external link.");
    const meta = validateFileMeta(file.name, file.size, file.type);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const starts = (...v: number[]) => v.every((b, i) => bytes[i] === b);
    let valid = meta.ext === "pdf" ? starts(37,80,68,70,45) : meta.ext === "png" ? starts(137,80,78,71,13,10,26,10) : ["jpg","jpeg"].includes(meta.ext) ? starts(255,216,255) : meta.ext === "webp" ? starts(82,73,70,70) && String.fromCharCode(...bytes.slice(8,12)) === "WEBP" : false;
    if (["docx","pptx"].includes(meta.ext) && starts(80,75,3,4)) {
      try { const expected = meta.ext === "docx" ? "word/document.xml" : "ppt/presentation.xml"; const archive = unzipSync(bytes, { filter: entry => entry.originalSize < 2 * 1024 * 1024 && ["[Content_Types].xml", expected].includes(entry.name) }); valid = !!archive["[Content_Types].xml"] && !!archive[expected]; } catch { valid = false; }
    }
    if (!valid) throw new Error("The file contents do not match the allowed file type.");
    storage = await import("@/integrations/supabase/client.server");
    uploaded = `${id}/${crypto.randomUUID()}.${meta.ext}`;
    const result = await storage.supabaseAdmin.storage.from("academic-resources").upload(uploaded, bytes, { contentType: meta.mime, upsert: false });
    if (result.error) throw new Error("Upload failed. Check the file size and available storage.");
    path = uploaded;
  }
  if (payload.details.external_url) path = null;
  if (payload.kind === "resources" && !path && !payload.details.external_url) throw new Error("Add a resource file or HTTPS link.");
  const values = { ...payload, id, file_path: path };
  const result = payload.id ? await context.supabase.from("content_items").update(values).eq("id", id).select("id").single() : await context.supabase.from("content_items").insert(values).select("id").single();
  if (result.error) { if (uploaded && storage) await storage.supabaseAdmin.storage.from("academic-resources").remove([uploaded]); throw new Error("Could not save content."); }
  const old = previous?.data?.file_path;
  if (old && old !== path) { storage ??= await import("@/integrations/supabase/client.server"); const removed = await storage.supabaseAdmin.storage.from("academic-resources").remove([old]); if (removed.error) throw new Error("Content saved, but the old file could not be removed. Please retry cleanup."); }
  return { id };
});
export const changeContent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["publish", "unpublish", "delete"]) }).parse(v)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (isDevMode() || role.error || !role.data) throw new Error("Forbidden");
  const item = await context.supabase.from("content_items").select("*").eq("id", data.id).single(); if (item.error) throw new Error("Content not found.");
  if (data.action === "delete" && item.data.file_path) { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const removed = await supabaseAdmin.storage.from("academic-resources").remove([item.data.file_path]); if (removed.error) throw new Error("File could not be removed. Content has not been deleted."); }
  const result = data.action === "delete" ? await context.supabase.from("content_items").delete().eq("id", data.id) : await context.supabase.from("content_items").update({ published: data.action === "publish" }).eq("id", data.id);
  if (result.error) throw new Error("Could not update content."); return { ok: true };
});
export const resourceUrl = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.string().uuid().parse(v)).handler(async ({ data, context }) => {
  const item = await context.supabase.from("content_items").select("file_path").eq("id", data).eq("kind", "resources").single(); if (item.error || !item.data.file_path) throw new Error("Resource unavailable.");
  const result = await context.supabase.storage.from("academic-resources").createSignedUrl(item.data.file_path, SIGNED_SECONDS); if (result.error) throw new Error("Could not open this file.");
  const browserBase = import.meta.env['VITE_SUPABASE_URL'];
  if (!browserBase) throw new Error("File delivery is unavailable.");
  const signed = new URL(result.data.signedUrl);
  return { url: `${browserBase.replace(/\/$/, "")}${signed.pathname}${signed.search}` };
});
export const communityLink = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { const r = await context.supabase.rpc("approved_whatsapp_link"); if (r.error) throw new Error("Community link unavailable."); return r.data || null; });
export const setWhatsappVisibility = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.boolean().parse(v)).handler(async ({ data, context }) => { if (isDevMode()) throw new Error("Forbidden"); const r = await context.supabase.rpc("set_member_whatsapp_visibility", { _show: data }); if (r.error) throw new Error("Could not save link visibility."); return { ok: true }; });