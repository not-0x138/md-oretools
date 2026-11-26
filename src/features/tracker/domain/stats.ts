import type {
  CoinSummary,
  DeckStatRow,
  DuelRecord,
  MatchupStatRow,
  PlayerDeck,
  TrackerFilter,
  TrackerStatistics,
  WinLossSummary,
} from "./types";

function normalizeQueryText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60),
    )
    .trim();
}

export function extractYearMonth(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isRankRequiredForSeason(season: string): boolean {
  const normalized = season.normalize("NFKC").trim();
  if (/(^|[^a-z])dc([^a-z]|$)/i.test(normalized)) {
    return false;
  }
  if (normalized.includes("デュエリストカップ")) {
    return false;
  }
  return true;
}

export function sortDuelRecordsByPlayedAtDesc(
  records: readonly DuelRecord[],
): DuelRecord[] {
  return [...records].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

export function extractMonthOptions(records: readonly DuelRecord[]): string[] {
  const sorted = sortDuelRecordsByPlayedAtDesc(records);
  const seen = new Set<string>();
  const months: string[] = [];

  for (const record of sorted) {
    const ym = extractYearMonth(record.playedAt);
    if (ym && !seen.has(ym)) {
      seen.add(ym);
      months.push(ym);
    }
  }

  return months;
}

export function extractSeasonOptions(records: readonly DuelRecord[]): string[] {
  const sorted = sortDuelRecordsByPlayedAtDesc(records);
  const seen = new Set<string>();
  const seasons: string[] = [];

  for (const record of sorted) {
    if (!seen.has(record.season)) {
      seen.add(record.season);
      seasons.push(record.season);
    }
  }

  return seasons;
}

export function filterDuelRecords(
  records: readonly DuelRecord[],
  filter: TrackerFilter,
): DuelRecord[] {
  const normalizedQuery = normalizeQueryText(filter.opponentQuery);

  return records.filter((record) => {
    if (
      filter.month !== "all" &&
      extractYearMonth(record.playedAt) !== filter.month
    ) {
      return false;
    }
    if (filter.season !== "all" && record.season !== filter.season) {
      return false;
    }
    if (
      filter.playerDeckId !== "all" &&
      record.playerDeckId !== filter.playerDeckId
    ) {
      return false;
    }
    if (
      normalizedQuery.length > 0 &&
      !normalizeQueryText(record.opponentDeck).includes(normalizedQuery)
    ) {
      return false;
    }
    return true;
  });
}

export function summarizeWinLoss(
  records: readonly DuelRecord[],
): WinLossSummary {
  const total = records.length;
  if (total === 0) {
    return { total: 0, wins: 0, losses: 0, winRate: 0 };
  }

  let wins = 0;
  for (const record of records) {
    if (record.result === "win") {
      wins += 1;
    }
  }

  return {
    total,
    wins,
    losses: total - wins,
    winRate: wins / total,
  };
}

function summarizeCoin(records: readonly DuelRecord[]): CoinSummary {
  const headsRecords: DuelRecord[] = [];
  const tailsRecords: DuelRecord[] = [];
  let firstWhenHeadsCount = 0;

  for (const record of records) {
    if (record.coinFlip === "heads") {
      headsRecords.push(record);
      if (record.turnOrder === "first") {
        firstWhenHeadsCount += 1;
      }
    } else {
      tailsRecords.push(record);
    }
  }

  const total = records.length;
  const heads = headsRecords.length;
  const tails = tailsRecords.length;

  return {
    total,
    heads,
    tails,
    headsRate: total === 0 ? 0 : heads / total,
    headsWinLoss: summarizeWinLoss(headsRecords),
    tailsWinLoss: summarizeWinLoss(tailsRecords),
    firstWhenHeadsCount,
    firstWhenHeadsRate: heads === 0 ? 0 : firstWhenHeadsCount / heads,
  };
}

function splitTurnOrder(records: readonly DuelRecord[]): {
  first: WinLossSummary;
  second: WinLossSummary;
} {
  const firstRecords: DuelRecord[] = [];
  const secondRecords: DuelRecord[] = [];

  for (const record of records) {
    if (record.turnOrder === "first") {
      firstRecords.push(record);
    } else {
      secondRecords.push(record);
    }
  }

  return {
    first: summarizeWinLoss(firstRecords),
    second: summarizeWinLoss(secondRecords),
  };
}

function compareStatRows(
  a: { overall: WinLossSummary; label: string },
  b: { overall: WinLossSummary; label: string },
): number {
  if (b.overall.total !== a.overall.total) {
    return b.overall.total - a.overall.total;
  }
  if (b.overall.winRate !== a.overall.winRate) {
    return b.overall.winRate - a.overall.winRate;
  }
  return a.label.localeCompare(b.label, "ja");
}

export function calculateTrackerStatistics(
  records: readonly DuelRecord[],
  decks: readonly PlayerDeck[],
): TrackerStatistics {
  const deckMap = new Map<string, PlayerDeck>(
    decks.map((deck) => [deck.id, deck]),
  );

  const byDeckRecords = new Map<string, DuelRecord[]>();
  const byOpponentRecords = new Map<string, DuelRecord[]>();

  for (const record of records) {
    const deckGroup = byDeckRecords.get(record.playerDeckId);
    if (deckGroup) {
      deckGroup.push(record);
    } else {
      byDeckRecords.set(record.playerDeckId, [record]);
    }

    const oppGroup = byOpponentRecords.get(record.opponentDeck);
    if (oppGroup) {
      oppGroup.push(record);
    } else {
      byOpponentRecords.set(record.opponentDeck, [record]);
    }
  }

  const byPlayerDeck: DeckStatRow[] = [];
  for (const [deckId, groupRecords] of byDeckRecords) {
    const registered = deckMap.get(deckId);
    const fallbackName = groupRecords[0]?.playerDeckName ?? "不明なデッキ";
    const { first, second } = splitTurnOrder(groupRecords);
    byPlayerDeck.push({
      id: deckId,
      name: registered ? registered.name : fallbackName,
      archived: registered ? registered.archived : true,
      overall: summarizeWinLoss(groupRecords),
      first,
      second,
    });
  }
  byPlayerDeck.sort((a, b) =>
    compareStatRows(
      { overall: a.overall, label: a.name },
      { overall: b.overall, label: b.name },
    ),
  );

  const byOpponent: MatchupStatRow[] = [];
  for (const [opponentDeck, groupRecords] of byOpponentRecords) {
    const { first, second } = splitTurnOrder(groupRecords);
    byOpponent.push({
      opponentDeck,
      overall: summarizeWinLoss(groupRecords),
      first,
      second,
    });
  }
  byOpponent.sort((a, b) =>
    compareStatRows(
      { overall: a.overall, label: a.opponentDeck },
      { overall: b.overall, label: b.opponentDeck },
    ),
  );

  const { first, second } = splitTurnOrder(records);

  return {
    overall: summarizeWinLoss(records),
    first,
    second,
    coin: summarizeCoin(records),
    byPlayerDeck,
    byOpponent,
  };
}
