import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Container, PageHeader, Card } from "@/components/site/Page";
import { getAdminData, reviewApplication } from "@/lib/admin.functions";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_admin/admin")({
  head: () => seo("Administrator Dashboard", "MedKonet administrator dashboard.", { noindex: true }),
  component: Admin,
});

function Admin() {
  const fetchData = useServerFn(getAdminData);
  const review = useServerFn(reviewApplication);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin"], queryFn: () => fetchData() });
  const [pending, setPending] = useState<{ id: string; name: string; status: "Approved" | "Rejected" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try { await review({ data: { id: pending.id, status: pending.status } }); toast.success(`Application ${pending.status.toLowerCase()}`); await qc.invalidateQueries({ queryKey: ["admin"] }); }
    catch { toast.error("Could not update the application."); }
    finally { setBusy(false); setPending(null); }
  }

  return (
    <>
      <PageHeader eyebrow="Administrator" title="Administrator Dashboard" />
      <section className="py-10"><Container className="space-y-8">
        {isLoading && <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />}
        {error && <p role="alert" className="text-destructive">{(error as Error).message}</p>}
        {data && <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(["total","pending","approved","rejected"] as const).map((k) => <Card key={k}><p className="text-sm capitalize text-muted-foreground">{k}</p><p className="mt-1 font-display text-3xl font-bold">{data.counts[k]}</p></Card>)}
          </div>
          {data.applications.length === 0 ? <Card><p className="text-muted-foreground">No applications yet.</p></Card> : (
            <div className="grid gap-4">{data.applications.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="font-semibold">{a.full_name}</h2><p className="break-all text-sm text-muted-foreground">{a.email} · WhatsApp {a.whatsapp_number}</p></div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold">{a.application_status}</span>
                </div>
                <p className="mt-3 text-sm">{a.university} ({a.university_type}), {a.state} · {a.course} · {a.current_level}</p>
                <p className="mt-2 text-sm text-muted-foreground">{a.reason_for_joining}</p>
                <p className="mt-2 text-xs text-muted-foreground">Submitted {new Date(a.submitted_at).toLocaleString()}{a.reviewed_at && ` · Reviewed ${new Date(a.reviewed_at).toLocaleString()}`}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" disabled={a.application_status === "Approved"} onClick={() => setPending({ id: a.id, name: a.full_name, status: "Approved" })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={a.application_status === "Rejected"} onClick={() => setPending({ id: a.id, name: a.full_name, status: "Rejected" })}>Reject</Button>
                </div>
              </Card>))}</div>)}
        </>}
      </Container></section>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{pending?.status === "Approved" ? "Approve" : "Reject"} application?</AlertDialogTitle>
            <AlertDialogDescription>{pending?.name}'s application will be marked {pending?.status}. Your name and the time will be recorded.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); void confirm(); }} disabled={busy}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
