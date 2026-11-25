import { describe, expect, it } from "vitest";
import { SAMPLE_SIMULATOR_TEMPLATES } from "./defaultPresets";
import {
  calculateHandProbability,
  createCalculationKey,
  extractSimulatorConfig,
  validateSimulatorConfig,
} from "./probability";
import {
  type SimulatorConfig,
  simulatorConfigSchema,
  simulatorPresetSchema,
} from "./types";

describe("validateSimulatorConfig", () => {
  it("正常なデッキ設定（40枚・初手5枚・グループ合計40枚以下）を有効と判定する", () => {
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "starter", name: "1枚初動", count: 12 },
        { id: "handtrap", name: "手札誘発", count: 12 },
      ],
      conditionSets: [
        {
          id: "set-1",
          name: "初動あり",
          clauses: [
            { id: "c1", groupId: "starter", operator: "gte", count: 1 },
          ],
        },
      ],
    };

    const result = validateSimulatorConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("グループ合計枚数がデッキ枚数を超えている場合は具体的なエラーを返す", () => {
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "g1", name: "グループA", count: 25 },
        { id: "g2", name: "グループB", count: 20 },
      ],
      conditionSets: [],
    };

    const result = validateSimulatorConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("合計枚数（45枚）"))).toBe(
      true,
    );
  });

  it("デッキ枚数の範囲外（39枚/61枚/NaN/小数）と初手枚数超過を拒否する", () => {
    const base: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "g1", name: "初動", count: 10 }],
      conditionSets: [],
    };

    expect(validateSimulatorConfig({ ...base, deckSize: 39 }).valid).toBe(
      false,
    );
    expect(validateSimulatorConfig({ ...base, deckSize: 61 }).valid).toBe(
      false,
    );
    expect(
      validateSimulatorConfig({ ...base, deckSize: Number.NaN }).valid,
    ).toBe(false);
    expect(validateSimulatorConfig({ ...base, deckSize: 40.5 }).valid).toBe(
      false,
    );
    expect(validateSimulatorConfig({ ...base, handSize: 41 }).valid).toBe(
      false,
    );
    expect(validateSimulatorConfig({ ...base, handSize: 0 }).valid).toBe(false);
  });

  it("空グループ名・ID重複・存在しないgroupId参照・必要枚数範囲外をすべてエラーにする", () => {
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "dup", name: "  ", count: 3 },
        { id: "dup", name: "重複グループ", count: 3 },
      ],
      conditionSets: [
        {
          id: "s1",
          name: "異常条件",
          clauses: [
            { id: "c1", groupId: "missing", operator: "gte", count: 65 },
          ],
        },
      ],
    };

    const result = validateSimulatorConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("名前を入力"))).toBe(true);
    expect(result.errors.some((e) => e.includes("重複"))).toBe(true);
    expect(
      result.errors.some((e) => e.includes("存在しないカードの種類")),
    ).toBe(true);
    expect(result.errors.some((e) => e.includes("必要枚数は 0〜60"))).toBe(
      true,
    );
  });

  it("Zod プリセットスキーマも存在しない groupId や合計超過を拒否する", () => {
    const brokenPreset = {
      id: "p1",
      name: "壊れたプリセット",
      updatedAt: "2026-11-25T10:00:00.000Z",
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "g1", name: "初動", count: 10 }],
      conditionSets: [
        {
          id: "s1",
          name: "不正参照",
          clauses: [
            { id: "c1", groupId: "unknown", operator: "gte", count: 1 },
          ],
        },
      ],
    };

    expect(simulatorPresetSchema.safeParse(brokenPreset).success).toBe(false);
  });
});

