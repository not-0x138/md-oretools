import { describe, expect, it } from "vitest";
import { CARD_SUGGEST_CATALOG } from "../data/cardSuggestCatalog";
import { DEFAULT_CHEAT_SHEET_TEMPLATES } from "../data/defaultTemplates";
import {
  buildCardSuggestDictionary,
  type CardSuggestItem,
  suggestCardNames,
} from "./cardSuggest";
import type { CheatSheetEntry } from "./types";

describe("buildCardSuggestDictionary", () => {
  it("静的読み辞書とテーマ辞書のカード名を統合し重複を除去する", () => {
    const staticItems: CardSuggestItem[] = [
      {
        name: "灰流うらら",
        readings: ["はるうらら", "うらら"],
        category: "handTrap",
        hint: "手札誘発",
      },
    ];
    const entries: CheatSheetEntry[] = [
      {
        id: "t1",
        themeName: "ライゼオル",
        aliases: [],
        signatureCards: ["エクス・ライゼオル", "ライゼオル・デッドネーダー"],
        summary: "",
        handTraps: [
          {
            id: "urara",
            label: "灰流うらら",
            isStandard: true,
            target: "",
            priority: "high",
          },
          {
            id: "imperm-veiler",
            label: "無限泡影 / エフェクト・ヴェーラー",
            isStandard: true,
            target: "",
            priority: "high",
          },
        ],
        updatedAt: "2026-11-27T00:00:00.000Z",
      },
    ];

    const dict = buildCardSuggestDictionary(staticItems, entries);
    const names = dict.map((item) => item.name);

    expect(names).toContain("灰流うらら");
    expect(names.filter((name) => name === "灰流うらら")).toHaveLength(1);
    expect(names).toContain("エクス・ライゼオル");
    expect(names).toContain("無限泡影");
    expect(names).toContain("エフェクト・ヴェーラー");
  });
});

describe("suggestCardNames", () => {
  const dictionary = buildCardSuggestDictionary(
    CARD_SUGGEST_CATALOG,
    DEFAULT_CHEAT_SHEET_TEMPLATES,
  );

  it("ひらがな読み「はるう」から「灰流うらら」を最上位にサジェストする", () => {
    const results = suggestCardNames("はるう", dictionary);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name).toBe("灰流うらら");
  });

  it("読み略称・カタカナ・中黒なし入力でも該当カードをサジェストする", () => {
    expect(suggestCardNames("はかあな", dictionary)[0]?.name).toBe(
      "墓穴の指名者",
    );
    expect(suggestCardNames("でっどねーだー", dictionary)[0]?.name).toBe(
      "ライゼオル・デッドネーダー",
    );
    expect(suggestCardNames("ぽぷるす", dictionary)[0]?.name).toBe(
      "蛇眼の炎燐",
    );
  });

  it("除外リストに含まれるカードは候補に出さず、空文字のときは空配列を返す", () => {
    expect(suggestCardNames("   ", dictionary)).toEqual([]);

    const withoutUrara = suggestCardNames("はるうらら", dictionary, {
      excludeNames: ["灰流うらら"],
    });
    expect(withoutUrara.some((item) => item.name === "灰流うらら")).toBe(false);
  });

  it("優先カテゴリ指定時は同順位の候補で指定カテゴリを上位に並べる", () => {
    const customDict: CardSuggestItem[] = [
      { name: "テストテーマカード", readings: ["てすと"], category: "theme" },
      { name: "テスト誘発カード", readings: ["てすと"], category: "handTrap" },
    ];

    const handTrapFirst = suggestCardNames("てすと", customDict, {
      preferredCategory: "handTrap",
    });
    expect(handTrapFirst[0]?.name).toBe("テスト誘発カード");

    const themeFirst = suggestCardNames("てすと", customDict, {
      preferredCategory: "theme",
    });
    expect(themeFirst[0]?.name).toBe("テストテーマカード");
  });
});
