import { z } from "zod";

const UI_PREFERENCES_KEY = "md-oretools:ui-preferences:v1";

const sidebarCollapsedSchema = z.boolean();
const activeToolSchema = z.string().min(1);

export const uiPreferencesSchema = z.object({
  sidebarCollapsed: sidebarCollapsedSchema,
  activeTool: activeToolSchema,
});

export type UiPreferences = z.infer<typeof uiPreferencesSchema>;

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  sidebarCollapsed: false,
  activeTool: "simulator",
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadUiPreferences(
  storage: StorageLike | null = getDefaultStorage(),
): UiPreferences {
  if (!storage) {
    return DEFAULT_UI_PREFERENCES;
  }
  try {
    const raw = storage.getItem(UI_PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_UI_PREFERENCES;
    }
    const parsedJson: unknown = JSON.parse(raw);
    const parsedRecord = z
      .record(z.string(), z.unknown())
      .safeParse(parsedJson);
    if (!parsedRecord.success) {
      return DEFAULT_UI_PREFERENCES;
    }
    const record = parsedRecord.data;
    const sidebarParsed = sidebarCollapsedSchema.safeParse(
      record.sidebarCollapsed,
    );
    const activeToolParsed = activeToolSchema.safeParse(record.activeTool);

    // 1フィールドだけ破損しても他の正常な設定を引き継げるよう項目単位でフォールバックする
    return {
      sidebarCollapsed: sidebarParsed.success
        ? sidebarParsed.data
        : DEFAULT_UI_PREFERENCES.sidebarCollapsed,
      activeTool: activeToolParsed.success
        ? activeToolParsed.data
        : DEFAULT_UI_PREFERENCES.activeTool,
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function saveUiPreferences(
  prefs: UiPreferences,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    const validated = uiPreferencesSchema.parse(prefs);
    storage.setItem(UI_PREFERENCES_KEY, JSON.stringify(validated));
  } catch {
    // プライベートブラウジング等で localStorage 書き込みが制限されていても動作を継続する
  }
}
