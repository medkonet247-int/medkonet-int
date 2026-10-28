import { z } from "zod";
export const kinds = ["resources", "events", "mentorship", "announcements"] as const;
export type ContentKind = typeof kinds[number];
export const categories = ["Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology", "Community Medicine", "Medicine", "Surgery", "Obstetrics and Gynaecology", "Paediatrics", "Past Questions", "Study Guides", "Other"];
export const resourceTypes = ["PDF", "Document", "Slides", "Video link", "Website link", "Other"];
export const eventTypes = ["Webinar", "Study Session", "Workshop", "Meetup", "Announcement", "Other"];
export const FILE_LIMIT = 10 * 1024 * 1024;
export const SIGNED_SECONDS = 60;
export const fileTypes: Record<string, string> = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
export const httpsUrl = z.string().trim().max(2048).refine(v => { if (!v) return true; try { const u = new URL(v); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password; } catch { return false; } }, "Enter a valid HTTPS URL without credentials.");
export const contentSchema = z.object({
  id: z.string().uuid().optional(), kind: z.enum(kinds), title: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(12000), published: z.boolean(),
  details: z.object({ category: z.string().trim().max(100).default("Other"), type: z.string().max(100).default("Other"), external_url: httpsUrl.default(""), starts_at: z.string().max(100).default(""), venue: z.string().max(500).default(""), meeting_url: httpsUrl.default(""), registration: z.string().max(3000).default(""), status: z.enum(["Open", "Closed", "Scheduled", "Cancelled", "Completed"]).default("Open"), audience: z.string().max(2000).default(""), apply: z.string().max(3000).default(""), announcement_date: z.string().max(100).default(""), pinned: z.boolean().default(false) }),
}).superRefine((v, ctx) => {
  if (v.kind === "events" && (!v.details.starts_at || !Number.isFinite(Date.parse(v.details.starts_at)))) ctx.addIssue({ code: "custom", path: ["details", "starts_at"], message: "Enter a valid event date and time." });
  if (v.kind === "resources" && !resourceTypes.includes(v.details.type)) ctx.addIssue({ code: "custom", path: ["details", "type"], message: "Choose a resource type." });
  if (v.kind === "events" && !eventTypes.includes(v.details.type)) ctx.addIssue({ code: "custom", path: ["details", "type"], message: "Choose an event type." });
  if (v.kind === "mentorship" && !["Open", "Closed"].includes(v.details.status)) ctx.addIssue({ code: "custom", path: ["details", "status"], message: "Choose Open or Closed." });
  if (v.kind === "announcements" && (!v.details.announcement_date || !Number.isFinite(Date.parse(v.details.announcement_date)))) ctx.addIssue({ code: "custom", path: ["details", "announcement_date"], message: "Enter an announcement date." });
});
export type ContentInput = z.infer<typeof contentSchema>;
export type Details = ContentInput["details"];
export function detailsOf(value: unknown): Details { return contentSchema.innerType().shape.details.parse(value ?? {}); }
export function watDate(value: string) { return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
export function eventIsPast(value: string, now = Date.now()) { return Date.parse(value) < now; }
export function validateFileMeta(name: string, size: number, mime: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const expected = fileTypes[ext];
  if (!expected || size <= 0 || size > FILE_LIMIT || mime !== expected) throw new Error("Upload a PDF, DOCX, PPTX, PNG, JPEG or WebP file, up to 10 MB.");
  return { ext, mime: expected };
}
export function filterContent<T extends { title: string; description: string; details: unknown }>(rows: T[], q: string, category: string, type: string, searchDescription = false) {
  const term = q.trim().toLowerCase();
  return rows.filter(r => { const d = detailsOf(r.details); return (r.title + (searchDescription ? " " + r.description : "")).toLowerCase().includes(term) && (!category || d.category === category) && (!type || d.type === type); });
}