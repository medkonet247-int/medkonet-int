# Phase 5 Roadmap
- [x] Step A: Audit — functionality crawl, membership-flow code review, security (RLS/functions/secrets), responsiveness, a11y scan, performance/privacy data, Brevo limits (findings delivered in chat)
- [x] Step B: Footer reduction — done: 1025px → 546px on 360px phones; wording shortened via Site Text editor (old text kept as previous value, audited)
- [x] Step C: Fixes — Low robustness defect fixed (transient auth failure no longer bounces signed-in users; retry + cached-session fallback + state preserved; 5 new tests)
- [x] Final Phase 5 report — see phase-five-report.md (Files) and the chat summary
- [ ] Live email tests (registration/verification/invitation/password reset) — blocked: Brevo credential rejected (`401 Key not found`); founder to reconnect the Brevo connection
- [ ] Representative end-to-end — blocked: zero representatives; needs one allowlisted approved member
- [ ] Test-data cleanup — waiting on founder to identify which of the 5 applications/6 accounts are test data
- [ ] Real-phone registration test and publish — founder actions after email fix

## Notes
- Brevo free plan confirmed: 300 emails/day + up to 1,000 held in retry queue beyond the cap.
- Review-timestamp suspicion was a false positive: applications_review_guard trigger stamps reviewed_at/reviewed_by on every decision change.
- Live database at report time: 5 applications (4 approved), 6 accounts, 72 verified universities, 1 published resource, 2 admin allowlist entries, 259 audit rows, 0 representatives — founder to confirm test data.
- Final report saved to /mnt/documents/phase-five-report.md.
