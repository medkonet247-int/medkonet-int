import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-hero text-navy-foreground">
      <Container className="py-14 sm:py-20">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-3xl font-bold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-base text-navy-foreground/80 sm:text-lg">{intro}</p>}
        {children}
      </Container>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, intro, center }: { eyebrow?: string; title: string; intro?: ReactNode; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p>}
      <h2 className="mt-3 text-2xl font-bold sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-muted-foreground sm:text-lg">{intro}</p>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-6 shadow-card", className)}>{children}</div>;
}
