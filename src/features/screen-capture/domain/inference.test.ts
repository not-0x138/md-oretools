import { describe, expect, it } from "vitest";
import {
  accumulateInferenceScore,
  createInitialInferenceState,
  isExcludedCardName,
  matchCardNameToThemes,
  normalizeRecognitionText,
} from "./inference";
import {
  DEFAULT_EXCLUDED_GENERIC_CARDS,
  type ThemeDictionaryItem,
} from "./types";

const SAMPLE_DICTIONARY: readonly ThemeDictionaryItem[] = [
  {
    id: "snake-eye",
    themeName: "スネークアイ",
    aliases: ["罪宝", "炎王スネークアイ"],
    signatureCards: [
      "蛇眼の炎鱗",
      "スネークアイ・エクセル",
      "黒魔女ディアベルスター",
      "原罪宝－スネークアイ",
    ],
  },
  {
    id: "yubel",
    themeName: "ユベル",
    aliases: ["ファントムユベル"],
    signatureCards: [
      "ナイトメア・スローン",
      "スピリット・オブ・ユベル",
      "ファントム・オブ・ユベル",
      "サクリファイス・D・ロータス",
    ],
  },
  {
    id: "tenpai",
    themeName: "天盃龍",
    aliases: ["てんぱい"],
    signatureCards: [
      "天盃龍パイドラ",
      "天盃龍チュンドラ",
      "盃満ちる燦幻荘",
      "燦幻開門",
    ],
  },
];

describe("inference（カード名照合と相手デッキ累積類推）", () => {
  it("OCRテキストの空白・記号・全角半角・カタカナひらがなを正規化する", () => {
    expect(normalizeRecognitionText("  スネークアイ・エクセル！ ")).toBe(
      "すねーくあいえくせる",
    );
    expect(normalizeRecognitionText("増殖するＧ")).toBe("増殖するg");
  });

  it("汎用カードや除外リストのカード名をあいまい一致でも除外判定できる", () => {
    expect(
      isExcludedCardName("灰流うらら", DEFAULT_EXCLUDED_GENERIC_CARDS),
    ).toBe(true);
    expect(
      isExcludedCardName("増殖するＧ", DEFAULT_EXCLUDED_GENERIC_CARDS),
    ).toBe(true);
    expect(
      isExcludedCardName("天盃龍パイドラ", DEFAULT_EXCLUDED_GENERIC_CARDS),
    ).toBe(false);
  });

  it("固有カード名のOCR読み取り結果（多少の誤認識あり）から相手テーマを照合できる", () => {
    const match = matchCardNameToThemes({
      rawText: "天盃龍バイドラ",
      ocrConfidence: 82,
      dictionary: SAMPLE_DICTIONARY,
      excludedCards: DEFAULT_EXCLUDED_GENERIC_CARDS,
      minOcrConfidence: 45,
    });

    expect(match).not.toBeNull();
    expect(match?.themeId).toBe("tenpai");
    expect(match?.themeName).toBe("天盃龍");
    expect(match?.scoreDelta).toBeGreaterThan(0.5);
  });

  it("汎用カードまたは自分デッキ除外カードは照合せず null を返す", () => {
    const genericMatch = matchCardNameToThemes({
      rawText: "灰流うらら",
      ocrConfidence: 95,
      dictionary: SAMPLE_DICTIONARY,
      excludedCards: DEFAULT_EXCLUDED_GENERIC_CARDS,
      minOcrConfidence: 45,
    });
    expect(genericMatch).toBeNull();

    const ownDeckMatch = matchCardNameToThemes({
      rawText: "蛇眼の炎鱗",
      ocrConfidence: 95,
      dictionary: SAMPLE_DICTIONARY,
      excludedCards: [...DEFAULT_EXCLUDED_GENERIC_CARDS, "蛇眼の炎鱗"],
      minOcrConfidence: 45,
    });
    expect(ownDeckMatch).toBeNull();
  });

  it("OCR信頼度が下限未満または短すぎるノイズ文字列は照合しない", () => {
    expect(
      matchCardNameToThemes({
        rawText: "天盃龍パイドラ",
        ocrConfidence: 20,
        dictionary: SAMPLE_DICTIONARY,
        excludedCards: [],
        minOcrConfidence: 45,
      }),
    ).toBeNull();

    expect(
      matchCardNameToThemes({
        rawText: "あ",
        ocrConfidence: 90,
        dictionary: SAMPLE_DICTIONARY,
        excludedCards: [],
        minOcrConfidence: 45,
      }),
    ).toBeNull();
  });

  it("累積スコアが閾値を超えた時点で相手テーマを確定し、同一カードの連続フレーム多重加算を防ぐ", () => {
    let state = createInitialInferenceState();

    // 1回目: パイドラ（スコア 0.7）→ 閾値 1.0 未満のため未確定
    state = accumulateInferenceScore(
      state,
      {
        themeId: "tenpai",
        themeName: "天盃龍",
        matchedText: "天盃龍パイドラ",
        matchedKind: "signatureCard",
        similarity: 0.9,
        scoreDelta: 0.7,
      },
      { nowMs: 1000, scoreThreshold: 1.0, cardCooldownMs: 5000 },
    );
    expect(state.detectedThemeId).toBeNull();
    expect(state.scoresByTheme.tenpai?.score).toBeCloseTo(0.7);

    // 2回目: 1秒後に同じパイドラが連続フレームで検出 → クールダウン中のため加算されない
    state = accumulateInferenceScore(
      state,
      {
        themeId: "tenpai",
        themeName: "天盃龍",
        matchedText: "天盃龍パイドラ",
        matchedKind: "signatureCard",
        similarity: 0.9,
        scoreDelta: 0.7,
      },
      { nowMs: 2000, scoreThreshold: 1.0, cardCooldownMs: 5000 },
    );
    expect(state.detectedThemeId).toBeNull();
    expect(state.scoresByTheme.tenpai?.score).toBeCloseTo(0.7);

    // 3回目: 別カード（燦幻開門）が検出 → 累積 1.4 >= 1.0 で天盃龍が確定
    state = accumulateInferenceScore(
      state,
      {
        themeId: "tenpai",
        themeName: "天盃龍",
        matchedText: "燦幻開門",
        matchedKind: "signatureCard",
        similarity: 0.9,
        scoreDelta: 0.7,
      },
      { nowMs: 2500, scoreThreshold: 1.0, cardCooldownMs: 5000 },
    );
    expect(state.detectedThemeId).toBe("tenpai");
    expect(state.detectedThemeName).toBe("天盃龍");
    expect(state.scoresByTheme.tenpai?.matchedCards).toEqual([
      "天盃龍パイドラ",
      "燦幻開門",
    ]);
  });
});