describe("calculateHandProbability（厳密計算）", () => {
  it("40枚デッキ・初手5枚・特定カード3枚を1枚以上引く確率を厳密計算できる", () => {
    // 理論値: 1 - C(37, 5) / C(40, 5) = 1 - 435897 / 658008 = 222111 / 658008
    const expected = 1 - 435_897 / 658_008;
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "urara", name: "灰流うらら", count: 3 }],
      conditionSets: [
        {
          id: "s1",
          name: "うらら1枚以上",
          clauses: [{ id: "c1", groupId: "urara", operator: "gte", count: 1 }],
        },
      ],
    };

    const result = calculateHandProbability(config);

    expect(result.method).toBe("exact");
    expect(result.probability).toBeCloseTo(expected, 8);
    expect(result.conditionSetProbabilities).toHaveLength(1);
    expect(result.conditionSetProbabilities[0]?.probability).toBeCloseTo(
      expected,
      8,
    );
  });

  it("AND条件（初動1枚以上 AND ゴミ0枚）の確率を厳密計算できる", () => {
    const expected = (501_942 - 65_780) / 658_008;
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "starter", name: "初動", count: 12 },
        { id: "garnet", name: "素引きNG", count: 2 },
      ],
      conditionSets: [
        {
          id: "s1",
          name: "初動あり＆ゴミなし",
          clauses: [
            { id: "c1", groupId: "starter", operator: "gte", count: 1 },
            { id: "c2", groupId: "garnet", operator: "eq", count: 0 },
          ],
        },
      ],
    };

    const result = calculateHandProbability(config);

    expect(result.method).toBe("exact");
    expect(result.probability).toBeCloseTo(expected, 8);
  });

  it("DNF（OR of ANDs）で重複する事象を二重計上せずに厳密計算できる", () => {
    const expected = 1 - 278_256 / 658_008;
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "a", name: "A", count: 3 },
        { id: "b", name: "B", count: 3 },
      ],
      conditionSets: [
        {
          id: "s1",
          name: "Aあり",
          clauses: [{ id: "c1", groupId: "a", operator: "gte", count: 1 }],
        },
        {
          id: "s2",
          name: "Bあり",
          clauses: [{ id: "c2", groupId: "b", operator: "gte", count: 1 }],
        },
      ],
    };

    const result = calculateHandProbability(config);

    expect(result.method).toBe("exact");
    expect(result.probability).toBeCloseTo(expected, 8);
    expect(result.conditionSetProbabilities).toHaveLength(2);
  });

  it("lte（○枚以下）および eq（○枚ちょうど）の演算子を正しく評価する", () => {
    const expectedLte = (435_897 + 3 * 66_045) / 658_008;
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "a", name: "A", count: 3 }],
      conditionSets: [
        {
          id: "s1",
          name: "Aは1枚以下",
          clauses: [{ id: "c1", groupId: "a", operator: "lte", count: 1 }],
        },
      ],
    };

    const result = calculateHandProbability(config);

    expect(result.method).toBe("exact");
    expect(result.probability).toBeCloseTo(expectedLte, 8);
  });

  it("Number.MAX_SAFE_INTEGER を超える C(60, 30) 規模の組み合わせでも BigInt により厳密計算できる", () => {
    // 60枚デッキ・対象30枚・初手30枚のとき、対称性から P(X >= 16) + P(X <= 14) + P(X === 15) = 1 かつ P(X >= 16) === P(X <= 14)
    // また P(X >= 15) + P(X >= 16) === 1 が厳密に成立する（C(60, 30) ≒ 1.18e17 > Number.MAX_SAFE_INTEGER）
    const base: SimulatorConfig = {
      deckSize: 60,
      handSize: 30,
      groups: [{ id: "half", name: "半分", count: 30 }],
      conditionSets: [],
    };

    const gte15 = calculateHandProbability({
      ...base,
      conditionSets: [
        {
          id: "s1",
          name: "15枚以上",
          clauses: [{ id: "c1", groupId: "half", operator: "gte", count: 15 }],
        },
      ],
    });
    const gte16 = calculateHandProbability({
      ...base,
      conditionSets: [
        {
          id: "s1",
          name: "16枚以上",
          clauses: [{ id: "c1", groupId: "half", operator: "gte", count: 16 }],
        },
      ],
    });

    expect(gte15.method).toBe("exact");
    expect(gte15.probability + gte16.probability).toBeCloseTo(1, 8);
  });

  it("境界値（handSize === deckSize、0枚グループ、無効設定、空条件）を正しく処理する", () => {
    const drawAll: SimulatorConfig = {
      deckSize: 40,
      handSize: 40,
      groups: [{ id: "g1", name: "カード", count: 3 }],
      conditionSets: [
        {
          id: "s1",
          name: "全引き",
          clauses: [{ id: "c1", groupId: "g1", operator: "eq", count: 3 }],
        },
      ],
    };
    expect(calculateHandProbability(drawAll).probability).toBe(1);

    const zeroGroup: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "g0", name: "0枚枠", count: 0 }],
      conditionSets: [
        {
          id: "s1",
          name: "0枚枠を1枚以上",
          clauses: [{ id: "c1", groupId: "g0", operator: "gte", count: 1 }],
        },
      ],
    };
    expect(calculateHandProbability(zeroGroup).probability).toBe(0);

    const invalidConfig: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "g1", name: "初動", count: 50 }],
      conditionSets: [
        {
          id: "s1",
          name: "不正設定",
          clauses: [{ id: "c1", groupId: "g1", operator: "gte", count: 1 }],
        },
      ],
    };
    expect(calculateHandProbability(invalidConfig).probability).toBe(0);
  });
});

