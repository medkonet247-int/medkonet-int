import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AdminShell, QueryState, useAdminOverview } from "@/components/admin/AdminShell";
import { Applications } from "@/components/admin/Applications";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/_admin/admin")({ head: () => seo("Administrator Dashboard", "Private MedKonet membership overview and applications.", { noindex: true }), component: Admin });
function Admin() {
  const path = useLocation({ select: l => l.pathname });
  if (path !== "/admin" && path !== "/admin/") return <Outlet />;
  return <Overview />;
}
function Overview() {
  const { data, isLoading, error } = useAdminOverview();
  return <AdminShell title="Administrator Dashboard"><QueryState loading={isLoading} error={error} />{data && <><div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{(["total", "pending", "approved", "rejected", "universities", "states"] as const).map(k => <div key={k} className="rounded-lg border bg-card p-4"><p className="text-xs font-medium capitalize text-muted-foreground">{k}</p><p className="mt-2 font-display text-3xl font-bold">{data.counts[k]}</p></div>)}</div>{data.counts.total === 0 && <p className="mt-4 text-sm text-muted-foreground">No applications yet. Counts will update as verified applications arrive.</p>}<div className="my-8 flex flex-wrap items-center justify-between gap-3 border-y py-5"><div><h2 className="font-semibold">Membership applications</h2><p className="mt-1 text-sm text-muted-foreground">Review applicants and coordinate their welcome.</p></div><Button asChild variant="outline"><Link to="/admin/members">View member groups</Link></Button></div><Applications /></>}</AdminShell>;
}
