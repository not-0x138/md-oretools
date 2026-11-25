import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";

export interface NumberInputProps {
  id?: string;
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * 数値入力用コンポーネント。
 * - `type="number"` の標準挙動ではキーボード途中入力（例: "45" の "4"）が即座にクランプされたり、
 *   フォーカス中のホイール操作でページ全体も同時にスクロールしてしまうため、`inputMode="numeric"` と
 *   非 passive の wheel リスナーで入力体験を制御する。
 */
export function NumberInput({
  id,
  value,
  min,
  max,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      if (document.activeElement !== el) {
        return;
      }
      // フォーカス中のホイール操作で枚数だけを増減させ、画面スクロールを発生させない
      event.preventDefault();
      if (event.deltaY === 0) {
        return;
      }
      const delta = event.deltaY < 0 ? 1 : -1;
      const next = Math.min(max, Math.max(min, value + delta));
      if (next !== value) {
        onValueChange(next);
        setDraft(String(next));
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [value, min, max, onValueChange]);

  const handleChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    setDraft(digitsOnly);
    if (digitsOnly === "") {
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isInteger(parsed) && parsed >= min && parsed <= max) {
      onValueChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (draft === "") {
      setDraft(String(value));
      return;
    }
    const parsed = Number.parseInt(draft, 10);
    if (!Number.isInteger(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    onValueChange(clamped);
    setDraft(String(clamped));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.min(max, value + 1);
      onValueChange(next);
      setDraft(String(next));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = Math.max(min, value - 1);
      onValueChange(next);
      setDraft(String(next));
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}
