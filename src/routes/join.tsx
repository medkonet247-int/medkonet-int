import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, PageHeader, Card } from "@/components/site/Page";
import { Field, inputCls, describedBy } from "@/components/site/Field";
import { PrivacySummary, ContactOptions } from "@/components/site/Shared";
import {
  ACADEMIC_LEVELS, NIGERIAN_STATES, REASON_MAX, REASON_MIN, UNIVERSITY_TYPES, passwordStrength, registrationSchema,
} from "@/lib/validation";
import { registerApplicant, getRegistrationStatus } from "@/lib/auth.functions";
import { saveVerify } from "@/lib/verify-state";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

const registrationOptions = queryOptions({ queryKey: ["registration-status"], queryFn: () => getRegistrationStatus(), staleTime: 0 });
export const Route = createFileRoute("/join")({
  loader: ({ context }) => context.queryClient.ensureQueryData(registrationOptions),
  head: () => seo("Join MedKonet", "Apply to join MedKonet Nigeria, the community for Medicine and Surgery students across Nigerian universities."),
  component: Join,
});

type Form = {
  full_name: string; email: string; password: string; confirm_password: string; whatsapp_number: string;
  university: string; university_type: string; state: string; course: string; current_level: string;
  reason_for_joining: string; agree: boolean;
};
const EMPTY: Form = {
  full_name: "", email: "", password: "", confirm_password: "", whatsapp_number: "", university: "",
  university_type: "", state: "", course: "Medicine and Surgery", current_level: "", reason_for_joining: "", agree: false,
};

