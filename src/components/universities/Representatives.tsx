import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/site/Page";
import { useSiteText } from "@/lib/site-text-context";
import { readDirectoryReps } from "@/lib/representatives.functions";

export function Representatives() {
  const t = useSiteText("representative");
  const p4 = useSiteText("phase4");
  const read = useServerFn(readDirectoryReps);
  const query = useQuery({ queryKey: ["rep", "directory"], queryFn: () => read() });

  const content = <>
    <p className="max-w-3xl whitespace-pre-line text-muted-foreground">{t("A programme where approved members appointed by the MedKonet team support their own university.")}</p>
    <p className="mt-4 max-w-3xl whitespace-pre-line text-muted-foreground">{t("Representatives are approved members who help welcome new members from their university, propose announcements for administrator approval and report community needs. They have restricted access and no administrator permissions.")}</p>
    {query.isLoading && <p className="mt-8 flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="size-5 animate-spin" />Loading…</p>}
    {query.error && <p role="alert" className="mt-8 text-destructive">Could not load representatives. <Button variant="outline" size="sm" className="ml-2" onClick={() => void query.refetch()}>Try again</Button></p>}
    {query.data && !query.data.programme && <p className="mt-8 border-l-4 border-warning bg-muted p-4 font-medium">{t("The representative programme is not active yet.")}</p>}
    {query.data?.programme && !query.data.reps.length && <p className="mt-8 border-y py-10 text-center text-muted-foreground">{t("No representatives have been appointed yet.")}</p>}
    {query.data?.programme && !!query.data.reps.length && <ul className="mt-8 grid gap-3 sm:grid-cols-2">{query.data.reps.map((r, i) => <li key={i} className="rounded-lg border bg-card p-5"><p className="font-semibold">{r.full_name}</p><p className="mt-1 text-sm text-muted-foreground">{r.university}</p></li>)}</ul>}
    <p className="mt-4 text-xs text-muted-foreground">{t("Representatives appear here only with their consent. Contact details are never shown.")}</p>
    <h2 className="mt-8 text-xl font-semibold">{p4("Planned future responsibilities")}</h2>
    <ul className="mt-4 list-disc space-y-3 pl-5">{["View relevant university-specific information", "Help welcome new members", "Share approved announcements", "Report community needs", "Support engagement with the national community"].map(v => <li key={v}>{p4(v)}</li>)}</ul>
  </>;

  return <><PageHeader eyebrow={p4("Members")} title={p4("University Representatives")} intro={t("A programme where approved members appointed by the MedKonet team support their own university.")} /><Container className="py-10">{content}</Container></>;
}
