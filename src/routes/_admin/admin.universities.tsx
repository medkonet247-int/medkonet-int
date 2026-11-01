import { createFileRoute } from '@tanstack/react-router';
import { AdminShell } from '@/components/admin/AdminShell';
import { Directory, MatchingQueue } from '@/components/universities/Directory';
import { useSiteText } from '@/lib/site-text-context';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/_admin/admin/universities')({ head: () => seo('University Management','Private university verification and administrator-confirmed application matching.',{noindex:true}), component: Universities });
function Universities(){const t=useSiteText('phase4');return <AdminShell title={t('Universities')}><Directory admin/><MatchingQueue/></AdminShell>;}
