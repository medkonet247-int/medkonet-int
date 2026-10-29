import { describe, expect, it } from "vitest";
import { resolveSiteText, siteTextDefaults, siteTextInput } from "@/lib/site-text";
describe("Site text rules", () => {
  it("uses the original default for missing values", () => expect(resolveSiteText("Original", undefined)).toBe("Original"));
  it("uses the original default for empty values", () => expect(resolveSiteText("Original", "")).toBe("Original"));
  it("uses the original default for whitespace-only values", () => expect(resolveSiteText("Original", " \n ")).toBe("Original"));
  it("preserves line breaks and literal markup as plain strings", () => expect(resolveSiteText("Original", "<script>alert(1)</script>\nNext")).toBe("<script>alert(1)</script>\nNext"));
  it("rejects values beyond the per-item maximum", () => { const item = siteTextDefaults.find(row => row.key === "home.hero.headline"); expect(item).toBeDefined(); expect(siteTextInput.safeParse({ key: "home.hero.headline", value: "x".repeat(301), expected: "" }).success).toBe(false); });
  it("rejects protected or unknown keys", () => expect(siteTextInput.safeParse({ key: "verification.error", value: "changed", expected: "" }).success).toBe(false));
});