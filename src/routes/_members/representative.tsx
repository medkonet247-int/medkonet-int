import { createFileRoute } from "@tanstack/react-router";
import { RepresentativeDashboard } from "@/components/representative/RepresentativeDashboard";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/representative")({
  head: () => seo("Representative Dashboard", "Restricted dashboard for active MedKonet Nigeria university representatives.", { noindex: true }),
  component: RepresentativeDashboard,
});
