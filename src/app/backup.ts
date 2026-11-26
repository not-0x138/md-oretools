import { z } from "zod";
import {
  type CheatSheetEntry,
  cheatSheetEntrySchema,
} from "@/features/cheat-sheet";
import {
  type CaptureSettings,
  captureSettingsSchema,
} from "@/features/screen-capture";
import {
  type SimulatorPreset,
  simulatorPresetSchema,
} from "@/features/simulator";
import {
  type DuelRecord,
  duelRecordSchema,
  type PlayerDeck,
  playerDeckSchema,
} from "@/features/tracker";
import { db } from "@/shared/db/database";
import {
  createValidatedRepository,
  type StoredRecordTable,
} from "@/shared/db/repository";
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  createBackupEnvelope,
  createBackupSchema,
} from "@/shared/schemas/backup";

export const appBackupPayloadSchema = z.object({
  simulatorPresets: z.array(simulatorPresetSchema).default([]),
  cheatSheetOverrides: z.array(cheatSheetEntrySchema).default([]),
  playerDecks: z.array(playerDeckSchema).default([]),
  duelRecords: z.array(duelRecordSchema).default([]),
  captureSettings: z.array(captureSettingsSchema).default([]),
});
export type AppBackupPayload = z.infer<typeof appBackupPayloadSchema>;

export const appBackupSchema = createBackupSchema(appBackupPayloadSchema);
export type AppBackup = z.infer<typeof appBackupSchema>;

export type BackupImportMode = "merge" | "replace";

export interface BackupCounts {
  simulatorPresets: number;
  cheatSheetOverrides: number;
  playerDecks: number;
  duelRecords: number;
  captureSettings: number;
}

export type ParseBackupResult =
  | { ok: true; backup: AppBackup }
  | { ok: false; error: string };

export interface AppBackupTables {
  simulatorPresets: StoredRecordTable;
  cheatSheetOverrides: StoredRecordTable;
  playerDecks: StoredRecordTable;
  duelRecords: StoredRecordTable;
  captureSettings: StoredRecordTable;
}

function getDefaultTables(): AppBackupTables {
  return {
    simulatorPresets: db.simulatorPresets,
    cheatSheetOverrides: db.cheatSheetOverrides,
    playerDecks: db.playerDecks,
    duelRecords: db.duelRecords,
    captureSettings: db.captureSettings,
  };
}

export function buildAppBackup(
  data: AppBackupPayload,
  now: Date = new Date(),
): AppBackup {
  return {
    ...createBackupEnvelope(now),
    data,
  };
}

export function createBackupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `md-oretools-backup-${y}-${m}-${d}.json`;
}

export function countBackupItems(data: AppBackupPayload): BackupCounts {
  return {
    simulatorPresets: data.simulatorPresets.length,
    cheatSheetOverrides: data.cheatSheetOverrides.length,
    playerDecks: data.playerDecks.length,
    duelRecords: data.duelRecords.length,
    captureSettings: data.captureSettings.length,
  };
}

export function parseAppBackupJson(rawText: string): ParseBackupResult {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error:
        "読み込めない形式のファイルです。md-oretools で保存したバックアップファイル（JSON）を選択してください。",
    };
  }

  if (
    typeof rawJson === "object" &&
    rawJson !== null &&
    "schemaVersion" in rawJson &&
    typeof rawJson.schemaVersion === "number" &&
    rawJson.schemaVersion > CURRENT_BACKUP_SCHEMA_VERSION
  ) {
    return {
      ok: false,
      error:
        "新しいバージョンのアプリで保存されたファイルのため読み込めません。ページを再読み込みして最新版にしてからお試しください。",
    };
  }

  const parsed = appBackupSchema.safeParse(rawJson);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "データ形式のチェックに失敗しました。ファイルが破損しているか、別のアプリのファイルです。",
    };
  }

  return { ok: true, backup: parsed.data };
}

export async function exportAllAppData(
  tables: AppBackupTables = getDefaultTables(),
  now: Date = new Date(),
): Promise<AppBackup> {
  const presetRepo = createValidatedRepository<SimulatorPreset>(
    tables.simulatorPresets,
    simulatorPresetSchema,
  );
  const cheatRepo = createValidatedRepository<CheatSheetEntry>(
    tables.cheatSheetOverrides,
    cheatSheetEntrySchema,
  );
  const deckRepo = createValidatedRepository<PlayerDeck>(
    tables.playerDecks,
    playerDeckSchema,
  );
  const recordRepo = createValidatedRepository<DuelRecord>(
    tables.duelRecords,
    duelRecordSchema,
  );
  const captureRepo = createValidatedRepository<CaptureSettings>(
    tables.captureSettings,
    captureSettingsSchema,
  );

  const [presets, overrides, decks, records, captureSettings] =
    await Promise.all([
      presetRepo.list(),
      cheatRepo.list(),
      deckRepo.list(),
      recordRepo.list(),
      captureRepo.list(),
    ]);

  return buildAppBackup(
    {
      simulatorPresets: presets.items,
      cheatSheetOverrides: overrides.items,
      playerDecks: decks.items,
      duelRecords: records.items,
      captureSettings: captureSettings.items,
    },
    now,
  );
}

export async function importAppData(
  backup: AppBackup,
  mode: BackupImportMode,
  tables: AppBackupTables = getDefaultTables(),
): Promise<BackupCounts> {
  const validated = appBackupSchema.parse(backup);

  const presetRepo = createValidatedRepository<SimulatorPreset>(
    tables.simulatorPresets,
    simulatorPresetSchema,
  );
  const cheatRepo = createValidatedRepository<CheatSheetEntry>(
    tables.cheatSheetOverrides,
    cheatSheetEntrySchema,
  );
  const deckRepo = createValidatedRepository<PlayerDeck>(
    tables.playerDecks,
    playerDeckSchema,
  );
  const recordRepo = createValidatedRepository<DuelRecord>(
    tables.duelRecords,
    duelRecordSchema,
  );
  const captureRepo = createValidatedRepository<CaptureSettings>(
    tables.captureSettings,
    captureSettingsSchema,
  );

  if (mode === "replace") {
    await Promise.all([
      presetRepo.clear(),
      cheatRepo.clear(),
      deckRepo.clear(),
      recordRepo.clear(),
      captureRepo.clear(),
    ]);
  }

  for (const item of validated.data.simulatorPresets) {
    await presetRepo.save(item);
  }
  for (const item of validated.data.cheatSheetOverrides) {
    await cheatRepo.save(item);
  }
  for (const item of validated.data.playerDecks) {
    await deckRepo.save(item);
  }
  for (const item of validated.data.duelRecords) {
    await recordRepo.save(item);
  }
  for (const item of validated.data.captureSettings) {
    await captureRepo.save(item);
  }

  return countBackupItems(validated.data);
}
