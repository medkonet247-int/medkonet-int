import { createFileRoute } from '@tanstack/react-router';
import { AdminShell } from '@/components/admin/AdminShell';
import { Representatives } from '@/components/universities/Representatives';
import { useSiteText } from '@/lib/site-text-context';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/_admin/admin/representatives')({ head: () => seo('Representative Preparation','Inactive representative preparation; no appointments or representative permissions.',{noindex:true}), component: RepresentativePage });
function RepresentativePage(){const t=useSiteText('phase4');return <AdminShell title={t('Representatives')}><Representatives admin/></AdminShell>;}
