import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Container, PageHeader, Card } from "@/components/site/Page";
import { Field, inputCls } from "@/components/site/Field";
import { useSiteText } from "@/lib/site-text-context";
import { reportCategories, proposalSchema, communityReportSchema, type RepContext } from "@/lib/representatives";
import {
  readRepresentativeContext, readWelcomeList, readMySubmissions,
  submitProposal, editProposal, withdrawProposal, submitReport,
} from "@/lib/representatives.functions";

const proposalStatusKey: Record<string, string> = { "Awaiting approval": "Awaiting admin approval", Published: "Published", Rejected: "Rejected", Withdrawn: "Withdrawn" };
const reportStatusKey: Record<string, string> = { Received: "Received", "In progress": "In progress", Resolved: "Resolved" };

export function RepresentativeDashboard() {
  const t = useSiteText("representative");
  const fetchContext = useServerFn(readRepresentativeContext);
  const query = useQuery({ queryKey: ["rep", "context"], queryFn: () => fetchContext() });
  if (query.isLoading) return <Container className="py-16"><p className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="size-5 animate-spin" />Loading…</p></Container>;
  if (query.error) return <Container className="py-16 text-center" role="alert"><p className="text-destructive">{t("This area is for authorised university representatives while the representative programme is active.")}</p><Button variant="outline" className="mt-4" onClick={() => void query.refetch()}>Try again</Button></Container>;
  const ctx = query.data as RepContext | undefined;
  if (!ctx?.active) return <Container className="max-w-lg py-24 text-center"><h1 className="text-3xl font-bold">{t("Access denied")}</h1><p className="mt-3 text-muted-foreground">{t("This area is for authorised university representatives while the representative programme is active.")}</p><Button asChild className="mt-6"><Link to="/dashboard">Go to your dashboard</Link></Button></Container>;
  return <><PageHeader eyebrow={t("Members")} title={t("Representative dashboard")} intro={ctx.university ? ctx.university.name : undefined} /><Container className="py-10"><Body /></Container></>;
}

