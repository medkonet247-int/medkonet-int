import { useSiteText } from "@/lib/site-text-context";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Card } from "@/components/site/Page";
import { Field, inputCls } from "@/components/site/Field";
import { passwordSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => seo("Reset Password", "Choose a new password for your MedKonet Nigeria account.", { noindex: true }),
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const t = useSiteText("reset-password");
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    const hash = window.location.hash;
    supabase.auth.getSession().then(({ data: s }) => {
      setReady((r) => r ?? (!!s.session && (hash.includes("type=recovery") || hash === "") ? !!s.session : false));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const p = passwordSchema.safeParse(pw);
    if (!p.success) { setErr(p.error.issues[0]?.message ?? "Invalid value"); return; }
    if (pw !== pw2) { setErr("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr("Could not update your password. The link may have expired."); return; }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <section className="py-12 sm:py-20">
      <Container className="max-w-md">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold">{t("Set a new password")}</h1>
          {ready === null ? (
            <Loader2 className="mt-6 size-6 animate-spin text-primary" aria-label={t("Loading")} />
          ) : !ready ? (
            <p className="mt-4 text-sm">This reset link is invalid or has expired. <Link to="/forgot-password" className="text-primary underline">{t("Request a new one")}</Link>.</p>
          ) : (
            <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
              <Field id="pw" label={t("New password")} error={err}>
                <input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />
              </Field>
              <Field id="pw2" label={t("Confirm new password")}>
                <input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} />
              </Field>
              <Button type="submit" className="h-12 w-full" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : t("Update password")}</Button>
            </form>
          )}
        </Card>
      </Container>
    </section>
  );
}
