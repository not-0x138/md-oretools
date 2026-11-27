import { z } from "zod";

export const roiRectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.02).max(1),
  height: z.number().min(0.02).max(1),
});
export type RoiRect = z.infer<typeof roiRectSchema>;

export const roiRegionKeySchema = z.enum([
  "coin",
  "turnOrder",
  "cardName",
  "result",
]);
export type RoiRegionKey = z.infer<typeof roiRegionKeySchema>;

export const captureRoiConfigSchema = z.object({
  coin: roiRectSchema,
  turnOrder: roiRectSchema,
  cardName: roiRectSchema,
  result: roiRectSchema,
});
export type CaptureRoiConfig = z.infer<typeof captureRoiConfigSchema>;

export const captureSettingsSchema = z.object({
  id: z.string().min(1),
  presetName: z.string().trim().min(1),
  rois: captureRoiConfigSchema,
  intervalMs: z.number().int().min(300).max(5000),
  minOcrConfidence: z.number().min(0).max(100),
  scoreThreshold: z.number().min(0.3).max(5),
  excludedCards: z.array(z.string()),
  autoSwitchCheatSheet: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export type CaptureSettings = z.infer<typeof captureSettingsSchema>;

export const DEFAULT_CAPTURE_SETTINGS_ID = "default-capture-settings";

/**
 * マスターデュエル日本語 UI（16:9 解像度：1920x1080 / 2560x1440 等）の実測値に基づく
 * 初期読み取り範囲プリセット。
 * - coin / turnOrder: 画面下寄り中央のメッセージ帯（「先攻・後攻を選択してください」「あなたが先攻です。」等）
 * - cardName: 左上カード詳細パネルのカード名本体行（上部のルビと右端の属性アイコンを除外）
 * - result: デュエルリザルト画面左側の勝敗行（「デュエル勝利」「デュエル敗北」）
 */
export const DEFAULT_16_9_ROIS: CaptureRoiConfig = {
  coin: { x: 0.33, y: 0.632, width: 0.34, height: 0.056 },
  turnOrder: { x: 0.33, y: 0.632, width: 0.34, height: 0.056 },
  cardName: { x: 0.017, y: 0.141, width: 0.172, height: 0.035 },
  result: { x: 0.08, y: 0.385, width: 0.14, height: 0.05 },
};

/**
 * どのデッキにも採用されうる汎用カード群。
 * 相手デッキ自動類推時の誤爆を防ぐため、デフォルトで除外対象にする。
 */
export const DEFAULT_EXCLUDED_GENERIC_CARDS: readonly string[] = [
  "灰流うらら",
  "増殖するG",
  "無限泡影",
  "エフェクト・ヴェーラー",
  "墓穴の指名者",
  "抹殺の指名者",
  "原始生命態ニビル",
  "屋敷わらし",
  "ドロール＆ロックバード",
  "マルチャミー・フワロス",
  "三戦の才",
  "禁じられた一滴",
  "ハーピィの羽根帚",
  "サンダー・ボルト",
  "超融合",
  "幽鬼うさぎ",
  "朔夜しぐれ",
  "ディメンション・アトラクター",
  "霊王の波動",
  "聖王の粉砕",
];

export function createDefaultCaptureSettings(
  now: Date = new Date(),
): CaptureSettings {
  return {
    id: DEFAULT_CAPTURE_SETTINGS_ID,
    presetName: "16:9 標準（日本語UI）",
    rois: {
      coin: { ...DEFAULT_16_9_ROIS.coin },
      turnOrder: { ...DEFAULT_16_9_ROIS.turnOrder },
      cardName: { ...DEFAULT_16_9_ROIS.cardName },
      result: { ...DEFAULT_16_9_ROIS.result },
    },
    intervalMs: 1000,
    minOcrConfidence: 45,
    scoreThreshold: 1.0,
    excludedCards: [...DEFAULT_EXCLUDED_GENERIC_CARDS],
    autoSwitchCheatSheet: true,
    updatedAt: now.toISOString(),
  };
}

/**
 * features 間の直接参照を避けるため、誘発カンペ辞書から受け取る最小限のテーマ情報。
 */
export interface ThemeDictionaryItem {
  id: string;
  themeName: string;
  aliases: readonly string[];
  signatureCards: readonly string[];
}

export type CoinFlipValue = "heads" | "tails";
export type TurnOrderValue = "first" | "second";
export type DuelResultValue = "win" | "lose";

export interface CardMatchResult {
  themeId: string;
  themeName: string;
  matchedText: string;
  matchedKind: "signatureCard" | "themeName" | "alias";
  /** 0.0〜1.0（大きいほど一致度が高い） */
  similarity: number;
  /** OCR 信頼度と一致度から算出した加算スコア */
  scoreDelta: number;
}

export interface ThemeScoreRecord {
  themeId: string;
  themeName: string;
  score: number;
  hitCount: number;
  matchedCards: string[];
  lastHitAt: number;
}

export interface InferenceEngineState {
  scoresByTheme: Record<string, ThemeScoreRecord>;
  lastMatchedCardAt: Record<string, number>;
  detectedThemeId: string | null;
  detectedThemeName: string | null;
}

export interface LiveDuelSession {
  coinFlip: CoinFlipValue | null;
  turnOrder: TurnOrderValue | null;
  opponentDeck: string;
  opponentThemeId: string | null;
  opponentLockedByUser: boolean;
  lastUpdatedAt: string | null;
}

export type LiveSessionEvent =
  | { type: "coin_detected"; coinFlip: CoinFlipValue; at: string }
  | { type: "turn_order_detected"; turnOrder: TurnOrderValue; at: string }
  | {
      type: "opponent_inferred";
      themeId: string;
      themeName: string;
      at: string;
    }
  | {
      type: "opponent_manual_set";
      opponentDeck: string;
      themeId: string | null;
      at: string;
    }
  | { type: "reset_session" };
