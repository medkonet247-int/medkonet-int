import { useSiteText } from "@/lib/site-text-context";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Container, Card } from "@/components/site/Page";
import { CodeInput } from "@/components/site/CodeInput";
import { Field, inputCls } from "@/components/site/Field";
import { getPublicConfig, resendCode, verifyEmailCode, verifyEmailLink, type VerifyResult } from "@/lib/auth.functions";
import { clearVerify, readVerify, saveVerify, type VerifyHandoff } from "@/lib/verify-state";
import { emailSchema, maskEmail } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({ t: z.string().max(128).optional() }),
  head: () => seo("Verify Email", "Verify your email address to complete your MedKonet Nigeria application.", { noindex: true }),
  ssr: false,
  component: VerifyEmail,
});

function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

function messageFor(r: Exclude<VerifyResult, { ok: true }>): { text: string; expired?: boolean } {
  switch (r.reason) {
    case "wrong":
      return { text: `That code is incorrect. ${r.attemptsRemaining} attempt${r.attemptsRemaining === 1 ? "" : "s"} remaining.` };
    case "locked":
      return { text: "Too many incorrect attempts. This code is no longer valid. Please request a new code.", expired: true };
    case "expired":
      return { text: "This code has expired. Please request a new code.", expired: true };
    case "rate_limited":
      return { text: "Too many attempts from this device. Please try again later." };
    default:
      return { text: "This code or link is no longer valid. Please request a new code.", expired: true };
  }
}

function VerifyEmail() {
  const text = useSiteText("verify-email");
  const { t } = Route.useSearch();
  const navigate = useNavigate();
  const verifyCode = useServerFn(verifyEmailCode);
  const verifyLink = useServerFn(verifyEmailLink);
  const resend = useServerFn(resendCode);
  const config = useServerFn(getPublicConfig);

  const [handoff, setHandoff] = useState<VerifyHandoff | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailErr, setEmailErr] = useState<string>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; expired?: boolean } | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [left, setLeft] = useCountdown(0);
  const [linkState, setLinkState] = useState<"idle" | "working" | "failed">(t ? "working" : "idle");
  const busyRef = useRef(false);

  useEffect(() => {
    const h = readVerify();
    if (h) {
      setHandoff(h);
      setLeft(h.cooldownSeconds && h.status !== "rate_limited" ? h.cooldownSeconds : h.cooldownSeconds ?? 0);
      if (h.message) setInfo(h.message);
    }
    config().then((c) => setEmailConfigured(c.emailConfigured)).catch(() => setEmailConfigured(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(r: Extract<VerifyResult, { ok: true }>) {
    const { error: e } = await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
    clearVerify();
    if (e) {
      setInfo("Your email is verified. Please log in to continue.");
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: r.role === "admin" ? "/admin" : "/dashboard", replace: true });
  }

  // Link verification (works on any device/browser)
  useEffect(() => {
    if (!t) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await verifyLink({ data: { token: t } });
        if (cancelled) return;
        if (r.ok) await finish(r);
        else { setLinkState("failed"); setError(messageFor(r)); }
      } catch {
        if (!cancelled) { setLinkState("failed"); setError({ text: "Something went wrong. Please try again." }); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const email = handoff?.email;

  async function submit(value = code) {
    if (!email || busyRef.current || value.length !== 4) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await verifyCode({ data: { email, code: value } });
      if (r.ok) await finish(r);
      else { setError(messageFor(r)); setCode(""); }
    } catch {
      setError({ text: "Something went wrong. Please try again." });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function doResend() {
    if (!email || left > 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await resend({ data: { email } });
      const next = { ...handoff!, status: r.status, devCode: r.devCode, cooldownSeconds: r.cooldownSeconds, message: r.message };
      setHandoff(next);
      saveVerify(next);
      setLeft(r.cooldownSeconds);
      setCode("");
      if (r.status === "rate_limited") setInfo(r.message ?? "Please wait before requesting another code.");
      else if (r.status === "sent") setInfo("A new code has been sent. Earlier codes no longer work.");
      else if (r.status === "send_failed") setInfo(`We couldn't send the email. ${r.message ?? "Please try again shortly."}`);
    } catch {
      setError({ text: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  function useEmail() {
    const p = emailSchema.safeParse(emailInput);
    if (!p.success) { setEmailErr(p.error.issues[0]?.message ?? "Invalid value"); return; }
    const h = { email: p.data };
    setHandoff(h);
    saveVerify(h);
  }

  const notConfigured = handoff?.status === "not_configured" || emailConfigured === false;

  if (t && linkState === "working") {
    return (
      <Shell>
        <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-center" role="status">Verifying your email…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
      <h1 className="mt-4 text-center text-2xl font-bold">{text("Verify your email")}</h1>

      {!email ? (
        <div className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error.text}</p>}
          <p className="text-center text-sm text-muted-foreground">{text("Enter the email address you applied with.")}</p>
          <Field id="verify-email" label={text("Email address")} error={emailErr}>
            <input id="verify-email" type="email" inputMode="email" autoComplete="email" value={emailInput} onChange={(e) => { setEmailInput(e.target.value); setEmailErr(undefined); }} className={inputCls} />
          </Field>
          <Button className="w-full" onClick={useEmail}>{text("Continue")}</Button>
        </div>
      ) : (
        <>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            We sent a 4-digit code to <strong className="text-foreground">{maskEmail(email)}</strong>. You can also tap the Verify Email link in that email, on any device.
          </p>

          {notConfigured && (
            <div role="status" className="mt-5 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>Email delivery is not configured yet.</span>
            </div>
          )}
          {handoff?.devCode && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-warning bg-warning/10 px-4 py-3 text-center text-sm">
              <p className="font-semibold">Development mode is ON</p>
              <p>Test code: <span className="font-mono text-lg font-bold tracking-[0.3em]">{handoff.devCode}</span></p>
              <p className="text-xs text-muted-foreground">Administrator privileges are blocked while development mode is on.</p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <CodeInput value={code} onChange={(v) => { setCode(v); setError(null); }} onComplete={(v) => void submit(v)} disabled={busy} invalid={!!error && !error.expired} />
            <div aria-live="polite" className="min-h-5 text-center text-sm">
              {error && <p className="text-destructive">{error.text}</p>}
              {!error && info && <p className="text-muted-foreground">{info}</p>}
            </div>
            <Button type="submit" className="h-12 w-full" disabled={busy || code.length !== 4}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : text("Verify Email")}
            </Button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            <Button variant="ghost" onClick={doResend} disabled={busy || left > 0}>
              {left > 0 ? `Resend code in ${left >= 60 ? `${Math.ceil(left / 60)} min` : `${left}s`}` : text("Resend code")}
            </Button>
            <Link to="/join" onClick={() => clearVerify()} className="text-primary underline">{text("Wrong email? Register again")}</Link>
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const text = useSiteText("verify-email");
  return (
    <section className="py-12 sm:py-20">
      <Container className="max-w-md">
        <Card className="p-6 sm:p-8">{children}</Card>
      </Container>
    </section>
  );
}
