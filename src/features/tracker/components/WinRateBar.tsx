import { cn } from "@/shared/lib/cn";

export function formatPercent(rate: number, total: number): string {
  if (total === 0) {
    return "—";
  }
  return `${(rate * 100).toFixed(1)}%`;
}

interface WinRateBarProps {
  rate: number;
  total: number;
  tone?: "primary" | "emerald" | "amber" | "sky";
  className?: string;
}

const TONE_CLASS: Record<NonNullable<WinRateBarProps["tone"]>, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
};

/** 外部ライブラリを使わない軽量な勝率バー */
export function WinRateBar({
  rate,
  total,
  tone = "primary",
  className,
}: WinRateBarProps) {
  const widthPercent =
    total === 0 ? 0 : Math.min(100, Math.max(0, Math.round(rate * 1000) / 10));

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          TONE_CLASS[tone],
        )}
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
}

interface WinRateRingProps {
  rate: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

/** 全体勝率を視覚化する軽量な自前 SVG ドーナツリング */
export function WinRateRing({
  rate,
  total,
  size = 84,
  strokeWidth = 8,
}: WinRateRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = total === 0 ? 0 : Math.min(1, Math.max(0, rate));
  const offset = circumference * (1 - clamped);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={
          total === 0
            ? "試合データなし"
            : `勝率 ${(clamped * 100).toFixed(1)}パーセント`
        }
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">
        {formatPercent(rate, total)}
      </span>
    </div>
  );
}
