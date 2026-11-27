import Fuse from "fuse.js";
import type {
  CardMatchResult,
  InferenceEngineState,
  ThemeDictionaryItem,
  ThemeScoreRecord,
} from "./types";

// 長音記号「ー」はカタカナカード名の識別に必要なため残し、区切り記号・空白のみ除去する
const NOISE_CHARS_PATTERN =
  /[\s・･\-－―_!！?？「」『』()（）【】[\].,、。:：;；/／'"`~～]/g;

/**
 * OCR 出力やカード名辞書のゆらぎ（全角半角・空白・中黒・カタカナ/ひらがな）を正規化する。
 */
export function normalizeRecognitionText(input: string): string {
  const nfkc = input.normalize("NFKC").toLowerCase();
  const stripped = nfkc.replace(NOISE_CHARS_PATTERN, "");
  return stripped.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

/**
 * 汎用カードや自分の使用デッキ登録カードに一致する場合は除外対象として true を返す。
 */
export function isExcludedCardName(
  rawText: string,
  excludedCards: readonly string[],
): boolean {
  const normalized = normalizeRecognitionText(rawText);
  if (normalized.length < 2 || excludedCards.length === 0) {
    return false;
  }

  const normalizedExcluded = excludedCards
    .map((name) => normalizeRecognitionText(name))
    .filter((name) => name.length >= 2);

  if (normalizedExcluded.length === 0) {
    return false;
  }

  for (const excluded of normalizedExcluded) {
    if (normalized === excluded || normalized.includes(excluded)) {
      return true;
    }
  }

  const fuse = new Fuse(normalizedExcluded, {
    includeScore: true,
    threshold: 0.24,
    ignoreLocation: true,
  });
  const top = fuse.search(normalized)[0];
  return top !== undefined && (top.score ?? 1) <= 0.24;
}

interface SearchIndexItem {
  themeId: string;
  themeName: string;
  originalText: string;
  normalizedText: string;
  matchedKind: "signatureCard" | "themeName" | "alias";
}

const KIND_WEIGHT: Record<SearchIndexItem["matchedKind"], number> = {
  signatureCard: 1.0,
  themeName: 0.85,
  alias: 0.75,
};

export interface MatchCardNameParams {
  rawText: string;
  ocrConfidence: number;
  dictionary: readonly ThemeDictionaryItem[];
  excludedCards: readonly string[];
  minOcrConfidence: number;
}

/**
 * カード名エリアの OCR 文字列を辞書（固有カード・テーマ名・別名）とあいまい照合する。
 */
export function matchCardNameToThemes(
  params: MatchCardNameParams,
): CardMatchResult | null {
  if (params.ocrConfidence < params.minOcrConfidence) {
    return null;
  }

  const normalized = normalizeRecognitionText(params.rawText);
  if (normalized.length < 2) {
    return null;
  }

  if (isExcludedCardName(params.rawText, params.excludedCards)) {
    return null;
  }

  const indexItems: SearchIndexItem[] = [];
  for (const theme of params.dictionary) {
    for (const card of theme.signatureCards) {
      const normalizedCard = normalizeRecognitionText(card);
      if (normalizedCard.length >= 2) {
        indexItems.push({
          themeId: theme.id,
          themeName: theme.themeName,
          originalText: card,
          normalizedText: normalizedCard,
          matchedKind: "signatureCard",
        });
      }
    }
    const normalizedTheme = normalizeRecognitionText(theme.themeName);
    if (normalizedTheme.length >= 2) {
      indexItems.push({
        themeId: theme.id,
        themeName: theme.themeName,
        originalText: theme.themeName,
        normalizedText: normalizedTheme,
        matchedKind: "themeName",
      });
    }
    for (const alias of theme.aliases) {
      const normalizedAlias = normalizeRecognitionText(alias);
      if (normalizedAlias.length >= 2) {
        indexItems.push({
          themeId: theme.id,
          themeName: theme.themeName,
          originalText: alias,
          normalizedText: normalizedAlias,
          matchedKind: "alias",
        });
      }
    }
  }

  if (indexItems.length === 0) {
    return null;
  }

  const fuse = new Fuse(indexItems, {
    keys: ["normalizedText"],
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
  });

  const best = fuse.search(normalized)[0];
  if (!best) {
    return null;
  }

  const similarity = Math.max(0, Math.min(1, 1 - (best.score ?? 1)));
  if (similarity < 0.65) {
    return null;
  }

  const confidenceFactor = Math.max(
    0.35,
    Math.min(1, params.ocrConfidence / 100),
  );
  const scoreDelta = Number(
    (
      similarity *
      confidenceFactor *
      KIND_WEIGHT[best.item.matchedKind]
    ).toFixed(3),
  );

  return {
    themeId: best.item.themeId,
    themeName: best.item.themeName,
    matchedText: best.item.originalText,
    matchedKind: best.item.matchedKind,
    similarity,
    scoreDelta,
  };
}

export function createInitialInferenceState(): InferenceEngineState {
  return {
    scoresByTheme: {},
    lastMatchedCardAt: {},
    detectedThemeId: null,
    detectedThemeName: null,
  };
}

export interface AccumulateOptions {
  nowMs: number;
  scoreThreshold: number;
  cardCooldownMs?: number;
}

const DEFAULT_CARD_COOLDOWN_MS = 5000;

/**
 * 照合結果をテーマ別の累積スコアへ加算し、閾値を超えた最有力テーマを判定する。
 * 同じカードが複数フレーム連続で表示され続ける際の多重加算をクールダウンで抑止する。
 */
export function accumulateInferenceScore(
  state: InferenceEngineState,
  match: CardMatchResult,
  options: AccumulateOptions,
): InferenceEngineState {
  const cooldownMs = options.cardCooldownMs ?? DEFAULT_CARD_COOLDOWN_MS;
  const cardKey = `${match.themeId}:${normalizeRecognitionText(match.matchedText)}`;
  const lastAt = state.lastMatchedCardAt[cardKey];

  if (lastAt !== undefined && options.nowMs - lastAt < cooldownMs) {
    return state;
  }

  const existing = state.scoresByTheme[match.themeId];
  const nextMatchedCards = existing
    ? existing.matchedCards.includes(match.matchedText)
      ? existing.matchedCards
      : [...existing.matchedCards, match.matchedText]
    : [match.matchedText];

  const updatedRecord: ThemeScoreRecord = {
    themeId: match.themeId,
    themeName: match.themeName,
    score: Number(((existing?.score ?? 0) + match.scoreDelta).toFixed(3)),
    hitCount: (existing?.hitCount ?? 0) + 1,
    matchedCards: nextMatchedCards,
    lastHitAt: options.nowMs,
  };

  const nextScoresByTheme: Record<string, ThemeScoreRecord> = {
    ...state.scoresByTheme,
    [match.themeId]: updatedRecord,
  };

  let topRecord: ThemeScoreRecord | null = null;
  for (const record of Object.values(nextScoresByTheme)) {
    if (record.score < options.scoreThreshold) {
      continue;
    }
    if (!topRecord || record.score > topRecord.score) {
      topRecord = record;
    }
  }

  return {
    scoresByTheme: nextScoresByTheme,
    lastMatchedCardAt: {
      ...state.lastMatchedCardAt,
      [cardKey]: options.nowMs,
    },
    detectedThemeId: topRecord?.themeId ?? state.detectedThemeId,
    detectedThemeName: topRecord?.themeName ?? state.detectedThemeName,
  };
}
