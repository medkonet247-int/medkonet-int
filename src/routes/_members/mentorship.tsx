import { createFileRoute } from "@tanstack/react-router";
import { MemberPage } from "@/components/site/MemberPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/mentorship")({
  head: () => seo("Mentorship", "Mentorship for approved MedKonet Nigeria members.", { noindex: true }),
  component: () => <MemberPage slug="mentorship" />,
});
