import { z } from "zod";

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "FCT (Abuja)",
] as const;

export const UNIVERSITY_TYPES = ["Federal", "State", "Private"] as const;

export const ACADEMIC_LEVELS = [
  "100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "600 Level", "Graduate / House Officer",
] as const;

export const REASON_MIN = 50;
export const REASON_MAX = 1000;

/**
 * Normalise a phone number to E.164 (+<country><number>).
 * Accepts Nigerian local formats (0803..., 803..., 234803..., +234803...) and
 * international numbers written with + or 00. Returns null when invalid.
 */
export function normalizePhone(input: string): string | null {
  const raw = input.trim().replace(/[\s\-().]/g, "");
  if (!raw) return null;
  let s = raw;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!/^\+?\d+$/.test(s)) return null;

  const nigerianLocal = /^[789][01]\d{8}$/; // 10 digits after the leading 0
  if (s.startsWith("+")) {
    if (s.startsWith("+234")) {
      const rest = s.slice(4).replace(/^0/, "");
      return nigerianLocal.test(rest) ? "+234" + rest : null;
    }
    return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
  }
  if (s.startsWith("234") && s.length >= 13) {
    const rest = s.slice(3).replace(/^0/, "");
    return nigerianLocal.test(rest) ? "+234" + rest : null;
  }
  if (s.length === 11 && s.startsWith("0") && nigerianLocal.test(s.slice(1))) return "+234" + s.slice(1);
  if (s.length === 10 && nigerianLocal.test(s)) return "+234" + s;
  return null;
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address")
  .max(255, "Email is too long")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}`)
    .min(min, `${label[0].toUpperCase() + label.slice(1)} is too short`)
    .max(max, `${label[0].toUpperCase() + label.slice(1)} is too long`);

export const registrationSchema = z
  .object({
    full_name: text("full name", 2, 120),
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string().min(1, "Confirm your password"),
    whatsapp_number: z
      .string()
      .trim()
      .min(1, "Enter your WhatsApp number")
      .refine((v) => normalizePhone(v) !== null, "Enter a valid WhatsApp number, e.g. 0803 123 4567 or +234 803 123 4567")
      .transform((v) => normalizePhone(v) as string),
    university: text("university", 2, 160),
    university_type: z.enum(UNIVERSITY_TYPES, { errorMap: () => ({ message: "Choose a university type" }) }),
    state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Choose your state" }) }),
    course: text("course", 2, 120),
    current_level: z.enum(ACADEMIC_LEVELS, { errorMap: () => ({ message: "Choose your current level" }) }),
    reason_for_joining: z
      .string()
      .trim()
      .min(REASON_MIN, `Please write at least ${REASON_MIN} characters`)
      .max(REASON_MAX, `Please keep it under ${REASON_MAX} characters`),
    agree: z.literal(true, { errorMap: () => ({ message: "You must agree to the community rules and privacy notice" }) }),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type RegistrationInput = z.input<typeof registrationSchema>;

export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = score <= 1 ? "Weak" : score <= 3 ? "Fair" : "Strong";
  return { score, label };
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const shown = user.length <= 2 ? user[0] : user.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(2, user.length - shown.length))}@${domain}`;
}

export const codeSchema = z.string().regex(/^\d{4}$/, "Enter the 4-digit code");
