import { createFileRoute } from "@tanstack/react-router";
import { MemberPage } from "@/components/site/MemberPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/representatives")({
  head: () => seo("University Representatives", "University Representatives for approved MedKonet Nigeria members.", { noindex: true }),
  component: () => <MemberPage slug="representatives" />,
});