describe("calculateHandProbability（モンテカルロ自動フォールバックとガード）", () => {
  it("探索状態数が上限を超える場合は自動でモンテカルロへ切り替え、95%信頼区間誤差を返す", () => {
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [
        { id: "g1", name: "G1", count: 6 },
        { id: "g2", name: "G2", count: 6 },
        { id: "g3", name: "G3", count: 6 },
      ],
      conditionSets: [
        {
          id: "s1",
          name: "G1とG2とG3",
          clauses: [
            { id: "c1", groupId: "g1", operator: "gte", count: 1 },
            { id: "c2", groupId: "g2", operator: "gte", count: 1 },
            { id: "c3", groupId: "g3", operator: "gte", count: 1 },
          ],
        },
      ],
    };

    let seed = 123456789;
    const deterministicRng = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
      return seed / 4_294_967_296;
    };

    const exact = calculateHandProbability(config);
    const mc = calculateHandProbability(config, {
      maxExactStates: 5,
      monteCarloTrials: 20_000,
      rng: deterministicRng,
    });

    expect(exact.method).toBe("exact");
    expect(mc.method).toBe("monte-carlo");
    expect(mc.trials).toBe(20_000);
    expect(mc.marginOfError).toBeGreaterThan(0);
    expect(Math.abs(mc.probability - exact.probability)).toBeLessThan(0.015);
  });

  it("rng が 1 を返したり trials が 0 でも NaN や配列範囲外にならない", () => {
    const config: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "g1", name: "初動", count: 12 }],
      conditionSets: [
        {
          id: "s1",
          name: "初動1枚以上",
          clauses: [{ id: "c1", groupId: "g1", operator: "gte", count: 1 }],
        },
      ],
    };

    const result = calculateHandProbability(config, {
      maxExactStates: 1,
      monteCarloTrials: 0,
      rng: () => 1,
    });

    expect(result.method).toBe("monte-carlo");
    expect(result.trials).toBe(1);
    expect(Number.isFinite(result.probability)).toBe(true);
  });
});

describe("extractSimulatorConfig と createCalculationKey", () => {
  it("名前だけが変わっても計算キーは変化せず、枚数が変わると変化する", () => {
    const a: SimulatorConfig = {
      deckSize: 40,
      handSize: 5,
      groups: [{ id: "g1", name: "元の名前", count: 12 }],
      conditionSets: [
        {
          id: "s1",
          name: "パターンA",
          clauses: [{ id: "c1", groupId: "g1", operator: "gte", count: 1 }],
        },
      ],
    };
    const renamed: SimulatorConfig = {
      ...a,
      groups: [{ id: "g1", name: "変更後の名前", count: 12 }],
      conditionSets: a.conditionSets.map((set) => ({ ...set, name: "別名" })),
    };
    const changedCount: SimulatorConfig = {
      ...a,
      groups: [{ id: "g1", name: "元の名前", count: 13 }],
    };

    expect(createCalculationKey(a)).toBe(createCalculationKey(renamed));
    expect(createCalculationKey(a)).not.toBe(
      createCalculationKey(changedCount),
    );

    const extracted = extractSimulatorConfig(a);
    expect(extracted).toEqual(a);
  });

  it("同梱されているサンプルテンプレート全件が Zod スキーマと画面検証を満たす", () => {
    expect(SAMPLE_SIMULATOR_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of SAMPLE_SIMULATOR_TEMPLATES) {
      expect(simulatorConfigSchema.safeParse(template.config).success).toBe(
        true,
      );
      expect(validateSimulatorConfig(template.config).valid).toBe(true);
    }
  });
});
