import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Field, inputCls } from "@/components/site/Field";
import { useSiteText } from "@/lib/site-text-context";
import { representativeSchema, type RepresentativeAdminData } from "@/lib/representatives";
import { readRepresentativeAdmin, addRepresentative, changeRepresentative, reviewProposal, updateCommunityReport } from "@/lib/representatives.functions";

const statusKey: Record<string, string> = { "Awaiting registration": "Awaiting registration", "Awaiting approval": "Awaiting approval", Active: "Active", Suspended: "Suspended", Revoked: "Revoked" };
const reportStatuses = ["Received", "In progress", "Resolved"] as const;

export function RepresentativeManager() {
  const t = useSiteText("representative");
  const p4 = useSiteText("phase4");
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["rep-admin"] });
  const fetch = useServerFn(readRepresentativeAdmin);
  const query = useQuery({ queryKey: ["rep-admin"], queryFn: () => fetch() });
  const data: RepresentativeAdminData | undefined = query.data;

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ email: "", university_id: "", notes: "" });
  const [formError, setFormError] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; email: string; action: "suspend" | "reinstate" | "revoke" } | null>(null);
  const [notes, setNotes] = useState<{ id: string; email: string; notes: string } | null>(null);
  const [publishing, setPublishing] = useState<{ id: string; title: string; message: string; national: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const add = useServerFn(addRepresentative);
  const change = useServerFn(changeRepresentative);
  const review = useServerFn(reviewProposal);
  const reportUpdate = useServerFn(updateCommunityReport);

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const parsed = representativeSchema.safeParse(form);
    if (!parsed.success) { setFormError("Enter a valid email address and choose a university."); return; }
    setFormError(""); setBusy(true);
    try { await add({ data: parsed.data }); toast.success("Representative added to the allowlist."); setAddOpen(false); setForm({ email: "", university_id: "", notes: "" }); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not add the representative."); }
    finally { setBusy(false); }
  }
  async function doChange(action: "suspend" | "reinstate" | "revoke", id: string) {
    setBusy(true);
    try { await change({ data: { id, action } }); toast.success("Saved successfully."); setConfirm(null); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not update the representative."); }
    finally { setBusy(false); }
  }
  async function toggleDirectory(id: string, show: boolean) {
    try { await change({ data: { id, action: "directory", show_on_directory: show } }); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not update visibility."); }
  }
  async function saveNotes(e: React.FormEvent) {
    e.preventDefault(); if (!notes) return;
    setBusy(true);
    try { await change({ data: { id: notes.id, action: "notes", notes: notes.notes } }); toast.success("Saved successfully."); setNotes(null); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not save the notes."); }
    finally { setBusy(false); }
  }
  async function doPublish(e: React.FormEvent) {
    e.preventDefault(); if (!publishing) return;
    setBusy(true);
    try { await review({ data: { id: publishing.id, action: "publish", title: publishing.title, message: publishing.message, national: publishing.national } }); toast.success("Announcement approved and published."); setPublishing(null); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not publish the proposal."); }
    finally { setBusy(false); }
  }
  async function doReject(e: React.FormEvent) {
    e.preventDefault(); if (!rejecting) return;
    setBusy(true);
    try { await review({ data: { id: rejecting.id, action: "reject", note: rejecting.note } }); toast.success("Proposal rejected."); setRejecting(null); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not reject the proposal."); }
    finally { setBusy(false); }
  }
  async function doReportUpdate(id: string, status: string, note: string) {
    setBusy(true);
    try { await reportUpdate({ data: { id, status: status as "Received" | "In progress" | "Resolved", note } }); toast.success("Saved successfully."); await refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not update the report."); }
    finally { setBusy(false); }
  }

  const universityName = (id: string) => data?.allowlist.find(r => r.university_id === id)?.university_name ?? data?.universities.find(u => u.id === id)?.name ?? "—";
  const pendingProposals = data?.proposals.filter(p => p.status === "Awaiting approval") ?? [];
  const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";

  return <div className="max-w-5xl space-y-10">
    <p className="border-l-4 border-warning bg-muted p-4 text-sm font-medium">{t("Representatives have restricted permissions: they never gain administrator access and only ever see their own university's limited information.")}</p>

    <section><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{t("Representative allowlist")}</h2><Button onClick={() => setAddOpen(true)}><Plus className="size-4" />{t("Add representative")}</Button></div>
      <p className="mt-2 text-sm text-muted-foreground">{t("Representative programme active")}: {data?.programme ? "On" : "Off"} — {t("While off, no representative can use representative features, even if allowlisted.")}</p>
      {query.isLoading && <p className="mt-4 flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" />Loading…</p>}
      {query.error && <p role="alert" className="mt-4 text-destructive">Could not load representatives. <Button variant="outline" size="sm" className="ml-2" onClick={() => void query.refetch()}>Try again</Button></p>}
      {data && !data.allowlist.length && <p className="mt-4 border-y py-10 text-center text-muted-foreground">{t("No representatives have been added yet.")}</p>}
      <div className="mt-4 space-y-3">{data?.allowlist.map(r => <article key={r.id} className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{r.applicant_name ?? r.profile_name ?? r.email}</p><p className="break-words text-sm text-muted-foreground">{r.email}</p><p className="mt-1 text-sm">{r.university_name} · {r.university_state}</p></div><span className="rounded-full border px-2 py-0.5 text-xs font-medium">{t(statusKey[r.display_status] ?? r.display_status)}</span></div>
        <dl className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2"><div className="flex justify-between gap-3 sm:block"><dt className="font-medium">Granted on</dt><dd>{new Date(r.granted_at).toLocaleDateString()}</dd></div><div className="flex justify-between gap-3 sm:block"><dt className="font-medium">{t("Internal notes")}</dt><dd className="break-words">{r.notes || "—"}</dd></div></dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><Switch checked={r.show_on_directory} onCheckedChange={v => void toggleDirectory(r.id, v)} aria-label={`${r.email} ${t("Show on the members' representatives page")}`} />{t("Show on the members' representatives page")}</label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setNotes({ id: r.id, email: r.email, notes: r.notes })}>Edit</Button>
          {r.status === "Active" && <Button variant="outline" size="sm" onClick={() => setConfirm({ id: r.id, email: r.email, action: "suspend" })}>{t("Suspend")}</Button>}
          {r.status !== "Active" && r.status !== "Revoked" && <Button variant="outline" size="sm" onClick={() => setConfirm({ id: r.id, email: r.email, action: "reinstate" })}>{t("Reinstate")}</Button>}
          {r.status !== "Revoked" && <Button variant="outline" size="sm" onClick={() => setConfirm({ id: r.id, email: r.email, action: "revoke" })}>{t("Revoke")}</Button>}
        </div>
      </article>)}</div>
    </section>

    <section className="border-t pt-8"><h2 className="text-xl font-semibold">{t("Announcement proposals")}</h2>
      {data && !pendingProposals.length && <p className="mt-4 border-y py-10 text-center text-muted-foreground">{t("No proposals are waiting for review.")}</p>}
      <div className="mt-4 space-y-3">{pendingProposals.map(p => <article key={p.id} className="rounded-lg border bg-card p-5"><p className="font-semibold">{p.title}</p><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{p.message}</p><p className="mt-3 text-sm">{universityName(p.university_id)} · {new Date(p.created_at).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => setPublishing({ id: p.id, title: p.title, message: p.message, national: false })}>{t("Approve and publish")}</Button><Button variant="outline" size="sm" onClick={() => setRejecting({ id: p.id, note: "" })}>{t("Reject")}</Button></div></article>)}</div>
    </section>

    <section className="border-t pt-8"><h2 className="text-xl font-semibold">{t("Community-need reports")}</h2>
      {data && !data.reports.length && <p className="mt-4 border-y py-10 text-center text-muted-foreground">{t("No reports have been submitted.")}</p>}
      <div className="mt-4 space-y-3">{data?.reports.map(r => <article key={r.id} className="rounded-lg border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{r.category}</p><span className="rounded-full border px-2 py-0.5 text-xs">{r.status}</span></div><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.message}</p><p className="mt-3 text-sm">{universityName(r.university_id)} · {new Date(r.created_at).toLocaleDateString()}</p><form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); const el = (e.currentTarget as HTMLFormElement).elements; void doReportUpdate(r.id, (el.namedItem("status") as HTMLSelectElement).value, (el.namedItem("note") as HTMLInputElement).value); }}>
        <select name="status" aria-label={t("Update status")} className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue={r.status}>{reportStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <Input name="note" aria-label={t("Internal note")} placeholder={t("Internal note")} maxLength={2000} className="max-w-xs" defaultValue={r.admin_note} />
        <Button size="sm" variant="outline" type="submit" disabled={busy}>{t("Update status")}</Button>
      </form></article>)}</div>
    </section>

    <Dialog open={addOpen} onOpenChange={open => { if (!open && !busy) setAddOpen(false); }}><DialogContent><DialogHeader><DialogTitle>{t("Add representative")}</DialogTitle></DialogHeader>
      <form className="grid gap-4" onSubmit={submitAdd}>
        <Field id="rep-email" label={t("Email address")} error={formError} hint="The person becomes an active representative once their email is verified, their application is approved and the programme is on."><input id="rep-email" type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
        <Field id="rep-university" label={t("University")}><select id="rep-university" aria-label={t("University")} className={selectClass} value={form.university_id} onChange={e => setForm(p => ({ ...p, university_id: e.target.value }))}><option value="">{t("University")}</option>{data?.universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field id="rep-notes" label={t("Internal notes")}><textarea id="rep-notes" rows={3} maxLength={2000} className={inputCls} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setAddOpen(false)}>{p4("Cancel")}</Button><Button type="submit" disabled={busy}>{t("Add to allowlist")}</Button></DialogFooter>
      </form></DialogContent></Dialog>

    <Dialog open={!!confirm} onOpenChange={open => { if (!open && !busy) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>{p4("Confirm change")}</DialogTitle></DialogHeader><p className="break-words">{confirm?.email} · {confirm && t(confirm.action === "suspend" ? "Suspend" : confirm.action === "reinstate" ? "Reinstate" : "Revoke")}</p><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>{p4("Cancel")}</Button><Button disabled={busy} onClick={() => confirm && void doChange(confirm.action, confirm.id)}>{p4("Confirm")}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={!!notes} onOpenChange={open => { if (!open && !busy) setNotes(null); }}><DialogContent><DialogHeader><DialogTitle>{t("Internal notes")}</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={saveNotes}><Field id="rep-notes-edit" label={t("Internal notes")}><textarea id="rep-notes-edit" rows={3} maxLength={2000} className={inputCls} value={notes?.notes ?? ""} onChange={e => setNotes(n => n && { ...n, notes: e.target.value })} /></Field><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setNotes(null)}>Cancel</Button><Button type="submit" disabled={busy}>Save</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={!!publishing} onOpenChange={open => { if (!open && !busy) setPublishing(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{t("Approve and publish")}</DialogTitle></DialogHeader>{publishing && <form className="grid gap-4" onSubmit={doPublish}>
      <Field id="publish-title" label={t("Title")}><input id="publish-title" className={inputCls} maxLength={200} value={publishing.title} onChange={e => setPublishing(p => p && { ...p, title: e.target.value })} /></Field>
      <Field id="publish-message" label={t("Message")}><textarea id="publish-message" rows={6} maxLength={5000} className={inputCls} value={publishing.message} onChange={e => setPublishing(p => p && { ...p, message: e.target.value })} /></Field>
      <Field id="publish-note" label={t("Internal note")}><textarea id="publish-note" rows={2} maxLength={2000} className={inputCls} onChange={e => setPublishing(p => p && { ...p, note: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm"><Switch checked={publishing.national} onCheckedChange={v => setPublishing(p => p && { ...p, national: v })} aria-label={t("Publish as a national announcement")} />{t("Publish as a national announcement")}</label>
      <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setPublishing(null)}>{p4("Cancel")}</Button><Button type="submit" disabled={busy || !publishing.title.trim() || !publishing.message.trim()}>{t("Approve and publish")}</Button></DialogFooter>
    </form>}</DialogContent></Dialog>

    <Dialog open={!!rejecting} onOpenChange={open => { if (!open && !busy) setRejecting(null); }}><DialogContent><DialogHeader><DialogTitle>{t("Reject")}</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={doReject}><Field id="reject-note" label={t("Internal note")}><textarea id="reject-note" rows={3} maxLength={2000} className={inputCls} value={rejecting?.note ?? ""} onChange={e => setRejecting(r => r && { ...r, note: e.target.value })} /></Field><DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setRejecting(null)}>{p4("Cancel")}</Button><Button type="submit" disabled={busy}>{t("Reject")}</Button></DialogFooter></form></DialogContent></Dialog>

    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-4" />{t("Representatives have restricted permissions: they never gain administrator access and only ever see their own university's limited information.")}</p>
  </div>;
}
