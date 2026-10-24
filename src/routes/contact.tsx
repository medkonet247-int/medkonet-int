import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, PageHeader, Card } from "@/components/site/Page";
import { CONTACT } from "@/lib/contact";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => seo("Contact", "Reach MedKonet Nigeria on WhatsApp or by email."),
  component: Contact,
});

export function ContactOptions() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <MessageCircle className="size-6 text-primary" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">WhatsApp</h2>
        <p className="mt-2 text-sm text-muted-foreground">Chat with the MedKonet team on either line.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild><a href={CONTACT.whatsapp[0]} target="_blank" rel="noopener noreferrer">WhatsApp line 1</a></Button>
          <Button asChild variant="outline"><a href={CONTACT.whatsapp[1]} target="_blank" rel="noopener noreferrer">WhatsApp line 2</a></Button>
        </div>
      </Card>
      <Card>
        <Mail className="size-6 text-primary" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">Email</h2>
        <p className="mt-2 break-all text-sm text-muted-foreground">{CONTACT.email}</p>
        <Button asChild className="mt-5"><a href={`mailto:${CONTACT.email}`}>Send an email</a></Button>
      </Card>
    </div>
  );
}

function Contact() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="We'd love to hear from you" intro="Questions about MedKonet or your application? Reach us through WhatsApp or email." />
      <section className="py-16"><Container className="max-w-4xl"><ContactOptions /></Container></section>
    </>
  );
}
