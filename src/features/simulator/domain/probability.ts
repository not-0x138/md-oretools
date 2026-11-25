import {
  type ComparisonOperator,
  type ConditionSet,
  DEFAULT_EXACT_MAX_STATES,
  DEFAULT_MONTE_CARLO_TRIALS,
  MAX_DECK_SIZE,
  MIN_DECK_SIZE,
  type SimulationResult,
  type SimulatorConfig,
  type ValidationResult,
} from "./types";

export interface CalculateOptions {
  maxExactStates?: number;
  monteCarloTrials?: number;
  rng?: () => number;
}

const RATIO_SCALE = 1_000_000_000n;
const Z_SCORE_95 = 1.96;

/**
 * 60枚デッキでは C(60, 30) ≒ 1.18e17 が Number.MAX_SAFE_INTEGER (9.0e15) を超えるため、
 * 浮動小数点誤差を避けて厳密値を保つ目的で二項係数テーブルは BigInt で事前計算する。
 */
const BINOMIAL_TABLE: readonly (readonly bigint[])[] = (() => {
  const table: bigint[][] = [];
  for (let n = 0; n <= MAX_DECK_SIZE; n += 1) {
    const row: bigint[] = new Array<bigint>(n + 1).fill(0n);
    row[0] = 1n;
    row[n] = 1n;
    for (let k = 1; k < n; k += 1) {
      const prevRow = table[n - 1];
      row[k] = (prevRow?.[k - 1] ?? 0n) + (prevRow?.[k] ?? 0n);
    }
    table.push(row);
  }
  return table;
})();

function combination(n: number, k: number): bigint {
  if (k < 0 || k > n) {
    return 0n;
  }
  return BINOMIAL_TABLE[n]?.[k] ?? 0n;
}

function ratioToNumber(numerator: bigint, denominator: bigint): number {
  if (denominator === 0n) {
    return 0;
  }
  // 整数除算の切り捨て偏りを抑えるため、半分を足して四捨五入してから小数化する
  const scaled = (numerator * RATIO_SCALE + denominator / 2n) / denominator;
  return Number(scaled) / Number(RATIO_SCALE);
}

/** プリセット読込時に id / name / updatedAt が作業中設定へ混入しないよう純粋な設定だけを抽出する */
export function extractSimulatorConfig(
  source: SimulatorConfig,
): SimulatorConfig {
  return {
    deckSize: source.deckSize,
    handSize: source.handSize,
    groups: source.groups.map((g) => ({ ...g })),
    conditionSets: source.conditionSets.map((set) => ({
      id: set.id,
      name: set.name,
      clauses: set.clauses.map((c) => ({ ...c })),
    })),
  };
}

/** グループ名・パターン名など計算に影響しない編集で DFS / モンテカルロが再実行されないための依存キー */
export function createCalculationKey(config: SimulatorConfig): string {
  return JSON.stringify({
    d: config.deckSize,
    h: config.handSize,
    g: config.groups.map((group) => [group.id, group.count]),
    s: config.conditionSets.map((set) => [
      set.id,
      set.clauses.map((c) => [c.groupId, c.operator, c.count]),
    ]),
  });
}

