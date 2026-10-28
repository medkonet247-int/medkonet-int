import { createFileRoute } from "@tanstack/react-router";
import { ContentLibrary } from "@/components/site/ContentLibrary";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/mentorship")({
  head: () => seo("Mentorship", "Mentorship for approved MedKonet Nigeria members.", { noindex: true }),
  component: () => <ContentLibrary kind="mentorship" />,
});
