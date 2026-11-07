# Medkonet Int

PROJECT: MEDKONET NIGERIA

PHASE 1: FOUNDATION, REGISTRATION, STUDENT DASHBOARD AND ADMINISTRATOR DASHBOARD



SETUP RULE (READ FIRST)



Do not ask me for any credentials, API keys or domains.

Use the built-in backend (Lovable Cloud/Supabase) for database and authentication with no manual setup.

Build the entire Phase 1 first.

Put email sending behind one replaceable email-provider module that reads its key from a secret environment variable.

If no provider is configured, the app must still run, and the verification screen must say "Email delivery is not configured yet."

Never print, log or display verification codes in production.

For testing only, add a development-mode flag that is OFF by default and controlled server-side only (never from the browser). While it is ON, show the code on screen AND block administrator privileges, so nobody can claim the admin account while codes are visible.

At the end, give me a short numbered list of the steps I must do myself (choose an email provider, add its key as a secret, turn development mode off). Do not claim email verification works until it has been tested with a real email.



ROLE



You are a senior UI/UX designer, frontend engineer and security-minded full-stack developer building a professional, responsive website for MedKonet Nigeria. Inspect the existing project first (if any). Use the existing React, TypeScript and styling setup. Do not add a second styling system or unnecessary dependencies.



PROJECT VISION



MedKonet Nigeria is a growing community connecting Medicine and Surgery students across federal, state and private universities in Nigeria. It encourages academic collaboration, peer learning, mentorship, resource sharing, meaningful friendships and personal growth. It must be welcoming to students who feel uncertain, overwhelmed or afraid of how to achieve their medical dreams, and it must encourage collaboration, not unhealthy competition.



BRAND



Name: MedKonet Nigeria

Tagline: Connecting Medical Minds, Building Better Futures.

Supporting statement: Different Universities. One Medical Family.

Values: collaboration, compassion, academic excellence, belonging, integrity, growth.

Use the uploaded MedKonet Nigeria logo exactly as provided. Do not redesign, distort or recreate it.



DESIGN DIRECTION



Premium, modern academic website with a medical identity.

Colours (taken from the logo): deep navy blue, royal blue, cyan blue, white, light neutral backgrounds.

Clean layouts, professional typography, strong hierarchy, generous spacing, subtle gradients, rounded cards, restrained shadows, accessible contrast, small purposeful animations, consistent buttons and forms.

Avoid glowing effects, clutter, decorative excess and generic AI-style design.

Mobile-first and fully responsive for Android phones, tablets, laptops and desktops. Use semantic HTML and accessible interactions.



ACCESS MODEL



Public pages (no login): Home, About, Contact, Join MedKonet, Login, Verify Email.

Members-only pages (verified AND approved members only): Community, Academic Resources, Mentorship, Events and Programmes, University Representatives, and the approved-member view of the Student Dashboard.

Administrator-only: Administrator Dashboard.

Any visitor who clicks a members-only link or button (including "Explore Our Community" and "Resources"), or types a members-only URL, is redirected to the Join MedKonet page.

Logged-in users see navigation appropriate to their state. Show the Admin link only to administrators.

Hiding pages is never the security mechanism. Members-only data must be protected by database Row Level Security. Route guards are for user experience only.



NAVIGATION AND FOOTER



Header: logo, Home, About, Community, Resources, Mentorship, Events, Contact, and a "Join MedKonet" button (Login link for visitors, account menu and logout for signed-in users). Mobile navigation must be a clean, accessible menu.

Footer: logo, short brand description, main navigation, community links, contact options, copyright notice.

Every link and button must lead to a correct destination. No dead links.



HOME PAGE



Hero headline: "Your Medical Journey, Stronger Together."

Supporting text: "Connect with Medicine and Surgery students across Nigerian universities, exchange knowledge, discover opportunities, and grow alongside people who understand your journey."

Primary CTA: "Become a Member". Secondary CTA: "Explore Our Community" (leads visitors to Join MedKonet).

Mission section: "Different Universities. One Medical Family." explaining how MedKonet connects students to share resources, discuss difficult concepts, find study partners, support one another and build meaningful academic relationships.

