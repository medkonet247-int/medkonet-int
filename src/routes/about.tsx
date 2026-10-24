import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Container, PageHeader, SectionHeading, Card } from "@/components/site/Page";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => seo("About Us", "Who MedKonet Nigeria is, our mission, vision and the values that guide our community of medical students."),
  component: About,
});

const VALUES = [
  { t: "Collaboration", d: "We learn more together than alone." },
  { t: "Compassion", d: "We treat each other with kindness, as future doctors should." },
  { t: "Academic excellence", d: "We pursue high standards and help each other reach them." },
  { t: "Belonging", d: "Every medical student has a place here, whatever their university." },
  { t: "Integrity", d: "We are honest, credit others and respect privacy." },
  { t: "Growth", d: "We support each other's academic and personal development." },
];

function About() {
  return (
    <>
      <PageHeader eyebrow="About MedKonet" title="Different Universities. One Medical Family." intro="MedKonet Nigeria is a growing community connecting Medicine and Surgery students across federal, state and private universities in Nigeria." />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold">Who we are</h2>
            <p className="mt-3 text-muted-foreground">We are medical students who believe the journey through medical school is better shared. MedKonet brings students together for academic collaboration, peer learning, resource sharing, mentorship and friendship.</p>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Our mission</h2>
            <p className="mt-3 text-muted-foreground">To connect medical students across Nigeria so they can learn together, support one another and grow into compassionate, competent doctors.</p>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Our vision</h2>
            <p className="mt-3 text-muted-foreground">A nationwide medical student network where no student feels alone and every student has access to peers, guidance and opportunities.</p>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Why MedKonet exists</h2>
            <p className="mt-3 text-muted-foreground">Many students feel uncertain, overwhelmed or afraid of how to achieve their medical dreams. Too often, the environment rewards competition over cooperation. We exist to offer a different path: one built on encouragement and shared effort.</p>
          </Card>
        </Container>
      </section>
      <section className="bg-secondary/60 py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="Core values" title="What guides us" />
          <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.t} className="rounded-2xl border bg-card p-6">
                <dt className="font-semibold text-primary">{v.t}</dt>
                <dd className="mt-2 text-sm text-muted-foreground">{v.d}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Our commitment to collaboration and belonging</h2>
          <p className="mt-4 text-muted-foreground">We commit to keeping MedKonet a respectful, welcoming and supportive space where members share generously, ask freely and celebrate each other's progress.</p>
          <Button asChild size="lg" className="mt-8"><Link to="/join">Apply to Join MedKonet</Link></Button>
        </Container>
      </section>
    </>
  );
}
