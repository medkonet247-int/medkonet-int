import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDevMode } from "./security.server";
import { siteTextInput } from "./site-text";

export const getSiteText = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.from("site_text").select("key,current_value");
  if (result.error) throw new Error("Could not load site text.");
  return result.data;
});
export const getAdminSiteText = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isDevMode() || role.error || !role.data) throw new Error("Forbidden");
  const result = await context.supabase.from("site_text").select("*").order("page").order("section").order("key");
  if (result.error) throw new Error("Could not load site text.");
  return result.data;
});
export const editSiteText = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => siteTextInput.parse(input)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isDevMode() || role.error || !role.data) throw new Error("Forbidden");
  const result = await context.supabase.rpc("edit_site_text", { _key: data.key, _value: data.value, _expected: data.expected });
  if (result.error) throw new Error(result.error.message);
  return { ok: true };
});