function Body() {
  const t = useSiteText("representative");
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["rep"] });
  const welcome = useQuery({ queryKey: ["rep", "welcome"], queryFn: useServerFn(readWelcomeList) });
  const submissions = useQuery({ queryKey: ["rep", "submissions"], queryFn: useServerFn(readMySubmissions) });
  const ctx = useQuery({ queryKey: ["rep", "context"], queryFn: useServerFn(readRepresentativeContext) }).data as RepContext | undefined;

  const [proposalForm, setProposalForm] = useState({ title: "", message: "" });
  const [proposalError, setProposalError] = useState("");
  const [reportForm, setReportForm] = useState({ category: "Resources", message: "" });
  const [reportError, setReportError] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = useServerFn(submitProposal);
  const saveEdit = useServerFn(editProposal);
  const withdraw = useServerFn(withdrawProposal);
  const sendReport = useServerFn(submitReport);

  async function submitProposalForm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = proposalSchema.safeParse(proposalForm);
    if (!parsed.success) { setProposalError("Add a title and a message within the length limits."); return; }
    setProposalError(""); setBusy(true);
    try { await send({ data: parsed.data }); setProposalForm({ title: "", message: "" }); toast.success("Proposal sent for administrator approval."); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not send the proposal."); }
    finally { setBusy(false); }
  }
  async function submitReportForm(e: React.FormEvent) {
    e.preventDefault();
    const parsed = communityReportSchema.safeParse(reportForm);
    if (!parsed.success) { setReportError("Write a message within the length limit."); return; }
    setReportError(""); setBusy(true);
    try { await sendReport({ data: parsed.data }); setReportForm({ category: "Resources", message: "" }); toast.success("Report sent to the administrators."); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not send the report."); }
    finally { setBusy(false); }
  }
  async function saveEditing(e: React.FormEvent) {
    e.preventDefault(); if (!editing) return;
    const parsed = proposalSchema.safeParse({ title: editing.title, message: editing.message });
    if (!parsed.success) { toast.error("Add a title and a message within the length limits."); return; }
    setBusy(true);
    try { await saveEdit({ data: { ...parsed.data, id: editing.id } }); setEditing(null); toast.success("Proposal updated."); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save the proposal."); }
    finally { setBusy(false); }
  }
  async function doWithdraw(id: string) {
    setBusy(true);
    try { await withdraw({ data: { id } }); toast.success("Proposal withdrawn."); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not withdraw the proposal."); }
    finally { setBusy(false); }
  }

  const proposals = submissions.data?.proposals ?? [];
  const reports = submissions.data?.reports ?? [];
  return <div className="max-w-4xl space-y-8">
    <p className="border-l-4 border-warning bg-muted p-4 text-sm font-medium">{t("Use members' names only to welcome them in the official WhatsApp community. Never share, copy or screenshot members' information outside MedKonet. Representatives have restricted access and no administrator permissions.")}</p>

    <Card className="p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Building2 className="size-5 text-primary" />{t("My university")}</h2>
      {ctx?.university && <p className="mt-2 text-sm text-muted-foreground">{ctx.university.type} · {ctx.university.state} · {ctx.university.location}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Pending applications", ctx?.counts?.pending], ["Approved members", ctx?.counts?.approved], ["Onboarded members", ctx?.counts?.onboarded]].map(([label, value]) => <div key={String(label)} className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{t(String(label))}</p><p className="mt-1 text-2xl font-bold">{value ?? 0}</p></div>)}</div>
    </Card>

    <Card className="p-6"><h2 className="text-lg font-semibold">{t("Members to welcome")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("Their contact details are never shared with representatives. Use the official WhatsApp community to welcome them.")}</p>
      {welcome.isLoading && <p role="status" className="mt-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading…</p>}
      {welcome.error && <p role="alert" className="mt-4 text-destructive">Could not load the welcome list.</p>}
      {welcome.data && !welcome.data.length && <p className="mt-4 border-y py-8 text-center text-muted-foreground">{t("No members to welcome yet.")}</p>}
      {!!welcome.data?.length && <ul className="mt-4 grid gap-3 sm:grid-cols-2">{welcome.data.map((m, i) => <li key={i} className="rounded-lg border p-4"><p className="font-semibold">{m.full_name}</p><dl className="mt-2 space-y-1 text-sm text-muted-foreground"><div className="flex justify-between gap-3"><dt>{t("Course")}</dt><dd className="text-right">{m.course}</dd></div><div className="flex justify-between gap-3"><dt>{t("Level")}</dt><dd className="text-right">{m.current_level}</dd></div><div className="flex justify-between gap-3"><dt>{t("Onboarding")}</dt><dd className="text-right font-medium">{m.onboarded ? t("Confirmed") : t("Not yet")}</dd></div></dl></li>)}</ul>}
    </Card>

    <Card className="p-6"><h2 className="text-lg font-semibold">{t("Propose an announcement")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("An administrator reviews every proposal before members can see it.")}</p>
      <form className="mt-4 grid gap-4" onSubmit={submitProposalForm}>
        <Field id="proposal-title" label={t("Title")} error={proposalError}><input id="proposal-title" className={inputCls} maxLength={200} value={proposalForm.title} onChange={e => setProposalForm(p => ({ ...p, title: e.target.value }))} /></Field>
        <Field id="proposal-message" label={t("Message")}><textarea id="proposal-message" rows={5} maxLength={5000} className={inputCls} value={proposalForm.message} onChange={e => setProposalForm(p => ({ ...p, message: e.target.value }))} /></Field>
        <div><Button type="submit" disabled={busy}>{t("Send proposal")}</Button></div>
      </form>
    </Card>

    <Card className="p-6"><h2 className="text-lg font-semibold">{t("Report a community need")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("Tell the administrators what your university community needs.")}</p>
      <form className="mt-4 grid gap-4" onSubmit={submitReportForm}>
        <Field id="report-category" label={t("Category")} error={reportError}>
          <select id="report-category" aria-label={t("Category")} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={reportForm.category} onChange={e => setReportForm(p => ({ ...p, category: e.target.value }))}>{reportCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </Field>
        <Field id="report-message" label={t("Message")}><textarea id="report-message" rows={5} maxLength={3000} className={inputCls} value={reportForm.message} onChange={e => setReportForm(p => ({ ...p, message: e.target.value }))} /></Field>
        <div><Button type="submit" disabled={busy}>{t("Send report")}</Button></div>
      </form>
    </Card>

    <Card className="p-6"><h2 className="text-lg font-semibold">{t("My submissions")}</h2>
      {submissions.isLoading && <p role="status" className="mt-4 flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading…</p>}
      {submissions.error && <p role="alert" className="mt-4 text-destructive">Could not load your submissions.</p>}
      {submissions.data && !proposals.length && !reports.length && <p className="mt-4 border-y py-8 text-center text-muted-foreground">{t("You have not proposed any announcements yet.")}</p>}
      {!!proposals.length && <ul className="mt-4 space-y-3">{proposals.map(p => <li key={p.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{p.title}</p><span className="rounded-full border px-2 py-0.5 text-xs">{t(proposalStatusKey[p.status] ?? p.status)}</span></div><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{p.message}</p>{p.status === "Rejected" && p.admin_note && <p className="mt-2 text-sm text-destructive">{t("Internal note")}: {p.admin_note}</p>}{p.status === "Awaiting approval" && <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setEditing({ id: p.id, title: p.title, message: p.message })}>Edit</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => void doWithdraw(p.id)}>{t("Withdraw")}</Button></div>}</li>)}</ul>}
      {!!reports.length && <ul className="mt-6 space-y-3 border-t pt-6">{reports.map(r => <li key={r.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{r.category}</p><span className="rounded-full border px-2 py-0.5 text-xs">{t(reportStatusKey[r.status] ?? r.status)}</span></div><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.message}</p>{r.admin_note && <p className="mt-2 text-sm">{t("Internal note")}: {r.admin_note}</p>}</li>)}</ul>}
    </Card>

    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Edit proposal</DialogTitle></DialogHeader>{editing && <form className="grid gap-4" onSubmit={saveEditing}><Field id="edit-proposal-title" label={t("Title")}><input id="edit-proposal-title" className={inputCls} maxLength={200} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></Field><Field id="edit-proposal-message" label={t("Message")}><textarea id="edit-proposal-message" rows={5} maxLength={5000} className={inputCls} value={editing.message} onChange={e => setEditing({ ...editing, message: e.target.value })} /></Field><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busy}>{t("Save changes")}</Button></DialogFooter></form>}</DialogContent></Dialog>
  </div>;
}