function Join() {
  const { data: registration } = useSuspenseQuery(registrationOptions);
  const navigate = useNavigate();
  const register = useServerFn(registerApplicant);
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const inFlight = useRef(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // guard against double taps
    setFormError(null);
    setAlreadyVerified(false);
    const parsed = registrationSchema.safeParse(f);
    if (!parsed.success) {
      const errs: Partial<Record<keyof Form, string>> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Form] ??= i.message;
      setErrors(errs);
      const first = Object.keys(errs)[0];
      if (first) document.getElementById(first)?.focus();
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    try {
      const res = await register({ data: f });
      if (res.result === "already_verified") {
        setAlreadyVerified(true);
      } else if (res.result === "verify") {
        saveVerify({ email: res.email, status: res.status, cooldownSeconds: res.cooldownSeconds, devCode: res.devCode, message: res.message });
        navigate({ to: "/verify-email" });
        return;
      } else {
        setFormError(res.message);
        if (res.fieldErrors) setErrors(res.fieldErrors as never);
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const strength = passwordStrength(f.password);
  const reasonLen = f.reason_for_joining.trim().length;

  const input = (id: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={id}
      name={id}
      value={f[id] as string}
      onChange={(e) => set(id, e.target.value as never)}
      aria-invalid={!!errors[id]}
      aria-describedby={describedBy(id, errors[id], !!props["aria-describedby"])}
      disabled={submitting}
      className={inputCls}
      {...props}
    />
  );
  const select = (id: keyof Form, options: readonly string[], placeholder: string, autoComplete?: string) => (
    <select
      id={id}
      name={id}
      value={f[id] as string}
      onChange={(e) => set(id, e.target.value as never)}
      aria-invalid={!!errors[id]}
      aria-describedby={describedBy(id, errors[id])}
      disabled={submitting}
      autoComplete={autoComplete}
      className={cn(inputCls, "appearance-auto")}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  if (!registration.open) return <><PageHeader eyebrow="Membership" title="Join MedKonet" /><Container className="max-w-4xl space-y-6 py-12"><h2 className="text-xl font-semibold">Registration is currently closed</h2><p className="text-muted-foreground">Thank you for your interest. Please contact the MedKonet team for updates. Existing members can still log in.</p><ContactOptions /><Button asChild variant="outline"><Link to="/login">Login</Link></Button></Container></>;

  return (
    <>
      <PageHeader eyebrow="Membership application" title="Join MedKonet" intro="Tell us a little about yourself. Applications are reviewed by the MedKonet team." />
      <section className="py-12 sm:py-16">
        <Container className="grid max-w-6xl gap-8 lg:grid-cols-[1fr_340px]">
          <Card className="p-5 sm:p-8">
            <form noValidate onSubmit={onSubmit} className="space-y-8">
              <fieldset className="space-y-5">
                <legend className="text-lg font-semibold">Your account</legend>
                <Field id="full_name" label="Full name" error={errors.full_name}>
                  {input("full_name", { autoComplete: "name", maxLength: 120 })}
                </Field>
                <Field id="email" label="Email address" error={errors.email}>
                  {input("email", { type: "email", autoComplete: "email", inputMode: "email", autoCapitalize: "none", spellCheck: false, maxLength: 255 })}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="password" label="Password" error={errors.password} hint={f.password ? `Strength: ${strength.label}. Use 8+ characters with a mix of letters, numbers and symbols.` : "At least 8 characters."}>
                    <div className="relative">
                      {input("password", { type: showPw ? "text" : "password", autoComplete: "new-password", maxLength: 72, className: cn(inputCls, "pr-11"), "aria-describedby": "password-hint" })}
                      <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground" aria-label={showPw ? "Hide password" : "Show password"}>
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {f.password && (
                      <div className="mt-2 flex gap-1" aria-hidden>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= strength.score ? (strength.score <= 1 ? "bg-destructive" : strength.score <= 3 ? "bg-warning" : "bg-success") : "bg-muted")} />
                        ))}
                      </div>
                    )}
                  </Field>
                  <Field id="confirm_password" label="Confirm password" error={errors.confirm_password}>
                    {input("confirm_password", { type: showPw ? "text" : "password", autoComplete: "new-password", maxLength: 72 })}
                  </Field>
                </div>
                <Field id="whatsapp_number" label="WhatsApp number (required)" error={errors.whatsapp_number} hint="e.g. 0803 123 4567 or +234 803 123 4567. International numbers: include the country code.">
                  {input("whatsapp_number", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 20, "aria-describedby": "whatsapp_number-hint" })}
                </Field>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="text-lg font-semibold">Your studies</legend>
                <Field id="university" label="University" error={errors.university}>
                  {input("university", { autoComplete: "organization", maxLength: 160 })}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="university_type" label="University type" error={errors.university_type}>
                    {select("university_type", UNIVERSITY_TYPES, "Select type")}
                  </Field>
                  <Field id="state" label="State" error={errors.state}>
                    {select("state", NIGERIAN_STATES, "Select state", "address-level1")}
                  </Field>
                  <Field id="course" label="Course" error={errors.course}>
                    {input("course", { maxLength: 120 })}
                  </Field>
                  <Field id="current_level" label="Current academic level" error={errors.current_level}>
                    {select("current_level", ACADEMIC_LEVELS, "Select level")}
                  </Field>
                </div>
                <Field id="reason_for_joining" label="Why do you want to join MedKonet?" error={errors.reason_for_joining}>
                  <textarea
                    id="reason_for_joining"
                    name="reason_for_joining"
                    rows={5}
                    maxLength={REASON_MAX}
                    value={f.reason_for_joining}
                    onChange={(e) => set("reason_for_joining", e.target.value)}
                    aria-invalid={!!errors.reason_for_joining}
                    aria-describedby="reason-counter"
                    disabled={submitting}
                    className={inputCls}
                  />
                  <p id="reason-counter" className={cn("text-right text-xs", reasonLen < REASON_MIN ? "text-muted-foreground" : "text-success")} aria-live="polite">
                    {reasonLen} / {REASON_MAX} {reasonLen < REASON_MIN && `(at least ${REASON_MIN})`}
                  </p>
                </Field>
              </fieldset>

              <div className="space-y-2">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    id="agree"
                    type="checkbox"
                    checked={f.agree}
                    onChange={(e) => set("agree", e.target.checked)}
                    aria-invalid={!!errors.agree}
                    aria-describedby={describedBy("agree", errors.agree)}
                    disabled={submitting}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/community-rules" target="_blank" className="font-semibold text-primary underline">community rules</Link> and{" "}
                    <Link to="/privacy" target="_blank" className="font-semibold text-primary underline">privacy notice</Link>.
                  </span>
                </label>
                {errors.agree && <p id="agree-error" role="alert" className="text-sm text-destructive">{errors.agree}</p>}
              </div>

              <p className="flex gap-2 rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Submitting this application does not guarantee acceptance. You will first verify your email, then our team will review your application.
              </p>

              {alreadyVerified && (
                <div role="alert" className="rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm">
                  This email is already registered and verified. Please <Link to="/login" className="font-semibold text-primary underline">log in</Link> instead.
                </div>
              )}
              {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</p>}

              <Button type="submit" size="lg" className="h-12 w-full sm:w-auto" disabled={submitting}>
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "Submit application"}
              </Button>
              <p className="text-sm text-muted-foreground">Already a member? <Link to="/login" className="font-semibold text-primary underline">Log in</Link></p>
            </form>
          </Card>
          <aside className="space-y-4">
            <Card className="text-sm">
              <ShieldCheck className="size-6 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold">Privacy notice</h2>
              <div className="mt-3 text-muted-foreground"><PrivacySummary /></div>
              <Link to="/privacy" className="mt-3 inline-block font-semibold text-primary underline">Read the full notice</Link>
            </Card>
          </aside>
        </Container>
      </section>
    </>
  );
}
