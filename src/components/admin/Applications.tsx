import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Search, ChevronLeft, ChevronRight, MessageCircle, Check, UserCheck, Eye } from "lucide-react";
import { listApplications } from "@/lib/admin.functions";
import { invitationMessage, whatsappUrl, DEFAULT_INVITATION } from "@/lib/membership";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/site/Field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { QueryState, useAdminOverview, useAdminAction, dateTime } from "./AdminShell";

type Application = Awaited<ReturnType<typeof listApplications>>["applications"][number];
type Group = "all" | "applicants" | "awaiting" | "onboarded";
export function Applications({ members = false }: { members?: boolean }) {
  const overview = useAdminOverview();
  const fetch = useServerFn(listApplications);
  const [filters, setFilters] = useState({ q: "", status: "" as "" | "Pending" | "Approved" | "Rejected", university: "", state: "", oldest: false, page: 1, group: (members ? "applicants" : "all") as Group });
  const result = useQuery({ queryKey: ["admin", "applications", filters], queryFn: () => fetch({ data: filters }) });
  const [selected, setSelected] = useState<Application | null>(null);
  const [decision, setDecision] = useState<{ app: Application; action: "review" | "invited" | "onboarded"; status?: "Approved" | "Rejected" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Application | null>(null);
  const [message, setMessage] = useState("");
  const save = useAdminAction();
  const update = (patch: Partial<typeof filters>) => setFilters(p => ({ ...p, ...patch, page: 1 }));
  const manager = (a: Application) => a.membership_management;
  const person = (id: string | null | undefined) => overview.data?.profiles.find(p => p.id === id)?.full_name ?? id ?? "—";
  const ask = (app: Application, action: "review" | "invited" | "onboarded", status?: "Approved" | "Rejected") => { setReason(manager(app)?.rejection_reason ?? ""); setDecision({ app, action, ...status ? { status } : {} }); };
  const openInvite = (app: Application) => { const s = overview.data?.settings; if (!s?.whatsapp_link) return; setMessage(invitationMessage(s.invitation_template || DEFAULT_INVITATION, app.full_name, s.whatsapp_link)); setInvite(app); };
  async function confirm() {
    if (!decision || busy) return;
    setBusy(true);
    const ok = await save({ action: decision.action, target: decision.app.id, data: decision.action === "review" ? { status: decision.status ?? "Rejected", reason } : {} });
    setBusy(false); if (ok) { setDecision(null); setSelected(null); }
  }
  function actions(a: Application) {
    const m = manager(a);
    return <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => setSelected(a)}><Eye className="size-4" />Details</Button>
      <Button size="sm" onClick={() => ask(a, "review", "Approved")}>Approve</Button>
      <Button size="sm" variant="outline" onClick={() => ask(a, "review", "Rejected")}>Reject</Button>
      {a.application_status === "Approved" && <>
        <Button size="sm" variant="outline" disabled={!overview.data?.settings.whatsapp_link} onClick={() => openInvite(a)}><MessageCircle className="size-4" />Send WhatsApp Invitation</Button>
        {!m?.invited_at && <Button size="sm" variant="outline" disabled={!overview.data?.settings.whatsapp_link} onClick={() => ask(a, "invited")}><Check className="size-4" />Mark as invited</Button>}
        {m?.invited_at && !m.onboarded_at && <Button size="sm" variant="outline" onClick={() => ask(a, "onboarded")}><UserCheck className="size-4" />Confirm onboarding</Button>}
        {!overview.data?.settings.whatsapp_link && <p className="w-full text-xs text-muted-foreground">Add the official invitation link in <Link to="/admin/settings" className="text-primary underline">Settings</Link>.</p>}
      </>}
    </div>;
  }
  return <div className="space-y-6">
    {members && overview.data && <div className="grid gap-3 sm:grid-cols-3">{([{ key: "applicants", label: "Applicants", hint: "Pending or rejected" }, { key: "awaiting", label: "Approved applicants", hint: "Awaiting invitation or onboarding" }, { key: "onboarded", label: "Onboarded members", hint: "Invitation and onboarding confirmed" }] as const).map(g => <Button key={g.key} variant={filters.group === g.key ? "secondary" : "outline"} className="h-auto items-start whitespace-normal px-4 py-4 text-left" onClick={() => update({ group: g.key })}><span className="flex w-full flex-col gap-1"><span className="flex items-center justify-between gap-3">{g.label}<strong className="text-xl">{overview.data.counts[g.key]}</strong></span><span className="text-xs font-normal text-muted-foreground">{g.hint}</span></span></Button>)}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field id="search" label="Search name or email"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><input id="search" className={`${inputCls} pl-9`} value={filters.q} onChange={e => update({ q: e.target.value })} placeholder="Name or email" /></div></Field>
      <Field id="status" label="Status"><select id="status" className={inputCls} value={filters.status} onChange={e => update({ status: e.target.value as typeof filters.status })}><option value="">All statuses</option>{["Pending", "Approved", "Rejected"].map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field id="university-filter" label="University"><select id="university-filter" className={inputCls} value={filters.university} onChange={e => update({ university: e.target.value })}><option value="">All universities</option>{overview.data?.counts.universityOptions?.sort().map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field id="state-filter" label="State"><select id="state-filter" className={inputCls} value={filters.state} onChange={e => update({ state: e.target.value })}><option value="">All states</option>{overview.data?.counts.stateOptions?.sort().map(s => <option key={s}>{s}</option>)}</select></Field>
      <Field id="sort" label="Submission order"><select id="sort" className={inputCls} value={filters.oldest ? "oldest" : "newest"} onChange={e => update({ oldest: e.target.value === "oldest" })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></Field>
    </div>
    <QueryState loading={result.isLoading || overview.isLoading} error={result.error || overview.error} />
    {result.data && <><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{result.data.total} application{result.data.total === 1 ? "" : "s"}</p><Button variant="ghost" size="sm" onClick={() => setFilters({ q: "", status: "", university: "", state: "", oldest: false, page: 1, group: filters.group })}>Clear filters</Button></div>
      {!result.data.applications.length ? <div className="border-y py-14 text-center"><h2 className="font-semibold">No applications found</h2><p className="mt-2 text-sm text-muted-foreground">{result.data.total ? "Try another page or clear your filters." : "Applications matching this selection will appear here."}</p></div> : <div className="grid gap-4">{result.data.applications.map(a => <article key={a.id} className="rounded-lg border bg-card p-4 shadow-xs sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h2 className="text-lg font-semibold">{a.full_name}</h2><p className="break-all text-sm text-muted-foreground">{a.email}</p></div><span className={`rounded-md px-2 py-1 text-xs font-semibold ${a.application_status === "Approved" ? "bg-success/10 text-success" : a.application_status === "Rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning-foreground"}`}>{a.application_status}</span></div><div className="my-4 grid gap-1 text-sm sm:grid-cols-2"><p>{a.university} · {a.state}</p><p className="break-all">WhatsApp: {a.whatsapp_number}</p><p className="text-xs text-muted-foreground">Submitted {dateTime(a.submitted_at)}</p><p className="text-xs text-muted-foreground">{manager(a)?.onboarded_at ? `Onboarded ${dateTime(manager(a)?.onboarded_at)}` : manager(a)?.invited_at ? `Invitation marked ${dateTime(manager(a)?.invited_at)}` : "Invitation not marked as sent"}</p></div>{actions(a)}</article>)}</div>}
      <div className="flex items-center justify-between gap-3"><Button variant="outline" size="sm" disabled={filters.page === 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}><ChevronLeft className="size-4" />Previous</Button><span className="text-xs text-muted-foreground">Page {filters.page} of {Math.max(1, Math.ceil(result.data.total / 12))}</span><Button variant="outline" size="sm" disabled={filters.page * 12 >= result.data.total} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next<ChevronRight className="size-4" /></Button></div>
    </>}
    <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>{selected?.full_name}</DialogTitle><DialogDescription>Application details · private</DialogDescription></DialogHeader>{selected && <><dl className="grid gap-4 text-sm sm:grid-cols-2">{[["Email",selected.email],["WhatsApp",selected.whatsapp_number],["University",selected.university],["University type",selected.university_type],["State",selected.state],["Course",selected.course],["Academic level",selected.current_level],["Status",selected.application_status],["Submitted",dateTime(selected.submitted_at)],["Reviewed",dateTime(selected.reviewed_at)],["Reviewed by",person(selected.reviewed_by)],["Invitation marked",dateTime(manager(selected)?.invited_at)],["Invited by",person(manager(selected)?.invited_by)],["Onboarding confirmed",dateTime(manager(selected)?.onboarded_at)],["Confirmed by",person(manager(selected)?.onboarded_by)]].map(([k,v]) => <div key={k} className="min-w-0"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 break-words font-medium">{v}</dd></div>)}</dl><div><h3 className="text-sm font-semibold">Reason for joining</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{selected.reason_for_joining}</p></div>{manager(selected)?.rejection_reason && <div><h3 className="text-sm font-semibold">Internal rejection reason</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm">{manager(selected)?.rejection_reason}</p></div>}{actions(selected)}</>}</DialogContent></Dialog>
    <Dialog open={!!decision} onOpenChange={o => !o && !busy && setDecision(null)}><DialogContent className="w-[calc(100%-2rem)] rounded-lg"><DialogHeader><DialogTitle>{decision?.action === "review" ? `${decision.status === "Approved" ? "Approve" : "Reject"} application?` : decision?.action === "invited" ? "Mark invitation as sent?" : "Confirm onboarding?"}</DialogTitle><DialogDescription>{decision?.app.full_name}. {decision?.action === "invited" ? "Confirm you actually sent the invitation. Opening WhatsApp does not send it." : decision?.action === "onboarded" ? "Confirm the student has completed onboarding, not merely received an invitation." : "This decision and your identity will be recorded in the audit log."}</DialogDescription></DialogHeader>{decision?.status === "Rejected" && <Field id="rejection-reason" label="Rejection reason (optional, internal only)"><textarea id="rejection-reason" rows={4} className={inputCls} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></Field>}<DialogFooter><Button variant="outline" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button><Button disabled={busy} onClick={() => void confirm()}>{busy ? "Saving…" : "Confirm"}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!invite} onOpenChange={o => !o && setInvite(null)}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>WhatsApp invitation</DialogTitle><DialogDescription>{invite?.full_name} · {invite?.whatsapp_number}</DialogDescription></DialogHeader><Field id="invitation-message" label="Message"><textarea id="invitation-message" className={inputCls} rows={12} maxLength={6000} value={message} onChange={e => setMessage(e.target.value)} /></Field><p className="text-xs text-muted-foreground">Nothing is sent automatically. Mark as invited separately after sending.</p><DialogFooter><Button variant="outline" onClick={() => setInvite(null)}>Close</Button>{invite && (() => { try { const url = whatsappUrl(invite.whatsapp_number, message); return <Button asChild><a href={url} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" />Open WhatsApp</a></Button>; } catch (e) { return <p role="alert" className="text-sm text-destructive">{(e as Error).message}</p>; } })()}</DialogFooter></DialogContent></Dialog>
  </div>;
}