export function validateSimulatorConfig(
  config: SimulatorConfig,
): ValidationResult {
  const errors: string[] = [];

  if (
    !Number.isInteger(config.deckSize) ||
    config.deckSize < MIN_DECK_SIZE ||
    config.deckSize > MAX_DECK_SIZE
  ) {
    errors.push(
      `デッキ枚数は ${MIN_DECK_SIZE}〜${MAX_DECK_SIZE} 枚の整数で指定してください。`,
    );
  }

  if (
    !Number.isInteger(config.handSize) ||
    config.handSize < 1 ||
    config.handSize > config.deckSize
  ) {
    errors.push(
      `初手枚数は 1〜${config.deckSize} 枚の整数で指定してください。`,
    );
  }

  const groupIds = new Set<string>();
  let totalGroupCards = 0;

  for (const group of config.groups) {
    if (!group.name.trim()) {
      errors.push("カードの種類の名前を入力してください。");
    }
    if (groupIds.has(group.id)) {
      errors.push(`カードの種類の ID が重複しています（${group.id}）。`);
    }
    groupIds.add(group.id);

    if (
      !Number.isInteger(group.count) ||
      group.count < 0 ||
      group.count > MAX_DECK_SIZE
    ) {
      errors.push(
        `「${group.name || "名前なし"}」の枚数は 0〜${MAX_DECK_SIZE} の整数で指定してください。`,
      );
    } else {
      totalGroupCards += group.count;
    }
  }

  if (totalGroupCards > config.deckSize) {
    errors.push(
      `カードの合計枚数（${totalGroupCards}枚）がデッキ枚数（${config.deckSize}枚）を超えています。`,
    );
  }

  for (const [index, set] of config.conditionSets.entries()) {
    const label = set.name.trim() || `パターン ${index + 1}`;
    for (const clause of set.clauses) {
      if (!groupIds.has(clause.groupId)) {
        errors.push(`「${label}」に存在しないカードの種類が指定されています。`);
      }
      if (
        !Number.isInteger(clause.count) ||
        clause.count < 0 ||
        clause.count > MAX_DECK_SIZE
      ) {
        errors.push(
          `「${label}」の必要枚数は 0〜${MAX_DECK_SIZE} の整数で指定してください。`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
  };
}

interface CompiledClause {
  groupIndex: number;
  operator: ComparisonOperator;
  count: number;
}

interface CompiledConditionSet {
  id: string;
  clauses: CompiledClause[];
}

interface PreparedProblem {
  deckSize: number;
  handSize: number;
  activeCounts: number[];
  otherCount: number;
  compiledSets: CompiledConditionSet[];
}

function matchesClause(drawn: number, clause: CompiledClause): boolean {
  switch (clause.operator) {
    case "gte":
      return drawn >= clause.count;
    case "lte":
      return drawn <= clause.count;
    case "eq":
      return drawn === clause.count;
  }
}

function matchesConditionSet(
  drawnCounts: readonly number[],
  set: CompiledConditionSet,
): boolean {
  if (set.clauses.length === 0) {
    return false;
  }
  for (const clause of set.clauses) {
    const drawn = drawnCounts[clause.groupIndex] ?? 0;
    if (!matchesClause(drawn, clause)) {
      return false;
    }
  }
  return true;
}

function prepareProblem(config: SimulatorConfig): PreparedProblem {
  const groupCountById = new Map<string, number>();
  for (const group of config.groups) {
    groupCountById.set(group.id, group.count);
  }

  const referencedIds = new Set<string>();
  for (const set of config.conditionSets) {
    for (const clause of set.clauses) {
      if (groupCountById.has(clause.groupId)) {
        referencedIds.add(clause.groupId);
      }
    }
  }

  const activeGroupIds = Array.from(referencedIds);
  const indexById = new Map<string, number>();
  const activeCounts: number[] = [];
  let activeTotal = 0;

  for (const id of activeGroupIds) {
    const count = groupCountById.get(id) ?? 0;
    indexById.set(id, activeCounts.length);
    activeCounts.push(count);
    activeTotal += count;
  }

  const compiledSets: CompiledConditionSet[] = config.conditionSets.map(
    (set: ConditionSet) => ({
      id: set.id,
      clauses: set.clauses
        .filter((clause) => indexById.has(clause.groupId))
        .map((clause) => ({
          groupIndex: indexById.get(clause.groupId) ?? 0,
          operator: clause.operator,
          count: clause.count,
        })),
    }),
  );

  return {
    deckSize: config.deckSize,
    handSize: config.handSize,
    activeCounts,
    otherCount: Math.max(0, config.deckSize - activeTotal),
    compiledSets,
  };
}

function tryExactCalculation(
  problem: PreparedProblem,
  maxExactStates: number,
): SimulationResult | null {
  const { deckSize, handSize, activeCounts, otherCount, compiledSets } =
    problem;
  const totalWays = combination(deckSize, handSize);
  const groupLength = activeCounts.length;
  const drawn = new Array<number>(groupLength).fill(0);
  const setWays = new Array<bigint>(compiledSets.length).fill(0n);
  let unionWays = 0n;
  let visitedStates = 0;
  let aborted = false;

  const remainingCapacitySuffix = new Array<number>(groupLength + 1).fill(0);
  remainingCapacitySuffix[groupLength] = otherCount;
  for (let i = groupLength - 1; i >= 0; i -= 1) {
    remainingCapacitySuffix[i] =
      (remainingCapacitySuffix[i + 1] ?? 0) + (activeCounts[i] ?? 0);
  }

  function dfs(index: number, remainingDraw: number, waysSoFar: bigint): void {
    if (aborted) {
      return;
    }
    visitedStates += 1;
    if (visitedStates > maxExactStates) {
      aborted = true;
      return;
    }

    if (index === groupLength) {
      if (remainingDraw > otherCount) {
        return;
      }
      const totalStateWays = waysSoFar * combination(otherCount, remainingDraw);
      let anyMatched = false;

      for (let s = 0; s < compiledSets.length; s += 1) {
        const set = compiledSets[s];
        if (set && matchesConditionSet(drawn, set)) {
          setWays[s] = (setWays[s] ?? 0n) + totalStateWays;
          anyMatched = true;
        }
      }
      if (anyMatched) {
        unionWays += totalStateWays;
      }
      return;
    }

    const groupCount = activeCounts[index] ?? 0;
    const capacityAfter = remainingCapacitySuffix[index + 1] ?? 0;
    const minTake = Math.max(0, remainingDraw - capacityAfter);
    const maxTake = Math.min(groupCount, remainingDraw);

    for (let take = minTake; take <= maxTake; take += 1) {
      drawn[index] = take;
      dfs(
        index + 1,
        remainingDraw - take,
        waysSoFar * combination(groupCount, take),
      );
      if (aborted) {
        return;
      }
    }
  }

  dfs(0, handSize, 1n);
  if (aborted) {
    return null;
  }

  return {
    probability: ratioToNumber(unionWays, totalWays),
    method: "exact",
    conditionSetProbabilities: compiledSets.map((set, index) => ({
      id: set.id,
      probability: ratioToNumber(setWays[index] ?? 0n, totalWays),
    })),
  };
}

function safeUnitRandom(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1 - Number.EPSILON;
  }
  return value;
}

function runMonteCarloSimulation(
  problem: PreparedProblem,
  rawTrials: number,
  rng: () => number,
): SimulationResult {
  const trials = Math.max(1, Math.floor(rawTrials));
  const { deckSize, handSize, activeCounts, compiledSets } = problem;
  const deck = new Int16Array(deckSize);
  let cursor = 0;

  for (let groupIndex = 0; groupIndex < activeCounts.length; groupIndex += 1) {
    const count = activeCounts[groupIndex] ?? 0;
    for (let c = 0; c < count; c += 1) {
      deck[cursor] = groupIndex;
      cursor += 1;
    }
  }
  while (cursor < deckSize) {
    deck[cursor] = -1;
    cursor += 1;
  }

  const drawn = new Array<number>(activeCounts.length).fill(0);
  const setHits = new Array<number>(compiledSets.length).fill(0);
  let unionHits = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    drawn.fill(0);

    // 先頭 handSize 枚のみ Fisher-Yates 部分シャッフルを行い、高速に非復元抽出する
    for (let i = 0; i < handSize; i += 1) {
      const swapIndex = i + Math.floor(safeUnitRandom(rng) * (deckSize - i));
      const picked = deck[swapIndex] ?? -1;
      deck[swapIndex] = deck[i] ?? -1;
      deck[i] = picked;
      if (picked >= 0) {
        drawn[picked] = (drawn[picked] ?? 0) + 1;
      }
    }

    let anyMatched = false;
    for (let s = 0; s < compiledSets.length; s += 1) {
      const set = compiledSets[s];
      if (set && matchesConditionSet(drawn, set)) {
        setHits[s] = (setHits[s] ?? 0) + 1;
        anyMatched = true;
      }
    }
    if (anyMatched) {
      unionHits += 1;
    }
  }

  const probability = unionHits / trials;
  const marginOfError =
    Z_SCORE_95 * Math.sqrt((probability * (1 - probability)) / trials);

  return {
    probability,
    method: "monte-carlo",
    trials,
    marginOfError,
    conditionSetProbabilities: compiledSets.map((set, index) => ({
      id: set.id,
      probability: (setHits[index] ?? 0) / trials,
    })),
  };
}

export function calculateHandProbability(
  config: SimulatorConfig,
  options: CalculateOptions = {},
): SimulationResult {
  const validation = validateSimulatorConfig(config);
  if (!validation.valid) {
    return {
      probability: 0,
      method: "exact",
      conditionSetProbabilities: config.conditionSets.map((set) => ({
        id: set.id,
        probability: 0,
      })),
    };
  }

  const problem = prepareProblem(config);
  const hasAnyActiveClause = problem.compiledSets.some(
    (set) => set.clauses.length > 0,
  );
  if (!hasAnyActiveClause) {
    return {
      probability: 0,
      method: "exact",
      conditionSetProbabilities: problem.compiledSets.map((set) => ({
        id: set.id,
        probability: 0,
      })),
    };
  }

  const maxExactStates = options.maxExactStates ?? DEFAULT_EXACT_MAX_STATES;
  const exactResult = tryExactCalculation(problem, maxExactStates);
  if (exactResult) {
    return exactResult;
  }

  const trials = options.monteCarloTrials ?? DEFAULT_MONTE_CARLO_TRIALS;
  const rng = options.rng ?? Math.random;
  return runMonteCarloSimulation(problem, trials, rng);
}
