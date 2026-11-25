import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/shared/db/database";
import { createValidatedRepository } from "@/shared/db/repository";
import { DEFAULT_CHEAT_SHEET_TEMPLATES } from "../data/defaultTemplates";
import {
  createBlankCheatSheetEntry,
  mergeCheatSheetEntries,
} from "../domain/search";
import {
  type CheatSheetEntry,
  cheatSheetEntrySchema,
  type ResolvedCheatSheetEntry,
} from "../domain/types";

const overrideRepository = createValidatedRepository(
  db.cheatSheetOverrides,
  cheatSheetEntrySchema,
);

export function useCheatSheetDictionary() {
  const [overrides, setOverrides] = useState<CheatSheetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await overrideRepository.list();
      setOverrides(result.items);
      setCorruptedCount(result.corruptedCount);
      setError(null);
    } catch {
      setError(
        "保存したカンペを読み込めませんでした。初期データのみ表示しています。",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const entries: ResolvedCheatSheetEntry[] = useMemo(
    () => mergeCheatSheetEntries(DEFAULT_CHEAT_SHEET_TEMPLATES, overrides),
    [overrides],
  );

  const saveEntry = useCallback(
    async (entry: CheatSheetEntry) => {
      try {
        const updated: CheatSheetEntry = {
          ...entry,
          updatedAt: new Date().toISOString(),
        };
        const saved = await overrideRepository.save(updated);
        setError(null);
        await refresh();
        return saved;
      } catch {
        setError(
          "カンペを保存できませんでした。入力内容を確認して、もう一度お試しください。",
        );
        return null;
      }
    },
    [refresh],
  );

  const createEntry = useCallback(
    async (themeName: string) => {
      const trimmed = themeName.trim();
      if (!trimmed) {
        return null;
      }
      try {
        const entry = createBlankCheatSheetEntry(
          `custom-${crypto.randomUUID().slice(0, 8)}`,
          trimmed,
        );
        const saved = await overrideRepository.save(entry);
        setError(null);
        await refresh();
        return saved;
      } catch {
        setError("テーマを追加できませんでした。");
        return null;
      }
    },
    [refresh],
  );

  const removeOverride = useCallback(
    async (id: string) => {
      try {
        await overrideRepository.remove(id);
        setError(null);
        await refresh();
        return true;
      } catch {
        setError("削除または初期化できませんでした。");
        return false;
      }
    },
    [refresh],
  );

  return {
    entries,
    isLoading,
    corruptedCount,
    error,
    saveEntry,
    createEntry,
    removeOverride,
  };
}
