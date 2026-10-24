import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadMemberState } from "@/lib/session";

// UX guard only; member data is protected by RLS.
export const Route = createFileRoute("/_members")({
  ssr: false,
  beforeLoad: async () => {
    const s = await loadMemberState();
    if (s.state === "visitor") throw redirect({ to: "/join" });
    if (s.state === "unverified") throw redirect({ to: "/verify-email" });
    if (s.state !== "approved" && s.state !== "admin") throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
