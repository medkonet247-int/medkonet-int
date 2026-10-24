/**
 * Replaceable email-provider module. This is the ONLY place that talks to an
 * email service. To change providers, rewrite `deliver()` and keep the
 * `sendEmail` signature.
 *
 * Secrets (server-side only):
 *   EMAIL_PROVIDER_API_KEY  – provider API key (default implementation: Resend)
 *   EMAIL_FROM              – sender, e.g. "MedKonet Nigeria <noreply@yourdomain>"
 */
export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type EmailResult = { configured: false } | { configured: true; sent: boolean };

export function isEmailConfigured(): boolean {
  return Boolean(process.env["EMAIL_PROVIDER_API_KEY"] && process.env["EMAIL_FROM"]);
}

async function deliver(msg: EmailMessage, apiKey: string, from: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
  });
  if (!res.ok) {
    // Never log message bodies: they may contain verification codes.
    console.error("[email] provider rejected message", res.status);
  }
  return res.ok;
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env["EMAIL_PROVIDER_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (!apiKey || !from) return { configured: false };
  try {
    return { configured: true, sent: await deliver(msg, apiKey, from) };
  } catch {
    console.error("[email] provider request failed");
    return { configured: true, sent: false };
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
