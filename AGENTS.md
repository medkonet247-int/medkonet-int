<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Phase 2 administrator mutations use authenticated server functions and an atomic database RPC; role checks require a verified allowlisted account to prevent stale-role access.
- Internal rejection reasons and invitation metadata live separately from applicant-readable applications; student onboarding reads only a self-scoped boolean.
- Administrator routes remain in the existing client-gated _admin subtree; new management pages share an administrator navigation shell without changing Phase 1 routes.
- Academic content uses typed kind-specific payloads in one RLS-protected content store; shared member and administrator views preserve the existing routes while database triggers audit every content write.
- Resource uploads use server-side metadata and signature validation with privileged storage writes only after verified administrator authorization; object read policies require a currently published readable resource and file links are short-lived.
- Member WhatsApp visibility is managed separately from invitation settings so existing membership mutations cannot reset its explicit opt-in state.
