import { normalizeSearchText } from "./search";
import type { CheatSheetEntry } from "./types";

export type CardSuggestCategory = "handTrap" | "generic" | "theme";

export interface CardSuggestItem {
  /** 確定時に入力される正式カード名 */
  name: string;
  /** ひらがな読みや略称（例: ["はるうらら", "うらら"]） */
  readings: readonly string[];
  /** 候補の分類 */
  category: CardSuggestCategory;
  /** 候補リスト右側に添える補助ラベル（例: "手札誘発" / テーマ名） */
  hint?: string;
}

export interface SuggestCardOptions {
  /** 返却する最大候補数（既定: 8） */
  limit?: number;
  /** 同スコア時に優先して上位表示するカテゴリ */
  preferredCategory?: CardSuggestCategory;
  /** すでに登録済みなどで候補から除外したいカード名 */
  excludeNames?: readonly string[];
}

const DEFAULT_SUGGEST_LIMIT = 8;
const SPLIT_TRAP_PATTERN = /[/／]/;
const PARENTHETICAL_NOTE_PATTERN = /[（(][^）)]*[）)]/g;

/**
 * 静的な読み辞書と、誘発カンペ辞書（テンプレート＋ユーザー編集分）のカード名を統合し、
 * 重複のないサジェスト辞書を構築する。
 */
export function buildCardSuggestDictionary(
  staticItems: readonly CardSuggestItem[],
  entries: readonly CheatSheetEntry[],
): CardSuggestItem[] {
  const byNormalizedName = new Map<string, CardSuggestItem>();

  for (const item of staticItems) {
    const key = normalizeSearchText(item.name);
    if (!key || byNormalizedName.has(key)) {
      continue;
    }
    byNormalizedName.set(key, item);
  }

  for (const entry of entries) {
    for (const cardName of entry.signatureCards) {
      const trimmed = cardName.trim();
      const key = normalizeSearchText(trimmed);
      if (!key) {
        continue;
      }
      const existing = byNormalizedName.get(key);
      if (existing) {
        if (!existing.hint) {
          byNormalizedName.set(key, { ...existing, hint: entry.themeName });
        }
        continue;
      }
      byNormalizedName.set(key, {
        name: trimmed,
        readings: [],
        category: "theme",
        hint: entry.themeName,
      });
    }

    for (const trap of entry.handTraps) {
      for (const rawPart of trap.label.split(SPLIT_TRAP_PATTERN)) {
        const cleaned = rawPart.replace(PARENTHETICAL_NOTE_PATTERN, "").trim();
        const key = normalizeSearchText(cleaned);
        if (!key || byNormalizedName.has(key)) {
          continue;
        }
        byNormalizedName.set(key, {
          name: cleaned,
          readings: [],
          category: "handTrap",
          hint: "手札誘発",
        });
      }
    }
  }

  return [...byNormalizedName.values()];
}

interface ScoredCandidate {
  item: CardSuggestItem;
  matchRank: number;
  categoryRank: number;
}

/**
 * 入力文字列（ひらがな読み・カタカナ・漢字・略称など）からカード名候補を絞り込む。
 * 一致度（完全一致 > 前方一致 > 部分一致）を最優先し、同順位内では優先カテゴリを上位に並べる。
 */
export function suggestCardNames(
  query: string,
  dictionary: readonly CardSuggestItem[],
  options: SuggestCardOptions = {},
): CardSuggestItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const limit = Math.max(1, options.limit ?? DEFAULT_SUGGEST_LIMIT);
  const excludedSet = new Set(
    (options.excludeNames ?? [])
      .map((name) => normalizeSearchText(name))
      .filter((name) => name.length > 0),
  );

  const scored: ScoredCandidate[] = [];

  for (const item of dictionary) {
    const normalizedName = normalizeSearchText(item.name);
    if (!normalizedName || excludedSet.has(normalizedName)) {
      continue;
    }

    const matchRank = computeMatchRank(
      normalizedQuery,
      normalizedName,
      item.readings,
    );
    if (matchRank === null) {
      continue;
    }

    const categoryRank =
      options.preferredCategory && item.category === options.preferredCategory
        ? 0
        : 1;

    scored.push({ item, matchRank, categoryRank });
  }

  scored.sort((a, b) => {
    if (a.matchRank !== b.matchRank) {
      return a.matchRank - b.matchRank;
    }
    if (a.categoryRank !== b.categoryRank) {
      return a.categoryRank - b.categoryRank;
    }
    return a.item.name.length - b.item.name.length;
  });

  return scored.slice(0, limit).map((candidate) => candidate.item);
}

function computeMatchRank(
  normalizedQuery: string,
  normalizedName: string,
  readings: readonly string[],
): number | null {
  let bestRank: number | null = null;

  const updateRank = (candidate: string) => {
    if (!candidate) {
      return;
    }
    if (candidate === normalizedQuery) {
      bestRank = bestRank === null ? 0 : Math.min(bestRank, 0);
    } else if (candidate.startsWith(normalizedQuery)) {
      bestRank = bestRank === null ? 1 : Math.min(bestRank, 1);
    } else if (candidate.includes(normalizedQuery)) {
      bestRank = bestRank === null ? 2 : Math.min(bestRank, 2);
    }
  };

  updateRank(normalizedName);
  for (const reading of readings) {
    updateRank(normalizeSearchText(reading));
  }

  return bestRank;
}
