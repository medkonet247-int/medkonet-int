import { useEffect, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Search, Save, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell, QueryState, dateTime } from "./AdminShell";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/site/Field";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { getAdminSiteText, editSiteText } from "@/lib/site-text.functions";
import { siteTextDefaults } from "@/lib/site-text";
import type { Tables } from "@/integrations/supabase/types";

export function SiteTextEditor() {
  const read = useServerFn(getAdminSiteText), edit = useServerFn(editSiteText), qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "site-text"], queryFn: () => read() });
  const [search, setSearch] = useState(""), [page, setPage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<{ row: Tables<"site_text">; value: string; action: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = (query.data ?? []).some(row => drafts[row.key] !== undefined && drafts[row.key] !== row.current_value);
  useBlocker({ shouldBlockFn: () => dirty && !window.confirm("Discard unsaved site text changes?"), enableBeforeUnload: dirty });
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (!confirmation) return;
    setSaving(true);
    try {
      await edit({ data: { key: confirmation.row.key, value: confirmation.value, expected: confirmation.row.current_value } });
      setDrafts(previous => { const next = { ...previous }; delete next[confirmation.row.key]; return next; });
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: ["site-text"] })]);
      setConfirmation(null); toast.success("Site text saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save site text."); }
    finally { setSaving(false); }
  }
  const rows = (query.data ?? []).filter(row => (!page || row.page === page) && `${row.label} ${row.key} ${row.current_value}`.toLowerCase().includes(search.toLowerCase()));
  const groups = [...new Set(rows.map(row => row.page))];
  return <AdminShell title="Site Text">
    <div className="mb-6 grid gap-3 sm:grid-cols-2"><label className="relative"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><input aria-label="Search site text" className={`${inputCls} pl-10`} placeholder="Search text or label…" value={search} onChange={e => setSearch(e.target.value)} /></label><select className={inputCls} aria-label="Page group" value={page} onChange={e => setPage(e.target.value)}><option value="">All pages</option>{[...new Set((query.data ?? []).map(row => row.page))].map(group => <option key={group} value={group}>{group === "members" ? "Member pages" : group.charAt(0).toUpperCase() + group.slice(1)}</option>)}</select></div>
    <QueryState loading={query.isLoading} error={query.error} />{query.error && <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>}
    {query.data && !rows.length && <p className="py-12 text-muted-foreground">No site text matches your search.</p>}
    {groups.map(group => <section key={group} className="mb-10 space-y-4"><h2 className="border-b pb-3 text-xl font-semibold capitalize">{group === "members" ? "Member pages" : group}</h2>{rows.filter(row => row.page === group).map(row => {
      const definition = siteTextDefaults.find(item => item.key === row.key);
      const value = drafts[row.key] ?? row.current_value;
      const changed = value !== row.current_value;
      return <article key={row.key} className="min-w-0 rounded-lg border bg-card p-4 sm:p-5" data-text-key={row.key}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{definition?.label ?? row.label}</h3><p className="mt-1 break-all text-xs text-muted-foreground">{group} · {definition?.section ?? row.section} · {row.key}</p></div><Button asChild variant="ghost" size="sm"><a href={definition?.route ?? row.route} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />View on site</a></Button></div>
        <label className="sr-only" htmlFor={`text-${row.key}`}>Text: {definition?.label ?? row.label}</label><textarea id={`text-${row.key}`} className={`${inputCls} min-h-24 whitespace-pre-wrap`} rows={row.default_value.length > 160 ? 5 : 3} maxLength={row.max_length} value={value} onChange={e => setDrafts(previous => ({ ...previous, [row.key]: e.target.value }))} />
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{value.length} / {row.max_length} characters{changed ? " · Unsaved" : ""}</span><span>{row.last_edited_at ? `Edited ${dateTime(row.last_edited_at)} · ${row.last_editor_name ?? "Administrator"}` : "Original wording"}</span></div>
        {row.previous_value !== null && <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">Previous value</summary><p className="mt-2 whitespace-pre-wrap break-words">{row.previous_value || "(Empty — original wording shown on site)"}</p></details>}
        <div className="mt-4 flex flex-wrap gap-2"><Button disabled={!changed || saving} size="sm" onClick={() => setConfirmation({ row, value, action: "Save changes" })}><Save className="size-4" />Save</Button><Button size="sm" variant="outline" disabled={saving || row.current_value === row.default_value && !changed} onClick={() => setConfirmation({ row, value: row.default_value, action: "Reset to default" })}><RotateCcw className="size-4" />Reset to default</Button>{row.previous_value !== null && <Button size="sm" variant="ghost" disabled={saving} onClick={() => setConfirmation({ row, value: row.previous_value ?? row.default_value, action: "Undo last edit" })}><Undo2 className="size-4" />Undo last edit</Button>}</div>
      </article>;
    })}</section>)}
    <AlertDialog open={!!confirmation} onOpenChange={open => { if (!open && !saving) setConfirmation(null); }}><AlertDialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto"><AlertDialogHeader><AlertDialogTitle>{confirmation?.action}?</AlertDialogTitle><AlertDialogDescription>{confirmation?.row.label}. This change will be recorded in the audit log.</AlertDialogDescription></AlertDialogHeader><p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm">{confirmation?.value || "Empty text will show the original wording on site."}</p><AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={e => { e.preventDefault(); void save(); }}>{saving ? "Saving…" : "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AdminShell>;
}