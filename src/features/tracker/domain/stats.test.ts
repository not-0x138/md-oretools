import { describe, expect, it } from "vitest";
import {
  calculateTrackerStatistics,
  extractMonthOptions,
  extractSeasonOptions,
  extractYearMonth,
  filterDuelRecords,
  isRankRequiredForSeason,
  sortDuelRecordsByPlayedAtDesc,
  summarizeWinLoss,
} from "./stats";
import {
  type DuelRecord,
  duelRecordSchema,
  type PlayerDeck,
  playerDeckSchema,
} from "./types";

const sampleDecks: PlayerDeck[] = [
  {
    id: "deck-se",
    name: "スネークアイ",
    memo: "誘発15枚型",
    archived: false,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "deck-tp",
    name: "天盃龍",
    memo: "後攻捲り特化",
    archived: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  },
];

function createRecord(overrides: Partial<DuelRecord> = {}): DuelRecord {
  return {
    id: "rec-1",
    playedAt: "2026-11-25T10:00:00.000Z",
    season: "2026-11 ランク戦",
    rank: "マスター3",
    playerDeckId: "deck-se",
    playerDeckName: "スネークアイ",
    opponentDeck: "天盃龍",
    coinFlip: "heads",
    turnOrder: "first",
    result: "win",
    memo: "",
    updatedAt: "2026-11-25T10:00:00.000Z",
    ...overrides,
  };
}

describe("tracker domain schemas", () => {
  it("有効な自分のデッキと対戦ログを検証できる", () => {
    expect(playerDeckSchema.safeParse(sampleDecks[0]).success).toBe(true);
    expect(duelRecordSchema.safeParse(createRecord()).success).toBe(true);
  });

  it("デッキ名や相手デッキ名が空白のみの場合は拒否する", () => {
    expect(
      playerDeckSchema.safeParse({ ...sampleDecks[0], name: "   " }).success,
    ).toBe(false);
    expect(
      duelRecordSchema.safeParse(createRecord({ opponentDeck: " " })).success,
    ).toBe(false);
  });
});

describe("extractYearMonth & extractMonthOptions", () => {
  it("対戦日時から年月(YYYY-MM)を抽出し、不正な日時は null を返す", () => {
    expect(extractYearMonth("2026-01-15T12:00:00.000Z")).toBe("2026-01");
    expect(extractYearMonth("invalid-date")).toBeNull();
  });

  it("対戦ログから月一覧を重複なく新しい順で抽出する", () => {
    const records: DuelRecord[] = [
      createRecord({ id: "r1", playedAt: "2026-10-10T10:00:00.000Z" }),
      createRecord({ id: "r2", playedAt: "2026-11-25T12:00:00.000Z" }),
      createRecord({ id: "r3", playedAt: "2026-11-10T09:00:00.000Z" }),
      createRecord({ id: "r4", playedAt: "2026-09-15T09:00:00.000Z" }),
    ];

    expect(extractMonthOptions(records)).toEqual([
      "2026-11",
      "2026-10",
      "2026-09",
    ]);
  });
});

describe("isRankRequiredForSeason", () => {
  it("ランク戦や通常のイベントではランク帯を必須と判定する", () => {
    expect(isRankRequiredForSeason("ランク戦")).toBe(true);
    expect(isRankRequiredForSeason("フェス")).toBe(true);
  });

  it("DCやデュエリストカップではランク帯の入力を不要と判定する", () => {
    expect(isRankRequiredForSeason("DC")).toBe(false);
    expect(isRankRequiredForSeason("2026-12 dc")).toBe(false);
    expect(isRankRequiredForSeason("ＤＣ 1st")).toBe(false);
    expect(isRankRequiredForSeason("2026-12 デュエリストカップ")).toBe(false);
  });
});

describe("extractSeasonOptions & sortDuelRecordsByPlayedAtDesc", () => {
  it("対戦ログからシーズン一覧を重複なく新しい対戦順で抽出する", () => {
    const records: DuelRecord[] = [
      createRecord({
        id: "r1",
        playedAt: "2026-10-10T10:00:00.000Z",
        season: "2026-10 ランク戦",
      }),
      createRecord({
        id: "r2",
        playedAt: "2026-11-25T12:00:00.000Z",
        season: "2026-11 ランク戦",
      }),
      createRecord({
        id: "r3",
        playedAt: "2026-11-20T09:00:00.000Z",
        season: "DC",
      }),
      createRecord({
        id: "r4",
        playedAt: "2026-11-24T09:00:00.000Z",
        season: "2026-11 ランク戦",
      }),
    ];

    expect(extractSeasonOptions(records)).toEqual([
      "2026-11 ランク戦",
      "DC",
      "2026-10 ランク戦",
    ]);

    const sorted = sortDuelRecordsByPlayedAtDesc(records);
    expect(sorted.map((r) => r.id)).toEqual(["r2", "r4", "r3", "r1"]);
  });
});

