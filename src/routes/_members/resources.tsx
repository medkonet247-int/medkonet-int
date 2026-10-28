import { createFileRoute } from "@tanstack/react-router";
import { ContentLibrary } from "@/components/site/ContentLibrary";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/resources")({
  head: () => seo("Academic Resources", "Academic Resources for approved MedKonet Nigeria members.", { noindex: true }),
  component: () => <ContentLibrary kind="resources" />,
});
