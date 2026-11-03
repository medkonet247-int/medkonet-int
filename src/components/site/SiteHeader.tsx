import { useSiteText } from "@/lib/site-text-context";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Menu, LogOut, LayoutDashboard, ShieldCheck, ChevronDown, Users } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/community", label: "Community" },
  { to: "/resources", label: "Resources" },
  { to: "/mentorship", label: "Mentorship" },
  { to: "/events", label: "Events" },
  { to: "/universities", label: "University Directory" },
  { to: "/contact", label: "Contact" },
] as const;

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };
}

export function SiteHeader() {
  const t = useSiteText("header");
  const { user, state, loading } = useSession();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const signedIn = !!user;
  const isAdmin = state === "admin";
  const isRepQuery = useQuery({
    queryKey: ["rep-flag", user?.id], enabled: signedIn && !loading, staleTime: 60_000,
    queryFn: async () => { const { data, error } = await supabase.rpc("is_active_representative", { _user_id: user!.id }); return !error && data === true; },
  });
  const isRep = isRepQuery.data === true;

  const linkCls = "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const activeCls = { className: "text-foreground" };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">{t("Skip to content")}</a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label={t("Main")} className="hidden items-center lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={activeCls} activeOptions={{ exact: n.to === "/" }}>
              {t(n.label)}
            </Link>
          ))}
          {isRep && (
            <Link to="/representative" className={linkCls} activeProps={activeCls}>{t("Representative")}</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={linkCls} activeProps={activeCls}>{t("Admin")}</Link>
          )}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {loading ? (
            <div className="h-9 w-32" aria-hidden />
          ) : signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <span className="max-w-40 truncate">{user?.user_metadata?.["full_name"] ?? "My account"}</span>
                  <ChevronDown className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><LayoutDashboard className="size-4" />{t(" Student Dashboard")}</Link>
                </DropdownMenuItem>
                {isRep && (
                  <DropdownMenuItem asChild>
                    <Link to="/representative"><Users className="size-4" />{t(" Representative")}</Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><ShieldCheck className="size-4" />{t(" Admin Dashboard")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}><LogOut className="size-4" />{t(" Log out")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/login">{t("Login")}</Link></Button>
              <Button asChild><Link to="/join">{t("Join MedKonet")}</Link></Button>
            </>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label={t("Open menu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-left">{t("Menu")}</SheetTitle>
            </SheetHeader>
            <nav aria-label={t("Mobile")} className="flex flex-col gap-1 px-4 pb-6" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted" activeProps={{ className: "bg-muted text-primary" }} activeOptions={{ exact: n.to === "/" }}>
                  {t(n.label)}
                </Link>
              ))}
              {isRep && <Link to="/representative" className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted">{t("Representative")}</Link>}
              {isAdmin && <Link to="/admin" className="rounded-lg px-3 py-3 text-base font-medium hover:bg-muted">{t("Admin")}</Link>}
              <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                {signedIn ? (
                  <>
                    <p className="truncate px-3 text-sm text-muted-foreground">{user?.email}</p>
                    <Button variant="outline" asChild><Link to="/dashboard">{t("Student Dashboard")}</Link></Button>
                    <Button variant="ghost" onClick={() => { setOpen(false); void signOut(); }}>{t("Log out")}</Button>
                  </>
                ) : (
                  <>
                    <Button asChild><Link to="/join">{t("Join MedKonet")}</Link></Button>
                    <Button variant="outline" asChild><Link to="/login">{t("Login")}</Link></Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
