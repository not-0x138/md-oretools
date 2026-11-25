import { describe, expect, it } from "vitest";
import {
  DEFAULT_UI_PREFERENCES,
  loadUiPreferences,
  type StorageLike,
  saveUiPreferences,
} from "./uiPreferences";

function createMemoryStorage(
  initial: Record<string, string> = {},
): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("uiPreferences", () => {
  it("ストレージが空のときはデフォルトの UI 設定を返す", () => {
    const storage = createMemoryStorage();

    const loaded = loadUiPreferences(storage);

    expect(loaded).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it("保存した UI 設定をそのまま読み戻せる", () => {
    const storage = createMemoryStorage();
    const expected = { sidebarCollapsed: true, activeTool: "cheat-sheet" };

    saveUiPreferences(expected, storage);
    const loaded = loadUiPreferences(storage);

    expect(loaded).toEqual(expected);
  });

  it("壊れた JSON や不正なスキーマが保存されていてもデフォルト値へフォールバックする", () => {
    const brokenJsonStorage = createMemoryStorage({
      "md-oretools:ui-preferences:v1": "{not-valid-json",
    });
    const invalidSchemaStorage = createMemoryStorage({
      "md-oretools:ui-preferences:v1": JSON.stringify({
        sidebarCollapsed: "yes",
        activeTool: "",
      }),
    });

    expect(loadUiPreferences(brokenJsonStorage)).toEqual(
      DEFAULT_UI_PREFERENCES,
    );
    expect(loadUiPreferences(invalidSchemaStorage)).toEqual(
      DEFAULT_UI_PREFERENCES,
    );
  });

  it("一部フィールドだけ不正でも、正常なフィールドの設定は維持される", () => {
    const partialBrokenStorage = createMemoryStorage({
      "md-oretools:ui-preferences:v1": JSON.stringify({
        sidebarCollapsed: true,
        activeTool: "",
      }),
    });

    expect(loadUiPreferences(partialBrokenStorage)).toEqual({
      sidebarCollapsed: true,
      activeTool: DEFAULT_UI_PREFERENCES.activeTool,
    });
  });

  it("ストレージが利用できない環境や setItem が例外を投げる環境でも安全に動作する", () => {
    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    expect(() => saveUiPreferences(DEFAULT_UI_PREFERENCES, null)).not.toThrow();
    expect(() =>
      saveUiPreferences(DEFAULT_UI_PREFERENCES, throwingStorage),
    ).not.toThrow();
    expect(loadUiPreferences(null)).toEqual(DEFAULT_UI_PREFERENCES);
    expect(loadUiPreferences(throwingStorage)).toEqual(DEFAULT_UI_PREFERENCES);
  });
});
