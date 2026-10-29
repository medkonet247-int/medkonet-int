import { useSiteText } from "@/lib/site-text-context";
import { MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/site/Page";
import { CONTACT } from "@/lib/contact";

export function PrivacySummary() {
  const t = useSiteText("shared");
  return (
    <ul className="list-disc space-y-1 pl-5">
      <li><strong>{t("Why we collect it:")}</strong>{t(" to review your membership application and, if approved, invite you to the MedKonet WhatsApp community.")}</li>
      <li><strong>{t("Who can see it:")}</strong>{t(" only you and MedKonet administrators.")}</li>
      <li><strong>{t("Never published:")}</strong>{t(" your WhatsApp number and email address are never shown publicly or shared with other members.")}</li>
    </ul>
  );
}

export function ContactOptions() {
  const t = useSiteText("shared");
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card>
        <MessageCircle className="size-6 text-primary" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">{t("WhatsApp")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("Chat with the MedKonet team on either line.")}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild><a href={CONTACT.whatsapp[0]} target="_blank" rel="noopener noreferrer">{t("WhatsApp line 1")}</a></Button>
          <Button asChild variant="outline"><a href={CONTACT.whatsapp[1]} target="_blank" rel="noopener noreferrer">{t("WhatsApp line 2")}</a></Button>
        </div>
      </Card>
      <Card>
        <Mail className="size-6 text-primary" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">{t("Email")}</h2>
        <p className="mt-2 break-all text-sm text-muted-foreground">{CONTACT.email}</p>
        <Button asChild className="mt-5"><a href={`mailto:${CONTACT.email}`}>{t("Send an email")}</a></Button>
      </Card>
    </div>
  );
}