What We Offer cards: Student Networking, Academic Resource Sharing, Peer Learning, Mentorship and Guidance, Study Partnerships, Events and Academic Collaboration. Do not advertise organised tutorials as an existing service.

Community Benefits: build connections across universities; access shared academic resources; learn from fellow medical students; find supportive study partners; discover mentorship opportunities; stay encouraged throughout medical school; develop professional relationships.

Belonging section: "You Don't Have to Figure It All Out Alone." Students can find encouragement, ask questions, share challenges and learn alongside peers without fear of unhealthy competition.

Growth vision: MedKonet intends to develop a nationwide network with university chapters, mentorship initiatives, academic resources, events and collaborations. Present these as future ambitions, not existing achievements.

Final CTA: "Your Journey Matters. Let's Grow Together." Button: "Apply to Join MedKonet".



ABOUT PAGE



Who we are, our mission, our vision, our core values, why MedKonet exists, and our commitment to collaboration and belonging.



CONTACT PAGE



Prompt visitors to contact MedKonet through either WhatsApp or email:

WhatsApp: https://wa.link/fwg87s or https://wa.link/i54hf5

Email: adorableodobe@gmail.com

Do not invent any other email addresses, phone numbers or social media accounts.



MEMBERS-ONLY PLACEHOLDER PAGES



Create Community, Academic Resources, Mentorship, Events and Programmes, and University Representatives pages with real structure and honest introductory text only for approved members.

Do not create fake resources, files, events, dates, speakers, mentors, representatives, counts, statistics, testimonials or activity.

Community page: explain purpose, values and participation expectations, and that approved members are invited to WhatsApp. No fake social network or discussion feed.

Mentorship: describe the future vision only. Do not claim mentors are available.

Representatives: describe the proposed future programme only. Do not claim anyone has been appointed.



REGISTRATION (THE JOIN PAGE IS THE MEMBERSHIP APPLICATION)



Fields:

1. Full name

2. Email address (trimmed, lowercased, validated)

3. Password (minimum 8 characters, strength hint, show/hide toggle) plus confirm password

4. WhatsApp number (required, clearly labelled; accept Nigerian formats such as 0803..., +234803..., 803... and valid international formats; store in normalised international format)

5. University

6. University type: Federal, State or Private

7. State (all 36 states plus FCT, as a list)

8. Course

9. Current academic level

10. Why do you want to join MedKonet? (minimum length, character counter)

11. Required checkbox agreeing to the community rules and privacy notice (both linked)



Every field has a visible label, inline error text, correct input types and autocomplete attributes for mobile.

Include a clear privacy notice: purpose of collecting the information, who can see it, and that WhatsApp numbers and emails are never published.

Tell applicants that submitting does not guarantee acceptance.

Disable the submit button and show a spinner while submitting so double taps cannot create duplicates. Validate on the client and again on the server.



Existing-email handling: if the email is already registered and verified, show a clear message pointing to Login. If it is registered but unverified, resend a fresh code and take the user to Verify Email. Do not reveal whether an address exists beyond these messages.



EMAIL VERIFICATION



After registration, send the user to the Verify Email page showing the masked email address, a 4-digit code input optimised for mobile (numeric keyboard, auto-advance, paste support), a "Verify Email" link alternative in the email, a resend button with a visible countdown cooldown, and a "Wrong email? Register again" option.

The email contains the 4-digit code and a Verify Email link. Either method verifies the email. The link must work on a different device or browser from the one used to register.

Security requirements (a 4-digit code has only 10,000 combinations, so all are mandatory):

- Generate codes server-side only (Supabase Edge Function).

- Store codes and link tokens hashed, never in plain text.

- Expire after 10 minutes.

- Maximum 5 attempts per code, then invalidate it.

- Single use. A new code invalidates earlier ones.

- Resend limited by cooldown, hourly cap, and per-email and per-IP rate limits.

- Generic error messages.

- Wrong code shows attempts remaining. Expired code shows a clear message with a resend option.

