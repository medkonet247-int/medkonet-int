import { useSiteText } from "@/lib/site-text-context";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Card } from "@/components/site/Page";
import { Field, inputCls } from "@/components/site/Field";
import { loginWithPassword } from "@/lib/auth.functions";
import { emailSchema } from "@/lib/validation";
import { saveVerify } from "@/lib/verify-state";
import { supabase } from "@/integrations/supabase/client";
import { loadMemberState, homeFor } from "@/lib/session";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => seo("Login", "Log in to your MedKonet Nigeria account."),
  component: Login,
});

function Login() {
  const t = useSiteText("login");
  const navigate = useNavigate();
  const login = useServerFn(loginWithPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ email?: string | undefined; password?: string | undefined }>({});
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setErr(null);
    const em = emailSchema.safeParse(email);
    const fe = { email: em.success ? undefined : em.error.issues[0]?.message ?? "Invalid value", password: password ? undefined : "Enter your password" };
    setFieldErr(fe);
    if (fe.email || fe.password) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const r = await login({ data: { email: em.data!, password } });
      if (r.result === "unverified") {
        saveVerify({ email: r.email });
        navigate({ to: "/verify-email" });
        return;
      }
      if (r.result === "error") { setErr(r.message); return; }
      await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      const s = await loadMemberState();
      navigate({ to: homeFor(s.state), replace: true });
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="py-12 sm:py-20">
      <Container className="max-w-md">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold">{t("Welcome back")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("Log in to your MedKonet account.")}</p>
          <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
            <Field id="email" label={t("Email address")} error={fieldErr.email}>
              <input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!fieldErr.email} disabled={busy} className={inputCls} />
            </Field>
            <Field id="password" label={t("Password")} error={fieldErr.password}>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!fieldErr.password} disabled={busy} className={cn(inputCls, "pr-11")} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground" aria-label={show ? t("Hide password") : t("Show password")}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {err && <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{err}</p>}
            <Button type="submit" className="h-12 w-full" disabled={busy}>
              {busy ? <><Loader2 className="size-4 animate-spin" />{t(" Logging in…")}</> : t("Log in")}
            </Button>
          </form>
          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link to="/forgot-password" className="text-primary underline">{t("Forgot password?")}</Link>
            <p className="text-muted-foreground">{t("New here? ")}<Link to="/join" className="font-semibold text-primary underline">{t("Join MedKonet")}</Link></p>
          </div>
        </Card>
      </Container>
    </section>
  );
}
