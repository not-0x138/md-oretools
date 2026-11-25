import { z } from "zod";

export interface StandardHandTrapDef {
  id: string;
  label: string;
  shortLabel: string;
}

export const STANDARD_HAND_TRAPS: readonly StandardHandTrapDef[] = [
  { id: "urara", label: "灰流うらら", shortLabel: "うらら" },
  { id: "maxx-c", label: "増殖するG", shortLabel: "増G" },
  {
    id: "imperm-veiler",
    label: "無限泡影 / エフェクト・ヴェーラー",
    shortLabel: "泡影/ヴェーラー",
  },
  { id: "belle", label: "屋敷わらし", shortLabel: "わらし" },
  { id: "nibiru", label: "原始生命態ニビル", shortLabel: "ニビル" },
  { id: "called-by", label: "墓穴の指名者", shortLabel: "墓穴" },
  { id: "droll", label: "ドロール＆ロックバード", shortLabel: "ドロバ" },
];

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
