import {
  type CheatSheetEntry,
  type HandTrapMemo,
  type ResolvedCheatSheetEntry,
  type SearchMatchResult,
  STANDARD_HAND_TRAPS,
} from "./types";

const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const HIRAGANA_OFFSET = 0x60;
const IGNORED_SEARCH_CHARS = /[\s・･]/;

/**
 * 検索ゆらぎ（全角/半角、カタカナ/ひらがな、大文字/小文字、空白・中黒の揺れ）を吸収する。
 * NFKC 正規化により半角カタカナ（ﾎﾟﾌﾟﾙｽ）も全角カタカナ経由でひらがなへ統一される。
 */
export function normalizeSearchText(text: string): string {
  const nfkc = text.normalize("NFKC").toLowerCase();
  let normalized = "";
  for (const ch of nfkc) {
    if (IGNORED_SEARCH_CHARS.test(ch)) {
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code >= KATAKANA_START && code <= KATAKANA_END) {
      normalized += String.fromCharCode(code - HIRAGANA_OFFSET);
    } else {
      normalized += ch;
    }
  }
  return normalized;
}

/**
 * 編集済みエントリに後から追加された標準誘発枠が欠けている場合、
 * ユーザー編集内容やテンプレート値を壊さずに不足枠だけを補完する。
 */
function ensureStandardHandTraps(
  entry: CheatSheetEntry,
  template?: CheatSheetEntry,
): HandTrapMemo[] {
  const existingIds = new Set(entry.handTraps.map((ht) => ht.id));
  const templateById = new Map(
    (template?.handTraps ?? []).map((ht) => [ht.id, ht]),
  );

  const missing: HandTrapMemo[] = [];
  for (const def of STANDARD_HAND_TRAPS) {
    if (!existingIds.has(def.id)) {
      const fromTemplate = templateById.get(def.id);
      missing.push(
        fromTemplate
          ? { ...fromTemplate }
          : {
              id: def.id,
              label: def.label,
              isStandard: true,
              target: "",
              priority: "medium",
            },
      );
    }
  }

  if (missing.length === 0) {
    return entry.handTraps;
  }

  const standardExisting = entry.handTraps.filter((ht) => ht.isStandard);
  const customExisting = entry.handTraps.filter((ht) => !ht.isStandard);
  return [...standardExisting, ...missing, ...customExisting];
}

export function mergeCheatSheetEntries(
  templates: readonly CheatSheetEntry[],
  overrides: readonly CheatSheetEntry[],
): ResolvedCheatSheetEntry[] {
  const overrideMap = new Map<string, CheatSheetEntry>();
  for (const item of overrides) {
    overrideMap.set(item.id, item);
  }

  const templateIds = new Set<string>();
  const merged: ResolvedCheatSheetEntry[] = [];

  for (const tpl of templates) {
    templateIds.add(tpl.id);
    const override = overrideMap.get(tpl.id);
    if (override) {
      merged.push({
        ...override,
        handTraps: ensureStandardHandTraps(override, tpl),
        source: "customized",
      });
    } else {
      merged.push({ ...tpl, source: "template" });
    }
  }

  for (const item of overrides) {
    if (!templateIds.has(item.id)) {
      merged.push({
        ...item,
        handTraps: ensureStandardHandTraps(item),
        source: "custom",
      });
    }
  }

  return merged;
}

const MATCH_RANK: Record<SearchMatchResult["matchedField"], number> = {
  all: 0,
  theme: 1,
  alias: 2,
  card: 3,
  memo: 4,
};

export function searchCheatSheetEntries(
  entries: readonly ResolvedCheatSheetEntry[],
  query: string,
): SearchMatchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return entries.map((entry) => ({ entry, matchedField: "all" }));
  }

  const results: SearchMatchResult[] = [];

  for (const entry of entries) {
    if (normalizeSearchText(entry.themeName).includes(normalizedQuery)) {
      results.push({ entry, matchedField: "theme" });
      continue;
    }
    if (
      entry.aliases.some((alias) =>
        normalizeSearchText(alias).includes(normalizedQuery),
      )
    ) {
      results.push({ entry, matchedField: "alias" });
      continue;
    }
    if (
      entry.signatureCards.some((card) =>
        normalizeSearchText(card).includes(normalizedQuery),
      )
    ) {
      results.push({ entry, matchedField: "card" });
      continue;
    }
    const memoMatches =
      normalizeSearchText(entry.summary).includes(normalizedQuery) ||
      entry.handTraps.some(
        (ht) =>
          normalizeSearchText(ht.label).includes(normalizedQuery) ||
          normalizeSearchText(ht.target).includes(normalizedQuery),
      );
    if (memoMatches) {
      results.push({ entry, matchedField: "memo" });
    }
  }

  return results.sort(
    (a, b) => MATCH_RANK[a.matchedField] - MATCH_RANK[b.matchedField],
  );
}

export function parseUniqueListInput(raw: string): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of raw.split(/[\n,、]/)) {
    const trimmed = part.trim();
    if (trimmed.length > 0 && !seen.has(trimmed)) {
      seen.add(trimmed);
      unique.push(trimmed);
    }
  }
  return unique;
}

export function createStandardHandTrapMemos(
  presets: Partial<
    Record<string, { target: string; priority: HandTrapMemo["priority"] }>
  > = {},
): HandTrapMemo[] {
  return STANDARD_HAND_TRAPS.map((def) => {
    const preset = presets[def.id];
    return {
      id: def.id,
      label: def.label,
      isStandard: true,
      target: preset?.target ?? "",
      priority: preset?.priority ?? "medium",
    };
  });
}

export function createBlankCheatSheetEntry(
  id: string,
  themeName: string,
  now: Date = new Date(),
): CheatSheetEntry {
  return {
    id,
    themeName,
    aliases: [],
    signatureCards: [],
    summary: "",
    handTraps: createStandardHandTrapMemos(),
    updatedAt: now.toISOString(),
  };
}