On successful verification: create the Pending application (once only, enforced by a unique constraint), sign the user in and send them to the Student Dashboard.

The account, profile and application must never end up half-created. The application is created only after email verification.



ADMINISTRATOR PROVISIONING



bionicz115@gmail.com is the first administrator. This is enforced by a database admin allowlist table (email, granted_by, created_at), never by a form field, user-controlled value or frontend-only check.

After email verification, a database trigger or secure function checks the verified email against the allowlist. A matching account becomes administrator immediately, skips the application and lands on the Admin Dashboard.

This must never happen while development mode is ON.

Do not create a public administrator registration page.

Existing administrators can later grant administrator access to others by adding them to the allowlist (this interface may come in a later phase). The first administrator cannot be removed accidentally.



LOGIN



Email and password, generic error for wrong credentials, throttling after repeated failures.

Unverified users are sent to Verify Email. Pending and Rejected users land on the Student Dashboard status page. Approved users get full access. Administrators land on the Admin Dashboard.

Include logout and a working Forgot Password flow that uses the same email-provider module. Sessions persist sensibly and expire securely.



STUDENT DASHBOARD



Show state-aware content:

- Unverified: prompt to verify email.

- Pending: application received, not guaranteed, review is in progress.

- Rejected: a respectful message and the contact options.

- Approved: welcome message, links to members-only pages, and honest wording about the WhatsApp invitation (approval does not mean the student has joined WhatsApp).



ADMINISTRATOR DASHBOARD (SHELL)



Visible only to allowlisted administrators.

Overview with real database counts only: total, pending, approved and rejected applications.

A basic applications list showing each applicant's details and WhatsApp number, with Approve and Reject actions behind confirmation dialogs. Record the review timestamp and the administrator responsible.

An access-denied page for non-administrators.

Full search, filtering and the WhatsApp invitation workflow come in Phase 2. Do not build them now.



DATABASE (SUPABASE) AND SECURITY



Row Level Security on every table. Tables: profiles, applications, verification codes (hashed), admin allowlist, audit log.

Applications fields: id, user_id, full_name, email, whatsapp_number, university, university_type, state, course, current_level, reason_for_joining, application_status (Pending, Approved, Rejected), submitted_at, reviewed_at, reviewed_by. Add constraints and indexes.

Rules enforced by the database:

- Only administrators can read all applications or change their status.

- Applicants can read only their own record and cannot edit their status.

- Only approved members can read members-only data.

- Visitors can read nothing private.

Never expose service-role keys in frontend code. Do not trust frontend role checks.



QUALITY REQUIREMENTS



Reusable components, consistent typography, spacing, colours and buttons. Readable text on small screens. Sensible loading, empty and error states. Accessible labels, headings, keyboard navigation and alt text. Logo displayed correctly everywhere.

Do not add fake statistics, testimonials, users, partnerships or achievements.



DEVELOPMENT RULES



This is Phase 1 only. Do not build later-phase features: resource libraries, events management, mentorship management, university directory, analytics, representative roles, or administrator management screens.

No paid services. Budget is zero.

Do not claim any feature works until it has been tested.



REQUIRED TESTS (report each as pass or fail)



- Valid registration

- Every invalid field

- Invalid and international phone numbers

- Double submit

- Duplicate email (verified and unverified)

- Correct code

- Wrong code

- Five wrong attempts

- Expired code

- Resend cooldown and limits

- Verification link opened on another device

- Login before verification

- Admin allowlist account after verification

- A non-allowlisted account cannot become administrator by any means

- Access to every route as visitor, unverified, pending, rejected, approved and administrator

- Non-admin access to admin data (blocked by the database, not just the interface)

- Behaviour when no email provider is configured

- Confirmation that development mode is OFF and no code appears in any production response or log

- All navigation links and buttons

- Mobile layout at 360px width, tablet and desktop



FINAL REPORT



Provide a concise report listing: pages created, files changed, database changes, security policies, tests performed with results, known issues, and the numbered list of steps I must complete myself (email provider, secret key, turning development mode off).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://medkonet-int.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e49e1a5e-7dd0-4ba5-977b-c25e3937a94e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
