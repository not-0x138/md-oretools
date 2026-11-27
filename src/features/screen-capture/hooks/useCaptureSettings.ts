import { useCallback, useEffect, useState } from "react";
import { db } from "@/shared/db/database";
import { createValidatedRepository } from "@/shared/db/repository";
import {
  type CaptureSettings,
  captureSettingsSchema,
  createDefaultCaptureSettings,
  DEFAULT_CAPTURE_SETTINGS_ID,
} from "../domain/types";

const captureSettingsRepo = createValidatedRepository<CaptureSettings>(
  db.captureSettings,
  captureSettingsSchema,
);

export function useCaptureSettings() {
  const [settings, setSettings] = useState<CaptureSettings>(() =>
    createDefaultCaptureSettings(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stored = await captureSettingsRepo.get(
          DEFAULT_CAPTURE_SETTINGS_ID,
        );
        if (!cancelled && stored) {
          setSettings(stored);
        }
      } catch {
        if (!cancelled) {
          setError(
            "画面読み取りの設定を読み込めませんでした。初期設定で動作します。",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = useCallback(async (next: CaptureSettings) => {
    setError(null);
    const stamped: CaptureSettings = {
      ...next,
      id: DEFAULT_CAPTURE_SETTINGS_ID,
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = await captureSettingsRepo.save(stamped);
      setSettings(saved);
      return true;
    } catch {
      setError(
        "設定を保存できませんでした。入力内容を確認して再度お試しください。",
      );
      return false;
    }
  }, []);

  const resetSettings = useCallback(async () => {
    const defaults = createDefaultCaptureSettings();
    return saveSettings(defaults);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    resetSettings,
  };
}
