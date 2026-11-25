import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind クラス名を安全に結合・重複解決するユーティリティ */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
