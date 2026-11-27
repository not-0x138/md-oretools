import { describe, expect, it } from "vitest";
import { DEFAULT_CHEAT_SHEET_TEMPLATES } from "../data/defaultTemplates";
import {
  createBlankCheatSheetEntry,
  filterAndSortHandTraps,
  filterCheatSheetByTier,
  mergeCheatSheetEntries,
  normalizeSearchText,
  parseUniqueListInput,
  searchCheatSheetEntries,
} from "./search";
import {
  type CheatSheetEntry,
  cheatSheetEntrySchema,
  HAND_TRAP_CATALOG,
  type HandTrapMemo,
  type ResolvedCheatSheetEntry,
  STANDARD_HAND_TRAPS,
} from "./types";

function makeEntry(
  overrides: Partial<CheatSheetEntry> & { id: string; themeName: string },
): CheatSheetEntry {
  return {
    aliases: [],
    signatureCards: [],
    summary: "",
    handTraps: [],
    updatedAt: "2026-11-27T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeSearchText", () => {
  it("カタカナをひらがなへ、全角英数を半角小文字へ統一し空白と中黒を除去する", () => {
    expect(normalizeSearchText("スネークアイ")).toBe("すねーくあい");
    expect(normalizeSearchText("すねーくあい")).toBe("すねーくあい");
    expect(normalizeSearchText("スネークアイ・エクセル")).toBe(
      "すねーくあいえくせる",
    );
    expect(normalizeSearchText("Ｂｌｕｅ－Ｅｙｅｓ　青眼")).toBe(
      "blue-eyes青眼",
    );
    expect(normalizeSearchText("ﾎﾟﾌﾟﾙｽ")).toBe("ぽぷるす");
  });
});

describe("mergeCheatSheetEntries", () => {
  it("テンプレート未編集は template、上書き済みは customized、ユーザー新規追加は custom として統合する", () => {
    const templates: CheatSheetEntry[] = [
      makeEntry({
        id: "t1",
        themeName: "スネークアイ",
        tier: "tier5",
        deckType: "展開型",
      }),
      makeEntry({ id: "t2", themeName: "ユベル", tier: "other" }),
    ];
    const overrides: CheatSheetEntry[] = [
      makeEntry({
        id: "t1",
        themeName: "スネークアイ（自分用）",
        summary: "追記メモ",
      }),
      makeEntry({ id: "u1", themeName: "マイオリジナルデッキ" }),
    ];

    const merged = mergeCheatSheetEntries(templates, overrides);

    expect(merged).toHaveLength(3);
    expect(merged.find((e) => e.id === "t1")?.source).toBe("customized");
    expect(merged.find((e) => e.id === "t1")?.summary).toBe("追記メモ");
    expect(merged.find((e) => e.id === "t1")?.tier).toBe("tier5");
    expect(merged.find((e) => e.id === "t1")?.deckType).toBe("展開型");
    expect(merged.find((e) => e.id === "t2")?.source).toBe("template");
    expect(merged.find((e) => e.id === "u1")?.source).toBe("custom");
  });

  it("編集済みエントリに標準誘発枠が不足している場合、テンプレート由来または空枠で自動補完する", () => {
    const template = makeEntry({
      id: "t1",
      themeName: "スネークアイ",
      handTraps: [
        {
          id: "droll",
          label: "ドロール＆ロックバード",
          isStandard: true,
          target: "テンプレート既定ターゲット",
          priority: "high",
        },
        {
          id: "fuwalos",
          label: "マルチャミー・フワロス",
          isStandard: true,
          target: "リンク展開前",
          priority: "high",
        },
      ],
    });
    const oldOverride = makeEntry({
      id: "t1",
      themeName: "スネークアイ",
      handTraps: [
        {
          id: "urara",
          label: "灰流うらら",
          isStandard: true,
          target: "自分用メモ",
          priority: "high",
        },
        {
          id: "custom-1",
          label: "アトラクター",
          isStandard: false,
          target: "初手に投げる",
          priority: "high",
        },
      ],
    });

    const merged = mergeCheatSheetEntries([template], [oldOverride]);
    const traps = merged[0]?.handTraps ?? [];

    expect(traps.find((t) => t.id === "urara")?.target).toBe("自分用メモ");
    expect(traps.find((t) => t.id === "droll")?.target).toBe(
      "テンプレート既定ターゲット",
    );
    expect(traps.find((t) => t.id === "fuwalos")?.target).toBe("リンク展開前");
    expect(traps.filter((t) => t.isStandard)).toHaveLength(
      STANDARD_HAND_TRAPS.length,
    );
    expect(traps.at(-1)?.id).toBe("custom-1");
  });
});

describe("searchCheatSheetEntries", () => {
  const entries: ResolvedCheatSheetEntry[] = [
    {
      ...makeEntry({
        id: "snake-eye",
        themeName: "スネークアイ",
        aliases: ["罪宝", "蛇眼"],
        signatureCards: ["蛇眼の炎燐", "スネークアイ・エクセル"],
      }),
      source: "template",
    },
    {
      ...makeEntry({
        id: "tenpai",
        themeName: "天盃龍",
        aliases: ["てんぱい", "盃満ちる燦幻荘"],
        signatureCards: ["天盃龍パイドラ", "燦幻開門"],
      }),
      source: "template",
    },
  ];

  it("クエリが空のときは全件をそのまま返す", () => {
    const results = searchCheatSheetEntries(entries, "   ");

    expect(results).toHaveLength(2);
    expect(results[0]?.matchedField).toBe("all");
  });

  it("ひらがな入力でカタカナのテーマ名にマッチする", () => {
    const results = searchCheatSheetEntries(entries, "すねーく");

    expect(results).toHaveLength(1);
    expect(results[0]?.entry.id).toBe("snake-eye");
    expect(results[0]?.matchedField).toBe("theme");
  });

  it("別名（エイリアス）から逆引き検索できる", () => {
    const results = searchCheatSheetEntries(entries, "テンパイ");

    expect(results).toHaveLength(1);
    expect(results[0]?.entry.id).toBe("tenpai");
    expect(results[0]?.matchedField).toBe("alias");
  });

  it("中黒を省いたひらがな入力でも代表カード名から逆引き検索できる", () => {
    const results = searchCheatSheetEntries(entries, "すねーくあいえくせる");

    expect(results).toHaveLength(1);
    expect(results[0]?.entry.id).toBe("snake-eye");
    expect(results[0]?.matchedField).toBe("card");
  });

  it("全体メモや誘発ターゲット文言からも検索できる", () => {
    const withMemo: ResolvedCheatSheetEntry[] = [
      {
        ...makeEntry({
          id: "branded",
          themeName: "烙印",
          summary: "烙印融合へのうらら温存が最優先",
        }),
        source: "template",
      },
    ];

    const results = searchCheatSheetEntries(withMemo, "温存");

    expect(results).toHaveLength(1);
    expect(results[0]?.matchedField).toBe("memo");
  });
});

describe("filterCheatSheetByTier", () => {
  const entries: ResolvedCheatSheetEntry[] = [
    {
      ...makeEntry({ id: "1", themeName: "T1", tier: "tier1" }),
      source: "template",
    },
    {
      ...makeEntry({ id: "2", themeName: "T2", tier: "tier2" }),
      source: "template",
    },
    {
      ...makeEntry({ id: "3", themeName: "T3", tier: "tier3" }),
      source: "customized",
    },
    {
      ...makeEntry({ id: "4", themeName: "T4", tier: "tier4" }),
      source: "template",
    },
    {
      ...makeEntry({ id: "5", themeName: "T5", tier: "tier5" }),
      source: "template",
    },
    { ...makeEntry({ id: "6", themeName: "自作" }), source: "custom" },
  ];
  const wrapped = entries.map((entry) => ({
    entry,
    matchedField: "all" as const,
  }));

  it("top 指定時は Tier1 と Tier2 のみを返す", () => {
    const res = filterCheatSheetByTier(wrapped, "top");
    expect(res.map((r) => r.entry.id)).toEqual(["1", "2"]);
  });

  it("custom 指定時は編集済みと自作テーマのみを返す", () => {
    const res = filterCheatSheetByTier(wrapped, "custom");
    expect(res.map((r) => r.entry.id)).toEqual(["3", "6"]);
  });
});

describe("filterAndSortHandTraps", () => {
  const traps: HandTrapMemo[] = [
    {
      id: "a",
      label: "低優先",
      isStandard: true,
      target: "A",
      priority: "low",
    },
    {
      id: "b",
      label: "高優先",
      isStandard: true,
      target: "B",
      priority: "high",
    },
    {
      id: "c",
      label: "中優先",
      isStandard: false,
      target: "C",
      priority: "medium",
    },
  ];

  it("優先度順ソートで high -> medium -> low の順に並べ替える", () => {
    const sorted = filterAndSortHandTraps(traps, { sortByPriority: true });
    expect(sorted.map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("優先高のみ・指定IDフィルタを組み合わせて絞り込める", () => {
    const highOnly = filterAndSortHandTraps(traps, { highPriorityOnly: true });
    expect(highOnly.map((t) => t.id)).toEqual(["b"]);

    const byIds = filterAndSortHandTraps(traps, {
      selectedTrapIds: ["a", "c"],
    });
    expect(byIds.map((t) => t.id)).toEqual(["a", "c"]);
  });
});

describe("parseUniqueListInput", () => {
  it("改行・カンマ・読点で分割し、空文字と重複を除去する", () => {
    expect(parseUniqueListInput("罪宝、蛇眼, 罪宝\n\n炎王 ")).toEqual([
      "罪宝",
      "蛇眼",
      "炎王",
    ]);
  });
});

describe("createBlankCheatSheetEntry と初期テンプレート整合性", () => {
  it("新規テーマ作成時はすべての標準誘発枠を備えた有効なエントリを生成する", () => {
    const entry = createBlankCheatSheetEntry(
      "custom-1",
      "青眼",
      new Date("2026-11-27T12:00:00.000Z"),
    );

    expect(cheatSheetEntrySchema.safeParse(entry).success).toBe(true);
    expect(entry.handTraps).toHaveLength(STANDARD_HAND_TRAPS.length);
  });

  it("同梱されている初期テンプレート全件が Zod スキーマ・重複なしID・全標準誘発枠を満たす", () => {
    expect(DEFAULT_CHEAT_SHEET_TEMPLATES.length).toBeGreaterThanOrEqual(30);
    const seenIds = new Set<string>();
    const standardIds = STANDARD_HAND_TRAPS.map((s) => s.id);

    for (const template of DEFAULT_CHEAT_SHEET_TEMPLATES) {
      expect(cheatSheetEntrySchema.safeParse(template).success).toBe(true);
      expect(seenIds.has(template.id)).toBe(false);
      seenIds.add(template.id);

      // 各テンプレートに標準誘発がすべて含まれること
      const trapIds = new Set(template.handTraps.map((ht) => ht.id));
      for (const sid of standardIds) {
        expect(trapIds.has(sid)).toBe(true);
      }
      expect(template.signatureCards.length).toBeGreaterThanOrEqual(5);
    }

    // 既存6テーマの ID が維持されていること（ユーザー編集データとの後方互換保証）
    for (const legacyId of [
      "tpl-snake-eye",
      "tpl-tenpai",
      "tpl-yubel",
      "tpl-branded",
      "tpl-labrynth",
      "tpl-voiceless",
    ]) {
      expect(seenIds.has(legacyId)).toBe(true);
    }
  });

  it("手札誘発カタログの ID に重複がなく、すべての標準誘発が含まれている", () => {
    const catalogIds = new Set(HAND_TRAP_CATALOG.map((item) => item.id));
    expect(catalogIds.size).toBe(HAND_TRAP_CATALOG.length);
    for (const std of STANDARD_HAND_TRAPS) {
      expect(catalogIds.has(std.id)).toBe(true);
    }
  });
});
