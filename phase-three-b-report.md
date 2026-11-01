# Phase 3B — Administrator Site Text Editor

Verification resumed on 1 November 2026. The editor is usable and its central save/reset flow was verified. **Full Phase 3B acceptance is not yet established:** original desktop/mobile captures are unavailable, and the complete non-administrator account-state matrix and real email regressions remain unverified.

## Editable groups and seeded texts

The database and code catalog each contain **254 texts**:

| Group | Texts |
| --- | ---: |
| Home | 48 |
| About | 28 |
| Contact | 3 |
| Join | 37 |
| Login | 11 |
| Verify Email | 7 |
| Privacy Notice | 8 |
| Community Rules | 10 |
| Forgot Password | 4 |
| Reset Password | 6 |
| Header | 20 |
| Footer | 17 |
| Shared contact/privacy wording | 12 |
| Member pages: resources, events, mentorship, community and announcements | 43 |

Labels, paragraphs, buttons, privacy wording, navigation labels and member introductions/empty states are included. Security, verification errors, email templates, destinations, images and styling are not editable. Exhaustive coverage of every conditional or dynamic wording fragment has not been certified.

## Database and security

- Applied migration: `drizzle/migrations/0006_site_text_editor.sql`. Its single migration creates the table and seeds literal existing wording.
- `site_text`: unique key, page, section, label, current/default/previous values, visibility, destination, maximum length, last edit time, administrator ID and name.
- Explicit SELECT grants to anonymous/authenticated callers; authenticated UPDATE grant restricted to `current_value`; service-role grants. RLS enabled.
- Public rows readable publicly. Member rows require verified approved membership or a verified allowlisted administrator.
- Updates require administrator status in both RLS and the database function/trigger. Existing `has_role` verifies the administrator's confirmed email against the allowlist, not merely a stale role row.
- Definition columns cannot be changed by ordinary authenticated callers. The trigger protects definitions, limits length, stores previous value/editor/time and writes old/new values to the existing audit log.
- `edit_site_text` checks the expected old value, preventing overwriting another administrator's intervening change.
- Authenticated server functions expose editor reads and validated edits; no new private keys or paid services.
- One identity-scoped cached text bundle supplies defaults immediately. Missing, empty, whitespace-only or unavailable values retain code defaults. React escapes edited text rather than interpreting HTML.

## Tests performed

| Requirement | Result / evidence |
| --- | --- |
| Original wording seeded exactly | **PASS for all 254 catalog defaults:** every database default equals its code catalog string character-for-character. This is not an independent pre-phase source comparison. |
| Complete before/after appearance on every requested page | **UNVERIFIED:** original captures did not survive the paused workspace. Current desktop/360px checks passed, but cannot prove historical pixel/text identity. |
| Visitors view public pages | **PASS:** Home, About, Contact, Join, Login, Verify Email, Forgot/Reset Password, Privacy and Community Rules loaded at both widths. |
| Visitors cannot read member text | **PASS:** anonymous direct query returned 211 public rows and zero member rows. |
| Visitors cannot edit | **PASS:** direct anonymous editor RPC denied; editor route redirected to Login. |
| Non-admin signed-in edits and account-state matrix | **UNVERIFIED this resume:** no non-admin session minted. Database policy/function definitions inspected; this is not a substitute for signed-in behavioral testing. |
| Admin edit updates the live page | **PASS:** saved temporary Home headline in the editor and read it back on Home. |
| Reset to default | **PASS:** confirmed reset restored the original Home headline. |
| Empty/missing/whitespace fallback | **PASS:** live empty-value test and automated fallback tests. |
| Markup/script shown as text | **PASS:** literal script appeared in Home heading; injected flag stayed false; no runtime errors. |
| Maximum length and validation | **PASS:** 301-character headline rejected by database against its 300-character limit; automated unknown-key/length checks passed. |
| Concurrent edit protection | **PASS:** incorrect expected value rejected without a write. |
| Immutable defaults | **PASS:** direct authenticated default-value update rejected. |
| Old/new audit | **PASS:** four live headline changes recorded both old and new strings; restoration confirmed. |
| Unsaved change warning | **PASS:** declining discard kept the administrator on the editor. |
| Efficient loading | **PASS for bundle architecture:** normal fresh public loads used one bundle query, not 254 item requests. One initial navigation observed two requests; overall speed has not been benchmarked. |
| Editor at 360px | **PASS:** screenshot checked; no horizontal overflow. Corrected seven misleading editor page links/section labels without changing site wording. |
| Current public/member/admin pages at desktop and 360px | **PASS:** listed public routes plus Community, Resources, Mentorship, Events, Dashboard and all eight administrator pages loaded without runtime errors/overflow. |
| Phase 1–3 regressions | **PARTIAL:** all 24 automated tests passed (6 site text, 7 membership, 10 content, 1 navigation). Page-load smoke checks passed; full registration, actual delivery, password-based login, approval/invitation and content mutation regressions were not repeated. |

No new content, member decisions, contacts, invitation settings or email secrets were changed. Nine existing non-default wording edits were discovered and preserved. The temporary Home headline was reset; test audit entries intentionally remain as an honest record. Last observed automatic project check: **build OK** at 08:28 UTC.

## Files

Added during Phase 3B:
- `drizzle/migrations/0006_site_text_editor.sql`
- `src/lib/site-text-defaults.json`, `site-text.ts`, `site-text-context.tsx`, `site-text.functions.ts`
- `src/components/admin/SiteTextEditor.tsx`
- `src/routes/_admin/admin.site-text.tsx`
- `src/test/site-text.test.ts`
- This report.

Updated during Phase 3B: shared Header/Footer/Shared components; Home, About, Contact, Join, Login, Verify Email, Privacy, Community Rules, Forgot/Reset Password routes; member content rendering; root text-provider integration; administrator navigation; `AGENTS.md` and `roadmap.md`.

This resume changed only seven editor destination/section definitions in the catalog and completed this report/roadmap. No additional database migration was applied.

## Remaining limitations and your steps

- Use **Admin → Site Text** to search, edit, confirm, reset or undo wording. No new credentials or manual setup are required.
- A verified approved non-admin testing account and unverified/Pending/Rejected account testing authorization are needed to finish the live access matrix. No credentials should be shared.
- An authentic pre-phase copy/capture is needed for an independent historical before/after comparison; current defaults alone cannot prove it.
- Existing Phase 1–3 blockers still apply: the official WhatsApp invitation link is not configured and real email delivery has not been verified. Enter the real invitation link in Settings only when ready; do not invent one.
- Very long words/markup can overflow existing headings; preserving layout means arbitrary edits cannot be promised to fit automatically. Line breaks remain in stored strings, but their visible treatment follows the original element's whitespace styling.
- Member labels shared across multiple libraries use one wording entry; its “View on site” link points to a representative applicable page. Database seed sections/destinations are coarse; the fixed code catalog supplies the editor's specific labels/locations.
- Exhaustive conditional-copy coverage and full transaction/email regressions remain open; the whole phase should not be described as fully verified.
- No deployment was requested or performed during this resume.