import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Container, PageHeader, Card } from "@/components/site/Page";
import { ContactOptions } from "@/components/site/Shared";
import { loadMemberState, useSession } from "@/lib/session";
import { seo } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Announcements } from "@/components/site/ContentLibrary";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => seo("Student Dashboard", "Your MedKonet Nigeria application status.", { noindex: true }),
  beforeLoad: async () => {
    const s = await loadMemberState();
    if (s.state === "visitor") throw redirect({ to: "/login" });
  },
  component: Dashboard,
});

function Dashboard() {
  const { state, application, user } = useSession();
  const onboarding = useQuery({ queryKey: ["student-onboarding", user?.id], enabled: state === "approved", queryFn: async () => { const { data, error } = await supabase.rpc("member_onboarding_status"); if (error) throw error; return data; } });
  const name = application?.full_name ?? user?.user_metadata?.["full_name"] ?? "there";
  return (
    <>
      <PageHeader eyebrow="Student Dashboard" title={`Hello, ${name}`} />
      <section className="py-12"><Container className="max-w-4xl space-y-6">
        {state === "unverified" && <Card><h2 className="text-xl font-semibold">Verify your email</h2><p className="mt-2 text-muted-foreground">Please verify your email to submit your application.</p><Button asChild className="mt-4"><Link to="/verify-email">Verify email</Link></Button></Card>}
        {state === "pending" && <Card><h2 className="text-xl font-semibold">Application received</h2><p className="mt-2 text-muted-foreground">Thank you for applying. Our team is reviewing your application. Submitting an application does not guarantee acceptance; we will update this page when a decision is made.</p></Card>}
        {state === "rejected" && <><Card><h2 className="text-xl font-semibold">Application update</h2><p className="mt-2 text-muted-foreground">Thank you for your interest in MedKonet. We are unable to approve your application at this time. If you have questions, please reach out to us.</p></Card><ContactOptions /></>}
        {(state === "approved" || state === "admin") && <Card><h2 className="text-xl font-semibold">Welcome to MedKonet</h2><p className="mt-2 text-muted-foreground">{onboarding.data === true ? "Your application is approved and the MedKonet team has confirmed your onboarding. Welcome to our medical family." : "Your application has been approved. The MedKonet team will send you an invitation to our WhatsApp community using the number you provided. Approval does not mean you have joined WhatsApp yet; please watch for the invitation."}</p>
          <div className="mt-5 flex flex-wrap gap-2">{[["/community","Community"],["/resources","Academic Resources"],["/mentorship","Mentorship"],["/events","Events"],["/representatives","Representatives"]].map(([to,l]) => <Button key={to} variant="outline" asChild><Link to={to as "/community"}>{l}</Link></Button>)}</div></Card>}
        {(state === "approved" || state === "admin") && <Announcements compact />}
      </Container></section>
    </>
  );
}
