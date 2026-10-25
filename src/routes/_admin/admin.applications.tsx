import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Applications } from "@/components/admin/Applications";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/_admin/admin/applications")({ head: () => seo("Application Management", "Private MedKonet application search, review and invitations.", { noindex: true }), component: () => <AdminShell title="Applications"><Applications /></AdminShell> });