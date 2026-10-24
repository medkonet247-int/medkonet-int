import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/site/Page";
import { CONTACT } from "@/lib/contact";

export function PrivacySummary() {
  return (
    <ul className="list-disc space-y-1 pl-5">
      <li><strong>Why we collect it:</strong> to review your membership application and, if approved, invite you to the MedKonet WhatsApp community.</li>
      <li><strong>Who can see it:</strong> only you and MedKonet administrators.</li>
      <li><strong>Never published:</strong> your WhatsApp number and email address are never shown publicly or shared with other members.</li>
    </ul>
  );
}

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

