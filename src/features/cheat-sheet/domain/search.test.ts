import { describe, expect, it } from "vitest";
import { DEFAULT_CHEAT_SHEET_TEMPLATES } from "../data/defaultTemplates";
import {
  createBlankCheatSheetEntry,
  mergeCheatSheetEntries,
  normalizeSearchText,
  parseUniqueListInput,
  searchCheatSheetEntries,
} from "./search";
import {
  type CheatSheetEntry,
  cheatSheetEntrySchema,
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
    updatedAt: "2026-11-25T00:00:00.000Z",
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
      makeEntry({ id: "t1", themeName: "スネークアイ" }),
      makeEntry({ id: "t2", themeName: "ユベル" }),
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
      new Date("2026-11-25T12:00:00.000Z"),
    );

    expect(cheatSheetEntrySchema.safeParse(entry).success).toBe(true);
    expect(entry.handTraps).toHaveLength(STANDARD_HAND_TRAPS.length);
  });

  it("同梱されている初期テンプレート全件が Zod スキーマを満たす", () => {
    expect(DEFAULT_CHEAT_SHEET_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of DEFAULT_CHEAT_SHEET_TEMPLATES) {
      expect(cheatSheetEntrySchema.safeParse(template).success).toBe(true);
    }
  });
});
