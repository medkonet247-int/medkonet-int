import { createFileRoute } from "@tanstack/react-router";
import { Container, PageHeader } from "@/components/site/Page";
import { CONTACT } from "@/lib/contact";
import { seo } from "@/lib/seo";
import { PrivacySummary } from "@/components/site/Shared";

export const Route = createFileRoute("/privacy")({
  head: () => seo("Privacy Notice", "How MedKonet Nigeria collects, uses and protects applicant information."),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <PageHeader eyebrow="Privacy" title="Privacy Notice" />
      <section className="py-14">
        <Container className="max-w-3xl space-y-6 text-muted-foreground">
          <PrivacySummary />
          <h2 className="text-xl font-semibold text-foreground">What we collect</h2>
          <p>Your name, email, password (stored securely by our authentication service, never visible to anyone), WhatsApp number, university, university type, state, course, academic level and your reason for joining.</p>
          <h2 className="text-xl font-semibold text-foreground">How we protect it</h2>
          <p>Access is restricted at the database level. Applicants can only see their own application. Only administrators can view all applications.</p>
          <h2 className="text-xl font-semibold text-foreground">Your choices</h2>
          <p>To ask about, correct or delete your information, email <a className="text-primary underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.</p>
        </Container>
      </section>
    </>
  );
}
