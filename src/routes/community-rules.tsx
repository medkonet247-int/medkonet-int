import { useSiteText } from "@/lib/site-text-context";
import { createFileRoute } from "@tanstack/react-router";
import { Container, PageHeader } from "@/components/site/Page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/community-rules")({
  head: () => seo("Community Rules", "The rules every MedKonet Nigeria member agrees to follow."),
  component: Rules,
});

const RULES = [
  "Treat every member with respect and kindness, regardless of university, level or background.",
  "Collaborate rather than compete. Share knowledge generously and celebrate others' progress.",
  "Do not share other members' personal details, including phone numbers and emails, outside the community.",
  "Only share academic materials you have the right to share, and credit original authors.",
  "No harassment, discrimination, hate speech, spam or commercial promotion.",
  "Do not give medical advice to the public on behalf of MedKonet.",
  "Be honest. Do not impersonate others or misrepresent your student status.",
  "Administrators may remove members who repeatedly break these rules.",
];

function Rules() {
  const t = useSiteText("community-rules");
  return (
    <>
      <PageHeader eyebrow={t("Community")} title={t("Community Rules")} />
      <section className="py-14">
        <Container className="max-w-3xl">
          <ol className="list-decimal space-y-4 pl-5 marker:font-semibold marker:text-primary">
            {RULES.map((r) => <li key={t(r)} className="pl-2">{t(r)}</li>)}
          </ol>
        </Container>
      </section>
    </>
  );
}
