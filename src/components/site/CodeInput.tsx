import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export function CodeInput({
  value, onChange, disabled, invalid, onComplete,
}: { value: string; onChange: (v: string) => void; disabled?: boolean; invalid?: boolean; onComplete?: (v: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? "");

  const update = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, 4);
    onChange(clean);
    if (clean.length === 4) onComplete?.(clean);
    return clean;
  };

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, "");
    if (!d) return;
    if (d.length > 1) {
      const c = update(d);
      refs.current[Math.min(c.length, 3)]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = d;
    update(arr.join(""));
    if (i < 3) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[i]) arr[i] = "";
      else if (i > 0) { arr[i - 1] = ""; refs.current[i - 1]?.focus(); }
      onChange(arr.join("").slice(0, 4));
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 3) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const c = update(e.clipboardData.getData("text"));
    refs.current[Math.min(c.length, 3)]?.focus();
  };

  return (
    <div className="flex justify-center gap-3" role="group" aria-label="4-digit verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={4}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid}
          className={cn(
            "size-14 rounded-xl border-2 border-input bg-card text-center font-display text-2xl font-bold outline-none transition-colors focus:border-primary sm:size-16",
            invalid && "border-destructive",
          )}
        />
      ))}
    </div>
  );
}
