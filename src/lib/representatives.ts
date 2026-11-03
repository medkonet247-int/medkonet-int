import { z } from "zod";

export const reportCategories = ["Resources", "Events", "Mentorship", "Technical problem", "Welfare or support", "Other"] as const;

export type RepContext = {
  active: boolean;
  programme: boolean;
  university?: { id: string; name: string; type: string; state: string; location: string };
  counts?: { pending: number; approved: number; onboarded: number };
  granted_at?: string | null;
};
export type WelcomeMember = { full_name: string; course: string; current_level: string; onboarded: boolean };
export type ProposalRow = { id: string; university_id: string; created_by: string; title: string; message: string; status: string; admin_note: string; created_at: string; reviewed_at: string | null };
export type CommunityReportRow = { id: string; university_id: string; category: string; message: string; status: string; admin_note: string; created_at: string; reviewed_at: string | null };
export type AllowlistRow = {
  id: string; email: string; status: "Active" | "Suspended" | "Revoked"; notes: string; show_on_directory: boolean;
  granted_at: string; status_changed_at: string;
  university_id: string; university_name: string; university_state: string; active: boolean; verification_status: string;
  user_id: string | null; confirmed: boolean | null; application_status: string | null;
  applicant_name: string | null; profile_name: string | null; granted_by_name: string | null;
  display_status: string;
};
export type DirectoryReps = { programme: boolean; reps: { full_name: string; university: string }[] };
export type RepresentativeAdminData = {
  programme: boolean;
  allowlist: AllowlistRow[];
  proposals: ProposalRow[];
  reports: CommunityReportRow[];
  universities: { id: string; name: string; state: string }[];
};

export const proposalSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
});
export const communityReportSchema = z.object({
  category: z.enum(reportCategories),
  message: z.string().trim().min(1).max(3000),
});
export const representativeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  university_id: z.string().uuid(),
  notes: z.string().trim().max(2000).default(""),
});
export const representativeChangeSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["suspend", "reinstate", "revoke", "directory", "notes"]),
  show_on_directory: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});
export const representativeReviewSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["publish", "reject"]),
  title: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  note: z.string().trim().max(2000).optional(),
  national: z.boolean().default(false),
});
export const representativeReportStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["Received", "In progress", "Resolved"]),
  note: z.string().trim().max(2000).default(""),
});
