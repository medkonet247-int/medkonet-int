import { Link } from "@tanstack/react-router";
import logo from "@/assets/medkonet-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export const LOGO_URL = logo.url;

export function Logo({ className, withText = true, size = 44 }: { className?: string; withText?: boolean; size?: number }) {
  return (
    <Link to="/" className={cn("flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-ring", className)} aria-label="MedKonet Nigeria home">
      <img src={logo.url} alt="MedKonet Nigeria logo" width={size} height={size} className="shrink-0 rounded-full" style={{ width: size, height: size }} />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold tracking-tight">MedKonet</span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] opacity-70">Nigeria</span>
        </span>
      )}
    </Link>
  );
}
