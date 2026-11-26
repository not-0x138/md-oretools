import { z } from "zod";

export const coinFlipSchema = z.enum(["heads", "tails"]);
export type CoinFlip = z.infer<typeof coinFlipSchema>;

export const turnOrderSchema = z.enum(["first", "second"]);
export type TurnOrder = z.infer<typeof turnOrderSchema>;

export const duelResultSchema = z.enum(["win", "lose"]);
export type DuelResult = z.infer<typeof duelResultSchema>;

export const playerDeckSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  memo: z.string(),
  archived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PlayerDeck = z.infer<typeof playerDeckSchema>;

export const duelRecordSchema = z.object({
  id: z.string().min(1),
  playedAt: z.iso.datetime(),
  season: z.string().trim().min(1),
  rank: z.string().trim(),
  playerDeckId: z.string().min(1),
  playerDeckName: z.string().trim().min(1),
  opponentDeck: z.string().trim().min(1),
  coinFlip: coinFlipSchema,
  turnOrder: turnOrderSchema,
  result: duelResultSchema,
  memo: z.string(),
  updatedAt: z.iso.datetime(),
});
export type DuelRecord = z.infer<typeof duelRecordSchema>;

export interface TrackerFilter {
  month: string;
  season: string;
  playerDeckId: string;
  opponentQuery: string;
}

export interface WinLossSummary {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface CoinSummary {
  total: number;
  heads: number;
  tails: number;
  headsRate: number;
  headsWinLoss: WinLossSummary;
  tailsWinLoss: WinLossSummary;
  firstWhenHeadsCount: number;
  firstWhenHeadsRate: number;
}

export interface DeckStatRow {
  id: string;
  name: string;
  archived: boolean;
  overall: WinLossSummary;
  first: WinLossSummary;
  second: WinLossSummary;
}

export interface MatchupStatRow {
  opponentDeck: string;
  overall: WinLossSummary;
  first: WinLossSummary;
  second: WinLossSummary;
}

export interface TrackerStatistics {
  overall: WinLossSummary;
  first: WinLossSummary;
  second: WinLossSummary;
  coin: CoinSummary;
  byPlayerDeck: DeckStatRow[];
  byOpponent: MatchupStatRow[];
}

export const DEFAULT_SEASON_LABEL = "ランク戦";

export const SEASON_EVENT_PRESETS: readonly string[] = [
  DEFAULT_SEASON_LABEL,
  "DC",
  "シンクロフェス",
  "エクシーズフェス",
  "フュージョンフェス",
  "その他フェス",
  "ルームマッチ",
];

export const RANK_PRESETS: readonly string[] = [
  "マスター1",
  "マスター2",
  "マスター3",
  "マスター4",
  "マスター5",
  "ダイヤ1",
  "ダイヤ2",
  "ダイヤ3",
  "ダイヤ4",
  "ダイヤ5",
  "プラチナ1",
  "プラチナ2",
  "プラチナ3",
  "プラチナ4",
  "プラチナ5",
  "ゴールド",
  "シルバー",
];
