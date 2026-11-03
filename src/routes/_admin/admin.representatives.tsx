import { createFileRoute } from '@tanstack/react-router';
import { AdminShell } from '@/components/admin/AdminShell';
import { RepresentativeManager } from '@/components/admin/RepresentativeManager';
import { useSiteText } from '@/lib/site-text-context';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/_admin/admin/representatives')({ head: () => seo('Representative Management','Private allowlist, proposal and report review for university representatives.',{noindex:true}), component: RepresentativePage });
function RepresentativePage(){const t=useSiteText('representative');return <AdminShell title={t('Representative allowlist')}><RepresentativeManager/></AdminShell>;}
