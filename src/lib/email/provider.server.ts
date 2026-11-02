/**
 * Replaceable email-provider module. This is the ONLY place that talks to an
 * email service. To change providers, rewrite `deliver()` and keep the
 * `sendEmail` signature.
 *
 * Current provider: Brevo transactional email, reachable two ways:
 *   1. Connector gateway (used when the Brevo connector is linked):
 *      POST https://connector-gateway.lovable.dev/brevo/smtp/email with
 *      `Authorization: Bearer <LOVABLE_API_KEY>` and
 *      `X-Connection-Api-Key: <BREVO_API_KEY>`.
 *   2. Direct Brevo API: POST https://api.brevo.com/v3/smtp/email with the
 *      `api-key` header.
 *
 * Secrets (server-side only, checked in this order):
 *   BREVO_API_KEY + LOVABLE_API_KEY – connector-gateway credentials
 *   EMAIL_PROVIDER_API_KEY          – direct Brevo API key (sent as `api-key`)
 *   API_KEY                         – fallback direct Brevo API key
 *   EMAIL_FROM                      – verified sender, e.g. "MedKonet Nigeria <noreply@yourdomain>"
 */
export const BREVO_GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const BREVO_DIRECT_URL = "https://api.brevo.com/v3/smtp/email";

export type BrevoSendMode =
  | { kind: "gateway"; gatewayKey: string; connectionKey: string }
  | { kind: "direct"; apiKey: string };

/** Gateway wins when both connector credentials exist; otherwise direct key. */
export function resolveBrevoSendMode(): BrevoSendMode | null {
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["BREVO_API_KEY"];
  if (gatewayKey && connectionKey) return { kind: "gateway", gatewayKey, connectionKey };
  const apiKey = process.env["EMAIL_PROVIDER_API_KEY"] || process.env["API_KEY"];
  if (apiKey) return { kind: "direct", apiKey };
  return null;
}

export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type EmailResult =
  | { configured: false }
  | { configured: true; sent: true }
  | { configured: true; sent: false; error: string };

export function isEmailConfigured(): boolean {
  return Boolean(resolveBrevoSendMode() && process.env["EMAIL_FROM"]);
}

function parseSender(from: string): { email: string; name?: string } {
  const m = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(from);
  const name = m?.[1]?.trim();
  const email = m?.[2]?.trim();
  if (email) return name ? { email, name } : { email };
  return { email: from.trim() };
}

type DeliverOutcome = { sent: true } | { sent: false; error: string };

async function deliver(msg: EmailMessage, from: string, mode: BrevoSendMode): Promise<DeliverOutcome> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url: string;
  if (mode.kind === "gateway") {
    url = `${BREVO_GATEWAY_URL}/smtp/email`;
    headers["Authorization"] = `Bearer ${mode.gatewayKey}`;
    headers["X-Connection-Api-Key"] = mode.connectionKey;
  } else {
    url = BREVO_DIRECT_URL;
    headers["api-key"] = mode.apiKey;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
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
  const mode = resolveBrevoSendMode();
  const from = process.env["EMAIL_FROM"];
  if (!mode || !from) return { configured: false };
  try {
    const out = await deliver(msg, from, mode);
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
