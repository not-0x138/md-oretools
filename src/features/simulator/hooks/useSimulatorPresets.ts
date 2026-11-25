import { useCallback, useEffect, useState } from "react";
import { db } from "@/shared/db/database";
import { createValidatedRepository } from "@/shared/db/repository";
import { extractSimulatorConfig } from "../domain/probability";
import {
  type SimulatorConfig,
  type SimulatorPreset,
  simulatorPresetSchema,
} from "../domain/types";

const presetRepository = createValidatedRepository(
  db.simulatorPresets,
  simulatorPresetSchema,
);

export function useSimulatorPresets() {
  const [presets, setPresets] = useState<SimulatorPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await presetRepository.list();
      setPresets(result.items);
      setCorruptedCount(result.corruptedCount);
      setError(null);
    } catch {
      setError(
        "保存した設定を読み込めませんでした。プライベートブラウジングやブラウザの容量制限を確認してください。",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreset = useCallback(
    async (name: string, config: SimulatorConfig, existingId?: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }
      try {
        const candidate: SimulatorPreset = {
          ...extractSimulatorConfig(config),
          id: existingId ?? crypto.randomUUID(),
          name: trimmed,
          updatedAt: new Date().toISOString(),
        };
        const parsed = simulatorPresetSchema.safeParse(candidate);
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message ??
              "入力内容を確認して、もう一度保存してください。",
          );
          return null;
        }
        const saved = await presetRepository.save(parsed.data);
        setError(null);
        await refresh();
        return saved;
      } catch {
        setError(
          "設定を保存できませんでした。少し待ってからもう一度お試しください。",
        );
        return null;
      }
    },
    [refresh],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      try {
        await presetRepository.remove(id);
        setError(null);
        await refresh();
      } catch {
        setError("設定を削除できませんでした。");
      }
    },
    [refresh],
  );

  return {
    presets,
    isLoading,
    corruptedCount,
    error,
    savePreset,
    deletePreset,
  };
}
