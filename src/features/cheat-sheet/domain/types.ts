import { z } from "zod";

export interface StandardHandTrapDef {
  id: string;
  label: string;
  shortLabel: string;
}

export type HandTrapTier = "SS" | "S" | "A" | "B" | "meta";

export interface HandTrapCatalogItem extends StandardHandTrapDef {
  tier: HandTrapTier;
  role: string;
  isStandard: boolean;
}

/**
 * 全テーマに標準枠として表示する主要手札誘発（9種・現行リミットレギュレーション準拠）。
 * 既存ユーザーの編集データ互換性を保つため、既存の id は変更しない。
 */
export const STANDARD_HAND_TRAPS: readonly StandardHandTrapDef[] = [
  { id: "urara", label: "灰流うらら", shortLabel: "うらら" },
  { id: "maxx-c", label: "増殖するG", shortLabel: "増G" },
  { id: "fuwalos", label: "マルチャミー・フワロス", shortLabel: "フワロス" },
  {
    id: "imperm-veiler",
    label: "無限泡影 / エフェクト・ヴェーラー",
    shortLabel: "泡影/ヴェーラー",
  },
  { id: "impulse", label: "霊王の波動", shortLabel: "インパルス" },
  { id: "ogre", label: "幽鬼うさぎ", shortLabel: "うさぎ" },
  { id: "belle", label: "屋敷わらし", shortLabel: "わらし" },
  { id: "nibiru", label: "原始生命態ニビル", shortLabel: "ニビル" },
  { id: "droll", label: "ドロール＆ロックバード", shortLabel: "ドロバ" },
];

export const cheatSheetTierSchema = z.enum([
  "tier1",
  "tier2",
  "tier3",
  "tier4",
  "tier5",
  "other",
]);
export type CheatSheetTier = z.infer<typeof cheatSheetTierSchema>;

export const CHEAT_SHEET_TIER_LABEL: Record<CheatSheetTier, string> = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
  tier4: "Tier 4",
  tier5: "Tier 5",
  other: "その他",
};

export const handTrapPrioritySchema = z.enum(["high", "medium", "low"]);
export type HandTrapPriority = z.infer<typeof handTrapPrioritySchema>;

export const handTrapMemoSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isStandard: z.boolean(),
  target: z.string(),
  priority: handTrapPrioritySchema,
});
export type HandTrapMemo = z.infer<typeof handTrapMemoSchema>;

export const cheatSheetEntrySchema = z.object({
  id: z.string().min(1),
  themeName: z.string().min(1),
  aliases: z.array(z.string()),
  signatureCards: z.array(z.string()),
  summary: z.string(),
  handTraps: z.array(handTrapMemoSchema),
  tier: cheatSheetTierSchema.optional(),
  deckType: z.string().optional(),
  summonMethods: z.array(z.string()).optional(),
  updatedAt: z.iso.datetime(),
});
export type CheatSheetEntry = z.infer<typeof cheatSheetEntrySchema>;

export type EntrySource = "template" | "customized" | "custom";

export interface ResolvedCheatSheetEntry extends CheatSheetEntry {
  source: EntrySource;
}

export interface SearchMatchResult {
  entry: ResolvedCheatSheetEntry;
  matchedField: "all" | "theme" | "alias" | "card" | "memo";
}

export type TierFilterValue =
  | "all"
  | "top"
  | "tier3"
  | "tier4"
  | "tier5"
  | "custom";
