import { createFileRoute } from "@tanstack/react-router";
import { SiteTextEditor } from "@/components/admin/SiteTextEditor";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/_admin/admin/site-text")({ head: () => seo("Site Text Editor", "Private MedKonet administrator website wording editor.", { noindex: true }), component: SiteTextEditor });