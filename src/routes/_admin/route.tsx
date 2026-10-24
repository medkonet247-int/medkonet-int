import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadMemberState } from "@/lib/session";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const s = await loadMemberState();
    if (s.state === "visitor") throw redirect({ to: "/login" });
    if (s.state !== "admin") throw redirect({ to: "/access-denied" });
  },
  component: () => <Outlet />,
});
