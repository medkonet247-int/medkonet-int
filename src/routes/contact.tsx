import { createFileRoute } from "@tanstack/react-router";
import { Container, PageHeader } from "@/components/site/Page";
import { ContactOptions } from "@/components/site/Shared";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact", "Reach MedKonet Nigeria on WhatsApp or by email."),
  component: Contact,
});

function Contact() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="We'd love to hear from you" intro="Questions about MedKonet or your application? Reach us through WhatsApp or email." />
      <section className="py-16"><Container className="max-w-4xl"><ContactOptions /></Container></section>
    </>
  );
}
