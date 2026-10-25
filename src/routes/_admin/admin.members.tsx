import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { Applications } from "@/components/admin/Applications";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/_admin/admin/members")({ head: () => seo("Member Management", "Private MedKonet applicants, approved applicants and onboarded members.", { noindex: true }), component: () => <AdminShell title="Members"><Applications members /></AdminShell> });