/**
 * Replaceable email-provider module. This is the ONLY place that talks to an
 * email service. To change providers, rewrite `deliver()` and keep the
 * `sendEmail` signature.
 *
 * Current provider: Brevo transactional email (https://api.brevo.com/v3/smtp/email).
 *
 * Secrets (server-side only):
 *   EMAIL_PROVIDER_API_KEY  – Brevo API key (sent as the `api-key` header)
 *   EMAIL_FROM              – verified sender, e.g. "MedKonet Nigeria <noreply@yourdomain>"
 */
export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type EmailResult =
  | { configured: false }
  | { configured: true; sent: true }
  | { configured: true; sent: false; error: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env["EMAIL_PROVIDER_API_KEY"] && process.env["EMAIL_FROM"]);
}

function parseSender(from: string): { email: string; name?: string } {
  const m = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(from);
  if (m) return { email: m[2].trim(), ...(m[1].trim() ? { name: m[1].trim() } : {}) };
  return { email: from.trim() };
}

type DeliverOutcome = { sent: true } | { sent: false; error: string };

async function deliver(msg: EmailMessage, apiKey: string, from: string): Promise<DeliverOutcome> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: parseSender(from),
      to: [{ email: msg.to }],
      subject: msg.subject,
      htmlContent: msg.html,
      textContent: msg.text,
    }),
  });
  if (res.ok) return { sent: true };
  // Brevo error bodies ({"code","message"}) never contain the email content,
  // so it is safe to log and surface them. Never log the message itself: it
  // may contain verification codes.
  const body = await res.text().catch(() => "");
  console.error(`[email] Brevo rejected message [${res.status}]: ${body}`);
  return { sent: false, error: `Brevo ${res.status}: ${body || res.statusText}` };
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env["EMAIL_PROVIDER_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (!apiKey || !from) return { configured: false };
  try {
    const out = await deliver(msg, apiKey, from);
    return out.sent ? { configured: true, sent: true } : { configured: true, sent: false, error: out.error };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "request failed";
    console.error(`[email] Brevo request failed: ${detail}`);
    return { configured: true, sent: false, error: `Brevo request failed: ${detail}` };
  }
}

const shell = (body: string) => `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#0b1b3f">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:18px;font-weight:bold;color:#0b2a6b;margin:0 0 24px">MedKonet Nigeria</p>
${body}
<p style="font-size:12px;color:#5b6b8c;margin-top:32px">Connecting Medical Minds, Building Better Futures.</p>
</div></body></html>`;

export function verificationEmail(code: string, link: string): Omit<EmailMessage, "to"> {
  return {
    subject: "Your MedKonet verification code",
    text: `Your MedKonet Nigeria verification code is ${code}. It expires in 10 minutes.\n\nOr verify with this link: ${link}\n\nIf you did not apply to MedKonet, ignore this email.`,
    html: shell(`<p>Use this code to verify your email address:</p>
<p style="font-size:32px;letter-spacing:10px;font-weight:bold;color:#1d4ed8;margin:16px 0">${code}</p>
<p>The code expires in 10 minutes.</p>
<p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">Verify Email</a></p>
<p style="font-size:13px;color:#5b6b8c">If you did not apply to MedKonet Nigeria, you can ignore this email.</p>`),
  };
}

export function passwordResetEmail(link: string): Omit<EmailMessage, "to"> {
  return {
    subject: "Reset your MedKonet password",
    text: `Reset your MedKonet Nigeria password using this link: ${link}\n\nIf you did not request this, ignore this email.`,
    html: shell(`<p>We received a request to reset your password.</p>
<p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p>
<p style="font-size:13px;color:#5b6b8c">If you did not request this, you can ignore this email.</p>`),
  };
}
