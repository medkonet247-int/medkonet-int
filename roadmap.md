# Phase 5 Roadmap
- [x] Step A: Audit — functionality crawl, membership-flow code review, security (RLS/functions/secrets), responsiveness, a11y scan, performance/privacy data, Brevo limits (findings delivered in chat)
- [x] Step B: Footer reduction — done: 1025px → 546px on 360px phones; wording shortened via Site Text editor (old text kept as previous value, audited)
- [ ] Step C: Fixes — no Critical/High found so far; Low: transient auth failure can bounce an admin to /login (robustness)
- [ ] Remaining live tests: registration/verification/login flows with real email delivery (blocked: Brevo key returns authentication error), representative end-to-end (needs an allowlisted approved member), forgot-password live email
- [ ] Final Phase 5 report (features tested, defects, security table, email capacity plan, launch checklist, verdict)

## Notes
- Brevo free plan confirmed: 300 emails/day + up to 1,000 held in retry queue beyond the cap.
- Review-timestamp suspicion was a false positive: applications_review_guard trigger stamps reviewed_at/reviewed_by on every decision change.
- Database: 3 approved applications, 72 verified universities, 1 published resource, 5 accounts, 2 admin allowlist entries, 0 representative entries — founder to confirm which are test data.
