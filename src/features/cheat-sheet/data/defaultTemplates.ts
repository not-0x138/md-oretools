import type { CheatSheetEntry } from "../domain/types";
import { CLASSIC_TIER_TEMPLATES } from "./templatesClassicTier";
import { MID_TIER_TEMPLATES } from "./templatesMidTier";
import { TOP_TIER_TEMPLATES } from "./templatesTopTier";

/**
 * 初期同梱の誘発カンペテンプレート（計35テーマ）。
 * 環境上位（Tier 1〜4）を優先して先頭に配置し、既存テーマの id 互換性を維持する。
 */
export const DEFAULT_CHEAT_SHEET_TEMPLATES: readonly CheatSheetEntry[] = [
  ...TOP_TIER_TEMPLATES,
  ...MID_TIER_TEMPLATES,
  ...CLASSIC_TIER_TEMPLATES,
];
