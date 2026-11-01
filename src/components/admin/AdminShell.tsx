import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Users, ClipboardList, Settings, ShieldCheck, History, Loader2, BookOpen, Type } from "lucide-react";
import { Container } from "@/components/site/Page";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminData, manageMembership } from "@/lib/admin.functions";
import { toast } from "sonner";
import { useSiteText } from "@/lib/site-text-context";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/applications", label: "Applications", icon: ClipboardList },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/content", label: "Content", icon: BookOpen },
  { to: "/admin/site-text", label: "Site Text", icon: Type },
  { to: "/admin/universities", label: "Universities", icon: BookOpen },
  { to: "/admin/reports", label: "Reports", icon: ClipboardList },
  { to: "/admin/representatives", label: "Representatives", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/administrators", label: "Administrators", icon: ShieldCheck },
  { to: "/admin/audit", label: "Audit log", icon: History },
] as const;
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const t = useSiteText("phase4");
  return <Container className="py-8 sm:py-12"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">MedKonet · Administration</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-4" /> Private administrator area</span></div>
    <nav aria-label="Administrator" className="mb-8 grid grid-cols-2 gap-2 border-b pb-5 sm:flex sm:flex-wrap">{links.map(({ to, label, icon: Icon }) => <Button asChild variant="ghost" key={to} className="justify-start"><Link to={to} activeOptions={{ exact: true }} activeProps={{ className: "bg-accent text-primary" }}><Icon className="size-4" />{t(label)}</Link></Button>)}</nav>{children}</Container>;
}
export function useAdminOverview() {
  const fetch = useServerFn(getAdminData);
  return useQuery({ queryKey: ["admin", "overview"], queryFn: () => fetch() });
}
export function useAdminAction() {
  const execute = useServerFn(manageMembership);
  const qc = useQueryClient();
  return async (data: { action: "review" | "invited" | "onboarded" | "settings" | "grant" | "revoke"; target?: string; data: Record<string, string | boolean> }) => {
    try { await execute({ data }); await qc.invalidateQueries({ queryKey: ["admin"] }); toast.success("Saved successfully."); return true; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save. Please try again."); return false; }
  };
}
export function QueryState({ loading, error }: { loading: boolean; error: unknown }) {
  if (loading) return <p className="flex items-center gap-2 py-8 text-muted-foreground" role="status"><Loader2 className="size-5 animate-spin" />Loading…</p>;
  if (error) return <p role="alert" className="py-6 text-destructive">{error instanceof Error ? error.message : "Could not load this page."}</p>;
  return null;
}
export function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : "—"; }