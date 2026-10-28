import { createFileRoute } from "@tanstack/react-router";
import { CommunityContent } from "@/components/site/ContentLibrary";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_members/community")({
  head: () => seo("Community", "Community for approved MedKonet Nigeria members.", { noindex: true }),
  component: CommunityContent,
});
