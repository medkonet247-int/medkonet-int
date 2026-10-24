import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputCls =
  "block w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-[invalid=true]:border-destructive disabled:opacity-60";

export function Field({
  id, label, error, hint, children, className,
}: { id: string; label: string; error?: string | undefined; hint?: ReactNode; children: ReactNode; className?: string | undefined }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: boolean) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}
