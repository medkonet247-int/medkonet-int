import { createFileRoute } from '@tanstack/react-router';
import { Directory } from '@/components/universities/Directory';
import { seo } from '@/lib/seo';
export const Route = createFileRoute('/_members/universities')({ head: () => seo('University Directory','Verified active universities and real onboarded membership counts for MedKonet members.',{noindex:true}), component: () => <Directory/> });