describe("filterDuelRecords", () => {
  it("月・モード・使用デッキ・相手デッキ（カナや全角半角ゆらぎ含む）で絞り込める", () => {
    const records: DuelRecord[] = [
      createRecord({
        id: "r1",
        playedAt: "2026-11-25T10:00:00.000Z",
        season: "ランク戦",
        playerDeckId: "deck-se",
        opponentDeck: "スネークアイ",
      }),
      createRecord({
        id: "r2",
        playedAt: "2026-11-20T10:00:00.000Z",
        season: "DC",
        playerDeckId: "deck-se",
        opponentDeck: "天盃龍",
      }),
      createRecord({
        id: "r3",
        playedAt: "2026-10-15T10:00:00.000Z",
        season: "ランク戦",
        playerDeckId: "deck-tp",
        opponentDeck: "Ｒ－ＡＣＥ",
      }),
    ];

    expect(
      filterDuelRecords(records, {
        month: "2026-11",
        season: "ランク戦",
        playerDeckId: "all",
        opponentQuery: "すねーく",
      }).map((r) => r.id),
    ).toEqual(["r1"]);

    expect(
      filterDuelRecords(records, {
        month: "2026-10",
        season: "all",
        playerDeckId: "deck-tp",
        opponentQuery: "r-ace",
      }).map((r) => r.id),
    ).toEqual(["r3"]);
  });
});

describe("summarizeWinLoss", () => {
  it("0件のときはすべて 0 を返す", () => {
    expect(summarizeWinLoss([])).toEqual({
      total: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    });
  });

  it("勝数・敗数・勝率を正確に算出する", () => {
    const records = [
      createRecord({ id: "1", result: "win" }),
      createRecord({ id: "2", result: "win" }),
      createRecord({ id: "3", result: "lose" }),
      createRecord({ id: "4", result: "win" }),
    ];

    expect(summarizeWinLoss(records)).toEqual({
      total: 4,
      wins: 3,
      losses: 1,
      winRate: 0.75,
    });
  });
});

describe("calculateTrackerStatistics", () => {
  it("先攻/後攻別・コイントス別（コイン表後攻選択含む）・自分デッキ別・対面別を集計する", () => {
    const records: DuelRecord[] = [
      // コイン表・先攻・勝ち（スネークアイ vs 天盃龍）
      createRecord({
        id: "r1",
        playerDeckId: "deck-se",
        playerDeckName: "旧スネークアイ",
        opponentDeck: "天盃龍",
        coinFlip: "heads",
        turnOrder: "first",
        result: "win",
      }),
      // コイン裏・後攻・負け（スネークアイ vs 天盃龍）
      createRecord({
        id: "r2",
        playerDeckId: "deck-se",
        playerDeckName: "スネークアイ",
        opponentDeck: "天盃龍",
        coinFlip: "tails",
        turnOrder: "second",
        result: "lose",
      }),
      // コイン表・後攻選択・勝ち（天盃龍 vs ユベル）
      createRecord({
        id: "r3",
        playerDeckId: "deck-tp",
        playerDeckName: "天盃龍",
        opponentDeck: "ユベル",
        coinFlip: "heads",
        turnOrder: "second",
        result: "win",
      }),
      // 未登録デッキ（削除済み想定）の記録も集計から落とさない
      createRecord({
        id: "r4",
        playerDeckId: "deck-removed",
        playerDeckName: "粛声",
        opponentDeck: "ユベル",
        coinFlip: "tails",
        turnOrder: "first",
        result: "lose",
      }),
    ];

    const stats = calculateTrackerStatistics(records, sampleDecks);

    expect(stats.overall).toEqual({
      total: 4,
      wins: 2,
      losses: 2,
      winRate: 0.5,
    });
    expect(stats.first).toEqual({
      total: 2,
      wins: 1,
      losses: 1,
      winRate: 0.5,
    });
    expect(stats.second).toEqual({
      total: 2,
      wins: 1,
      losses: 1,
      winRate: 0.5,
    });

    expect(stats.coin.total).toBe(4);
    expect(stats.coin.heads).toBe(2);
    expect(stats.coin.tails).toBe(2);
    expect(stats.coin.headsRate).toBe(0.5);
    expect(stats.coin.headsWinLoss.winRate).toBe(1);
    expect(stats.coin.tailsWinLoss.winRate).toBe(0);
    // コイン表 2 回のうち先攻を取ったのは 1 回（天盃龍で後攻選択した 1 回があるため 50%）
    expect(stats.coin.firstWhenHeadsCount).toBe(1);
    expect(stats.coin.firstWhenHeadsRate).toBe(0.5);

    // 自分デッキ別: スネークアイ（2戦）が先頭、最新名「スネークアイ」が反映される
    expect(stats.byPlayerDeck).toHaveLength(3);
    expect(stats.byPlayerDeck[0]?.id).toBe("deck-se");
    expect(stats.byPlayerDeck[0]?.name).toBe("スネークアイ");
    expect(stats.byPlayerDeck[0]?.archived).toBe(false);
    expect(stats.byPlayerDeck[0]?.overall.total).toBe(2);

    // アーカイブ済み・未登録デッキも保持される
    const tpRow = stats.byPlayerDeck.find((row) => row.id === "deck-tp");
    expect(tpRow?.archived).toBe(true);
    expect(tpRow?.second.winRate).toBe(1);

    const removedRow = stats.byPlayerDeck.find(
      (row) => row.id === "deck-removed",
    );
    expect(removedRow?.name).toBe("粛声");
    expect(removedRow?.archived).toBe(true);

    // 対面別: 試合数 2 の「ユベル」「天盃龍」が集計されている
    expect(stats.byOpponent).toHaveLength(2);
    const tenpaiMatchup = stats.byOpponent.find(
      (m) => m.opponentDeck === "天盃龍",
    );
    expect(tenpaiMatchup?.overall.winRate).toBe(0.5);
    expect(tenpaiMatchup?.first.winRate).toBe(1);
    expect(tenpaiMatchup?.second.winRate).toBe(0);
  });
});
