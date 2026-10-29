import { z } from "zod";
import catalog from "./site-text-defaults.json";

export const siteTextDefaults = catalog;
export type TextDefinition = (typeof catalog)[number];
export function resolveSiteText(defaultValue: string, value?: string | null) {
  return value?.trim() ? value : defaultValue;
}
export const siteTextInput = z.object({ key: z.string().max(180), value: z.string().max(12000), expected: z.string().max(12000) }).superRefine((input, ctx) => {
  const item = catalog.find(row => row.key === input.key);
  if (!item || input.value.length > item.max_length || input.value.includes("\u0000")) ctx.addIssue({ code: "custom", message: "Unknown text or maximum length exceeded." });
});