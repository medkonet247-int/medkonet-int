import { z } from "zod";
export const DEFAULT_INVITATION = `Hello [Applicant Name],

Your application to join MedKonet Nigeria has been approved.

We are pleased to welcome you to a community connecting Medicine and Surgery students across Nigerian universities.

Use the invitation link below to join our official WhatsApp community:

[Insert Official WhatsApp Invitation Link]

We look forward to learning, connecting, and growing together.

MedKonet Nigeria
Connecting Medical Minds, Building Better Futures.`;
export const settingsSchema = z.object({
  whatsapp_link: z.string().trim().max(2048).refine((v) => { if (!v) return true; try { const u = new URL(v); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password; } catch { return false; } }, "Enter a valid HTTPS invitation URL."),
  invitation_template: z.string().min(1).max(5000).refine(v => v.includes("[Applicant Name]") && v.includes("[Insert Official WhatsApp Invitation Link]"), "Keep both invitation placeholders."),
  registration_open: z.boolean(),
  representative_programme_active: z.boolean().default(false),
});
export function invitationMessage(template: string, name: string, link: string) {
  return template.replaceAll("[Applicant Name]", name).replaceAll("[Insert Official WhatsApp Invitation Link]", link);
}
export function whatsappUrl(number: string, message: string) {
  const digits = number.replace(/[+\s()-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error("This applicant needs a valid international WhatsApp number.");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
export function membershipGroup(status: string, invited: boolean, onboarded: boolean) {
  return status !== "Approved" ? "applicants" : invited && onboarded ? "onboarded" : "awaiting";
}
export function canRevoke(email: string, ownEmail: string, protectedAccount: boolean) {
  return !protectedAccount && email.toLowerCase() !== "bionicz115@gmail.com" && email.toLowerCase() !== ownEmail.toLowerCase();
}