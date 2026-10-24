import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/Page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/access-denied")({
  head: () => seo("Access Denied", "You do not have permission to view this page.", { noindex: true }),
  component: () => (
    <Container className="max-w-lg py-24 text-center">
      <h1 className="text-3xl font-bold">Access denied</h1>
      <p className="mt-3 text-muted-foreground">This area is for MedKonet administrators only.</p>
      <Button asChild className="mt-6"><Link to="/dashboard">Go to your dashboard</Link></Button>
    </Container>
  ),
});
