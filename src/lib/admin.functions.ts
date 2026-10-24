import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isDevMode } from "@/lib/security.server";

async function assertAdmin(supabase: { rpc: (...a: never[]) => unknown }, userId: string) {
  if (isDevMode()) throw new Error("Administrator privileges are disabled while development mode is on.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    // RLS: only admins can read all applications.
    const { data, error } = await context.supabase
      .from("applications")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Could not load applications");
    const rows = data ?? [];
    const count = (s: string) => rows.filter((r) => r.application_status === s).length;
    const { count: total } = await context.supabase.from("applications").select("id", { count: "exact", head: true });
    return {
      counts: { total: total ?? rows.length, pending: count("Pending"), approved: count("Approved"), rejected: count("Rejected") },
      applications: rows,
    };
  });

export const reviewApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "Approved" | "Rejected" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["Approved", "Rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    // reviewed_at / reviewed_by / audit log are set by a database trigger.
    const { data: rows, error } = await context.supabase
      .from("applications")
      .update({ application_status: data.status })
      .eq("id", data.id)
      .select("id");
    if (error || !rows?.length) throw new Error("Could not update application");
    return { ok: true };
  });
