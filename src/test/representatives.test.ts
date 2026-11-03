import { describe, it, expect } from "vitest";
import { resolveSiteText, siteTextDefaults } from "@/lib/site-text";
import { proposalSchema, communityReportSchema, representativeSchema, representativeChangeSchema, representativeReviewSchema, representativeReportStatusSchema } from "@/lib/representatives";
import { settingsSchema } from "@/lib/membership";

const proposalStatus = siteTextDefaults.find(row => row.key === "rep.reps.not_active");
const navItem = siteTextDefaults.find(row => row.key === "rep.nav");

describe("Phase 4B representative rules", () => {
  it("shows the honest not-active message by default", () => {
    expect(proposalStatus).toBeDefined();
    expect(resolveSiteText(proposalStatus!.default_value, undefined)).toBe("The representative programme is not active yet.");
    expect(resolveSiteText(proposalStatus!.default_value, "")).toBe("The representative programme is not active yet.");
  });
  it("offers a Representative header link labelled for the header catalog", () => {
    expect(navItem).toBeDefined();
    expect(navItem!.page).toBe("header");
    expect(navItem!.default_value).toBe("Representative");
  });
  it("accepts valid proposals and rejects empty or oversized ones", () => {
    expect(proposalSchema.safeParse({ title: "Study week", message: "Hello" }).success).toBe(true);
    expect(proposalSchema.safeParse({ title: "  ", message: "Hello" }).success).toBe(false);
    expect(proposalSchema.safeParse({ title: "x".repeat(201), message: "Hello" }).success).toBe(false);
    expect(proposalSchema.safeParse({ title: "Study week", message: "x".repeat(5001) }).success).toBe(false);
  });
  it("accepts only the six community-need categories", () => {
    for (const category of ["Resources", "Events", "Mentorship", "Technical problem", "Welfare or support", "Other"]) expect(communityReportSchema.safeParse({ category, message: "Need past questions" }).success).toBe(true);
    expect(communityReportSchema.safeParse({ category: "Chat", message: "Need past questions" }).success).toBe(false);
    expect(communityReportSchema.safeParse({ category: "Other", message: "x".repeat(3001) }).success).toBe(false);
  });
  it("stores representative emails lowercase and rejects invalid ones", () => {
    expect(representativeSchema.parse({ email: " Rep@Example.COM ", university_id: "00000000-0000-0000-0000-000000000000", notes: "" }).email).toBe("rep@example.com");
    expect(representativeSchema.safeParse({ email: "not-an-email", university_id: "00000000-0000-0000-0000-000000000000" }).success).toBe(false);
    expect(representativeSchema.safeParse({ email: "rep@example.com", university_id: "nope" }).success).toBe(false);
  });
  it("limits allowlist actions to the supported set", () => {
    for (const action of ["suspend", "reinstate", "revoke", "directory", "notes"]) expect(representativeChangeSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", action }).success).toBe(true);
    expect(representativeChangeSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", action: "delete" }).success).toBe(false);
    expect(representativeChangeSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", action: "notes", notes: "x".repeat(2001) }).success).toBe(false);
  });
  it("requires publish or reject with a note inside limits", () => {
    expect(representativeReviewSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", action: "publish", national: true }).success).toBe(true);
    expect(representativeReviewSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", action: "withdraw" }).success).toBe(false);
    expect(representativeReviewSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", action: "reject", note: "x".repeat(2001) }).success).toBe(false);
  });
  it("restricts report status updates to the three administrator statuses", () => {
    for (const status of ["Received", "In progress", "Resolved"]) expect(representativeReportStatusSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", status, note: "" }).success).toBe(true);
    expect(representativeReportStatusSchema.safeParse({ id: "00000000-0000-0000-0000-000000000000", status: "Approved" }).success).toBe(false);
  });
  it("carries the representative programme switch in membership settings", () => {
    const parsed = settingsSchema.parse({ whatsapp_link: "", invitation_template: "Hello [Applicant Name] [Insert Official WhatsApp Invitation Link]", registration_open: true });
    expect(parsed.representative_programme_active).toBe(false);
    expect(settingsSchema.safeParse({ whatsapp_link: "", invitation_template: "Hello [Applicant Name] [Insert Official WhatsApp Invitation Link]", registration_open: true, representative_programme_active: true }).success).toBe(true);
  });
});
