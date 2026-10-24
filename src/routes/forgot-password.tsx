import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Card } from "@/components/site/Page";
import { Field, inputCls } from "@/components/site/Field";
import { requestPasswordReset } from "@/lib/auth.functions";
import { emailSchema } from "@/lib/validation";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => seo("Forgot Password", "Reset your MedKonet Nigeria password."),
  component: Forgot,
});

function Forgot() {
  const reset = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ configured: boolean; limited: boolean } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const p = emailSchema.safeParse(email);
    if (!p.success) { setErr(p.error.issues[0].message); return; }
    setBusy(true);
    try {
      setDone(await reset({ data: { email: p.data } }));
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="py-12 sm:py-20">
      <Container className="max-w-md">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          {done ? (
            <div role="status" className="mt-4 space-y-3 text-sm">
              {!done.configured ? (
                <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">Email delivery is not configured yet, so reset emails cannot be sent right now.</p>
              ) : done.limited ? (
                <p>Too many reset requests. Please try again later.</p>
              ) : (
                <p>If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.</p>
              )}
              <Link to="/login" className="text-primary underline">Back to login</Link>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
              <Field id="email" label="Email address" error={err}>
                <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(undefined); }} className={inputCls} disabled={busy} />
              </Field>
              <Button type="submit" className="h-12 w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </Button>
              <Link to="/login" className="block text-sm text-primary underline">Back to login</Link>
            </form>
          )}
        </Card>
      </Container>
    </section>
  );
}
