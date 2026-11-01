import { createFileRoute } from "@tanstack/react-router";
import { Representatives } from "@/components/universities/Representatives";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/representatives")({
  head: () => seo("University Representatives", "University Representatives for approved MedKonet Nigeria members.", { noindex: true }),
  component: () => <Representatives />,
});
