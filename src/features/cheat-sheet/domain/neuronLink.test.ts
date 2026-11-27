import { describe, expect, it } from "vitest";
import {
  buildNeuronCardDetailUrl,
  buildNeuronCardSearchUrl,
  extractNeuronLinksFromLabel,
  resolveNeuronCardLink,
  tokenizeTextWithCardLinks,
} from "./neuronLink";

describe("buildNeuronCardDetailUrl", () => {
  it("公式カードID（cid）からカード詳細ページの直行URLを生成する", () => {
    const url = new URL(buildNeuronCardDetailUrl(12950));

    expect(url.origin).toBe("https://www.db.yugioh-card.com");
    expect(url.pathname).toBe("/yugiohdb/card_search.action");
    expect(url.searchParams.get("ope")).toBe("2");
    expect(url.searchParams.get("cid")).toBe("12950");
    expect(url.searchParams.get("request_locale")).toBe("ja");
  });
});

describe("buildNeuronCardSearchUrl", () => {
  it("カード名から公式カードデータベース（遊戯王ニューロン）日本語検索URLを生成する", () => {
    const url = new URL(buildNeuronCardSearchUrl("灰流うらら"));

    expect(url.origin).toBe("https://www.db.yugioh-card.com");
    expect(url.pathname).toBe("/yugiohdb/card_search.action");
    expect(url.searchParams.get("ope")).toBe("1");
    expect(url.searchParams.get("sess")).toBe("1");
    expect(url.searchParams.get("stype")).toBe("1");
    expect(url.searchParams.get("keyword")).toBe("灰流うらら");
    expect(url.searchParams.get("request_locale")).toBe("ja");
  });

  it("括弧内の補足表記を除いて検索キーワードを生成する", () => {
    const url = new URL(buildNeuronCardSearchUrl("深淵の獣（ビーステッド）"));

    expect(url.searchParams.get("keyword")).toBe("深淵の獣");
  });
});

describe("resolveNeuronCardLink", () => {
  const cidMap = {
    灰流うらら: 12950,
    無限泡影: 13631,
  };

  it("cidマップに登録済みのカードは詳細ページ（ope=2&cid=...）へ直行する", () => {
    const link = resolveNeuronCardLink("灰流うらら", cidMap);

    expect(link).not.toBeNull();
    expect(link?.isDirectDetail).toBe(true);
    expect(link?.url).toContain("ope=2&cid=12950");
  });

  it("cidマップに未登録のカードはカード名検索ページ（ope=1&keyword=...）へフォールバックする", () => {
    const link = resolveNeuronCardLink("未知のオリジナルカード", cidMap);

    expect(link).not.toBeNull();
    expect(link?.isDirectDetail).toBe(false);
    expect(link?.url).toContain("ope=1");
    expect(link?.url).toContain("keyword=");
  });
});

describe("extractNeuronLinksFromLabel", () => {
  const cidMap = {
    無限泡影: 13631,
    "エフェクト・ヴェーラー": 8933,
  };

  it("スラッシュ区切りの複合誘発ラベルを個別の詳細ページリンクへ分割する", () => {
    const links = extractNeuronLinksFromLabel(
      "無限泡影 / エフェクト・ヴェーラー",
      cidMap,
    );

    expect(links).toHaveLength(2);
    expect(links[0]?.label).toBe("無限泡影");
    expect(links[0]?.isDirectDetail).toBe(true);
    expect(links[0]?.url).toContain("cid=13631");
    expect(links[1]?.label).toBe("エフェクト・ヴェーラー");
    expect(links[1]?.isDirectDetail).toBe(true);
    expect(links[1]?.url).toContain("cid=8933");
  });

  it("全角スラッシュや重複・空白のみのエントリを安全に処理する", () => {
    const links = extractNeuronLinksFromLabel(" 灰流うらら ／ 灰流うらら / ");

    expect(links).toHaveLength(1);
    expect(links[0]?.keyword).toBe("灰流うらら");
    expect(extractNeuronLinksFromLabel("   ")).toEqual([]);
  });
});

describe("tokenizeTextWithCardLinks", () => {
  const cidMap = {
    星辰砲手ファイメナ: 21353,
    星辰槍手ルキアス: 21351,
    羅睺星辰: 21361,
    "スネークアイ・エクセル": 19147,
    "閃刀姫－レイ": 13670,
  };

  it("本文中の登録済みカード名とテーマ内の安全な略称を検出し、公式詳細URLへ紐づける", () => {
    const segments = tokenizeTextWithCardLinks(
      "ルキアスのサーチや羅睺星辰の融合、ファイメナ効果に打つ",
      {
        cidMap,
        signatureCards: ["星辰砲手ファイメナ", "星辰槍手ルキアス", "羅睺星辰"],
      },
    );

    const cards = segments.filter((seg) => seg.type === "card");
    expect(cards.map((c) => c.text)).toEqual([
      "ルキアス",
      "羅睺星辰",
      "ファイメナ",
    ]);
    expect(cards[0]?.link.keyword).toBe("星辰槍手ルキアス");
    expect(cards[0]?.link.url).toContain("cid=21351");
    expect(cards[1]?.link.url).toContain("cid=21361");
    expect(cards[2]?.link.keyword).toBe("星辰砲手ファイメナ");
    expect(cards[2]?.link.url).toContain("cid=21353");
  });

  it("長いカード名を優先して最長一致させ、2文字略称による一般語への誤爆を防ぐ", () => {
    const segments = tokenizeTextWithCardLinks(
      "スネークアイ・エクセル初動へのプレイを止める",
      {
        cidMap,
        signatureCards: ["スネークアイ・エクセル", "閃刀姫－レイ"],
      },
    );

    const cards = segments.filter((seg) => seg.type === "card");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.text).toBe("スネークアイ・エクセル");
    expect(cards[0]?.link.url).toContain("cid=19147");
  });
});
