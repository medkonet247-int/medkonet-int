import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuditLog } from "@/lib/admin.functions";
import { AdminShell, QueryState, useAdminOverview, dateTime } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/_admin/admin/audit")({ head: () => seo("Administrator Audit Log", "Private read-only MedKonet membership audit history.", { noindex: true }), component: Audit });
function Audit() {
  const [page, setPage] = useState(1); const fetch = useServerFn(getAuditLog); const overview = useAdminOverview(); const list = useQuery({ queryKey: ["admin", "audit", page], queryFn: () => fetch({ data: { page } }) });
  return <AdminShell title="Audit log"><QueryState loading={list.isLoading} error={list.error} />{list.data && <><p className="mb-4 text-sm text-muted-foreground">{list.data.total} recorded actions · read-only</p><div className="divide-y border-y">{list.data.entries.map(e => <article key={e.id} className="space-y-2 py-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold capitalize">{e.action.replaceAll("_", " ")}</h2><time className="text-xs text-muted-foreground">{dateTime(e.created_at)}</time></div><p className="break-words text-sm">Administrator: {overview.data?.profiles.find(p => p.id === e.actor_id)?.full_name ?? e.actor_id ?? "System"}</p><p className="break-all text-xs text-muted-foreground">Target: {e.target_id ?? "Settings / allowlist"}</p><p className="whitespace-pre-wrap break-all text-xs text-muted-foreground">{JSON.stringify(e.details)}</p></article>)}</div>{!list.data.entries.length && <p className="py-10 text-muted-foreground">No audit entries yet.</p>}<div className="mt-5 flex items-center justify-between gap-3"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><span className="text-xs">Page {page}</span><Button variant="outline" size="sm" disabled={page*25 >= list.data.total} onClick={() => setPage(p => p + 1)}>Next</Button></div></>}</AdminShell>;
}