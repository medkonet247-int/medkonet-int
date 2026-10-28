import { createFileRoute } from "@tanstack/react-router";
import { ContentManager } from "@/components/admin/ContentManager";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/_admin/admin/content")({ head: () => seo("Content Management", "Private MedKonet resources, events, mentorship and announcements management.", { noindex: true }), component: ContentManager });