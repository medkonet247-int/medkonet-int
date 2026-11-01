import { createFileRoute } from '@tanstack/react-router';
import { AdminShell } from '@/components/admin/AdminShell';
import { Reports } from '@/components/universities/Reports';
import { useSiteText } from '@/lib/site-text-context';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/_admin/admin/reports')({ head: () => seo('Membership Reports','Private real-data university membership aggregates and growth reports.',{noindex:true}), component: ReportPage });
function ReportPage(){const t=useSiteText('phase4');return <AdminShell title={t('Reports')}><Reports/></AdminShell>;}
