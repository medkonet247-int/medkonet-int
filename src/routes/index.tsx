import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, BookOpen, GraduationCap, Compass, HeartHandshake, CalendarDays, Check, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, SectionHeading, Card } from "@/components/site/Page";
import { LOGO_URL } from "@/components/site/Logo";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "Your Medical Journey, Stronger Together",
      "MedKonet Nigeria connects Medicine and Surgery students across Nigerian universities for peer learning, resource sharing and mentorship.",
    ),
  component: Home,
});

const OFFERS = [
  { icon: Users, title: "Student Networking", body: "Meet medical students from federal, state and private universities across Nigeria." },
  { icon: BookOpen, title: "Academic Resource Sharing", body: "Exchange notes, references and study materials with peers who understand your curriculum." },
  { icon: GraduationCap, title: "Peer Learning", body: "Talk through difficult concepts together and learn from how others approach them." },
  { icon: Compass, title: "Mentorship and Guidance", body: "Learn from students further along the journey as our mentorship vision grows." },
  { icon: HeartHandshake, title: "Study Partnerships", body: "Find supportive study partners who keep you accountable and encouraged." },
  { icon: CalendarDays, title: "Events and Academic Collaboration", body: "Collaborate on academic initiatives with members from other schools." },
];

const BENEFITS = [
  "Build connections across universities",
  "Access shared academic resources",
  "Learn from fellow medical students",
  "Find supportive study partners",
  "Discover mentorship opportunities",
  "Stay encouraged throughout medical school",
  "Develop professional relationships",
];

const VISION = [
  { title: "University chapters", body: "Local chapters in medical schools across the country." },
  { title: "Mentorship initiatives", body: "Structured guidance from senior students and professionals." },
  { title: "Academic resources", body: "A growing, member-contributed library of study materials." },
  { title: "Events and collaborations", body: "Academic sessions and partnerships that bring members together." },
];

function Home() {
  return (
    <>
      <section className="bg-hero text-navy-foreground">
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr]">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan">Connecting Medical Minds, Building Better Futures.</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] sm:text-6xl">Your Medical Journey, Stronger Together.</h1>
            <p className="mt-6 max-w-xl text-base text-navy-foreground/80 sm:text-lg">
              Connect with Medicine and Surgery students across Nigerian universities, exchange knowledge, discover opportunities, and grow alongside people who understand your journey.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 px-6">
                <Link to="/join">Become a Member <ArrowRight className="size-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 border-navy-foreground/30 bg-transparent px-6 text-navy-foreground hover:bg-navy-foreground/10 hover:text-navy-foreground">
                <Link to="/community">Explore Our Community</Link>
              </Button>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <img src={LOGO_URL} alt="MedKonet Nigeria logo: caduceus over an open book" width={1024} height={1024} className="w-full rounded-full shadow-2xl" />
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeading eyebrow="Our mission" title="Different Universities. One Medical Family." />
          <div className="space-y-4 text-muted-foreground sm:text-lg">
            <p>
              Medical school can feel isolating, but students across Nigeria are facing the same questions, the same exams and the same doubts. MedKonet brings them together.
            </p>
            <p>
              We connect students so they can share resources, discuss difficult concepts, find study partners, support one another and build meaningful academic relationships that last beyond graduation.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-secondary/60 py-16 sm:py-24">
        <Container>
          <SectionHeading eyebrow="What we offer" title="Built around collaboration" center />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="transition-transform duration-200 hover:-translate-y-0.5">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2">
          <SectionHeading eyebrow="Community benefits" title="What members gain" intro="MedKonet is a place to grow, not to compete." />
          <ul className="grid gap-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
                <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="bg-navy py-16 text-navy-foreground sm:py-24">
        <Container className="max-w-4xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">You Don't Have to Figure It All Out Alone.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-navy-foreground/80 sm:text-lg">
            Whether you feel uncertain, overwhelmed or unsure how to reach your medical dreams, you belong here. Find encouragement, ask questions, share your challenges and learn alongside peers without fear of unhealthy competition.
          </p>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Where we're heading"
            title="Our growth vision"
            intro="These are ambitions we are working towards as the community grows. They are not yet in place."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VISION.map((v) => (
              <div key={v.title} className="rounded-2xl border border-dashed p-6">
                <span className="block h-1 w-10 rounded-full bg-accent-line" />
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="rounded-3xl bg-hero px-6 py-14 text-center text-navy-foreground sm:px-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Your Journey Matters. Let's Grow Together.</h2>
            <Button size="lg" asChild className="mt-8 h-12 px-6">
              <Link to="/join">Apply to Join MedKonet</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
