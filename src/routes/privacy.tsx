import { createFileRoute } from "@tanstack/react-router";
import { Container, PageHeader } from "@/components/site/Page";
import { CONTACT } from "@/lib/contact";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => seo("Privacy Notice", "How MedKonet Nigeria collects, uses and protects applicant information."),
  component: Privacy,
});

export function PrivacySummary() {
  return (
    <ul className="list-disc space-y-1 pl-5">
      <li><strong>Why we collect it:</strong> to review your membership application and, if approved, invite you to the MedKonet WhatsApp community.</li>
      <li><strong>Who can see it:</strong> only you and MedKonet administrators.</li>
      <li><strong>Never published:</strong> your WhatsApp number and email address are never shown publicly or shared with other members.</li>
    </ul>
  );
}

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
