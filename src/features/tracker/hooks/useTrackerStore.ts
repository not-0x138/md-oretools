import { useCallback, useEffect, useState } from "react";
import { db } from "@/shared/db/database";
import { createValidatedRepository } from "@/shared/db/repository";
import {
  type CoinFlip,
  type DuelRecord,
  type DuelResult,
  duelRecordSchema,
  type PlayerDeck,
  playerDeckSchema,
  type TurnOrder,
} from "../domain/types";

const playerDeckRepository = createValidatedRepository(
  db.playerDecks,
  playerDeckSchema,
);

const duelRecordRepository = createValidatedRepository(
  db.duelRecords,
  duelRecordSchema,
);

export interface SaveDuelRecordInput {
  playedAt: string;
  season: string;
  rank: string;
  playerDeckId: string;
  playerDeckName: string;
  opponentDeck: string;
  coinFlip: CoinFlip;
  turnOrder: TurnOrder;
  result: DuelResult;
  memo: string;
}

export function useTrackerStore() {
  const [decks, setDecks] = useState<PlayerDeck[]>([]);
  const [records, setRecords] = useState<DuelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [deckRes, recordRes] = await Promise.all([
        playerDeckRepository.list(),
        duelRecordRepository.list(),
      ]);
      setDecks(deckRes.items);
      setRecords(recordRes.items);
      setCorruptedCount(deckRes.corruptedCount + recordRes.corruptedCount);
      setError(null);
    } catch {
      setError(
        "保存した戦績データを読み込めませんでした。ブラウザの容量制限やプライベートモードを確認してください。",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addDeck = useCallback(
    async (name: string, memo = "") => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }
      try {
        const now = new Date().toISOString();
        const candidate: PlayerDeck = {
          id: `deck-${crypto.randomUUID().slice(0, 8)}`,
          name: trimmed,
          memo: memo.trim(),
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        const saved = await playerDeckRepository.save(candidate);
        setError(null);
        await refresh();
        return saved;
      } catch {
        setError("デッキを登録できませんでした。入力内容を確認してください。");
        return null;
      }
    },
    [refresh],
  );

  const updateDeck = useCallback(
    async (deck: PlayerDeck) => {
      try {
        const saved = await playerDeckRepository.save({
          ...deck,
          name: deck.name.trim(),
          memo: deck.memo.trim(),
          updatedAt: new Date().toISOString(),
        });
        setError(null);
        await refresh();
        return saved;
      } catch {
        setError("デッキを更新できませんでした。入力内容を確認してください。");
        return null;
      }
    },
    [refresh],
  );

  const toggleArchiveDeck = useCallback(
    async (deck: PlayerDeck) => {
      return updateDeck({ ...deck, archived: !deck.archived });
    },
    [updateDeck],
  );

  const deleteDeck = useCallback(
    async (id: string) => {
      try {
        await playerDeckRepository.remove(id);
        setError(null);
        await refresh();
        return true;
      } catch {
        setError("デッキを削除できませんでした。");
        return false;
      }
    },
    [refresh],
  );

  const saveRecord = useCallback(
    async (input: SaveDuelRecordInput, existingId?: string) => {
      try {
        const now = new Date().toISOString();
        const candidate: DuelRecord = {
          id: existingId ?? `duel-${crypto.randomUUID().slice(0, 8)}`,
          playedAt: input.playedAt,
          season: input.season.trim(),
          rank: input.rank.trim(),
          playerDeckId: input.playerDeckId,
          playerDeckName: input.playerDeckName.trim(),
          opponentDeck: input.opponentDeck.trim(),
          coinFlip: input.coinFlip,
          turnOrder: input.turnOrder,
          result: input.result,
          memo: input.memo.trim(),
          updatedAt: now,
        };
        const parsed = duelRecordSchema.safeParse(candidate);
        if (!parsed.success) {
          setError(
            "入力内容が不足しています。シーズン・自分デッキ・相手デッキを確認してください。",
          );
          return null;
        }
        const saved = await duelRecordRepository.save(parsed.data);
        setError(null);
        await refresh();
        return saved;
      } catch {
        setError("対戦ログを保存できませんでした。もう一度お試しください。");
        return null;
      }
    },
    [refresh],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      try {
        await duelRecordRepository.remove(id);
        setError(null);
        await refresh();
        return true;
      } catch {
        setError("対戦ログを削除できませんでした。");
        return false;
      }
    },
    [refresh],
  );

  return {
    decks,
    records,
    isLoading,
    corruptedCount,
    error,
    addDeck,
    updateDeck,
    toggleArchiveDeck,
    deleteDeck,
    saveRecord,
    deleteRecord,
    refresh,
  };
}
