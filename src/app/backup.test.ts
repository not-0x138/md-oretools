import { describe, expect, it } from "vitest";
import type { StoredRecord } from "@/shared/db/database";
import type { StoredRecordTable } from "@/shared/db/repository";
import {
  type AppBackup,
  type AppBackupTables,
  buildAppBackup,
  createBackupFilename,
  exportAllAppData,
  importAppData,
  parseAppBackupJson,
} from "./backup";

function createMemoryTable(): StoredRecordTable {
  const store = new Map<string, StoredRecord>();
  return {
    orderBy: () => ({
      reverse: () => ({
        toArray: async () =>
          Array.from(store.values()).sort((a, b) =>
            b.updatedAt.localeCompare(a.updatedAt),
          ),
      }),
    }),
    get: async (id) => store.get(id),
    put: async (record) => {
      store.set(record.id, record);
    },
    delete: async (id) => {
      store.delete(id);
    },
    clear: async () => {
      store.clear();
    },
  };
}

function createMemoryTables(): AppBackupTables {
  return {
    simulatorPresets: createMemoryTable(),
    cheatSheetOverrides: createMemoryTable(),
    playerDecks: createMemoryTable(),
    duelRecords: createMemoryTable(),
  };
}

function createSampleBackup(): AppBackup {
  return buildAppBackup(
    {
      simulatorPresets: [
        {
          id: "preset-1",
          name: "初動チェック",
          deckSize: 40,
          handSize: 5,
          groups: [{ id: "g1", name: "初動", count: 12 }],
          conditionSets: [
            {
              id: "c1",
              name: "1枚初動",
              clauses: [
                { id: "cl1", groupId: "g1", operator: "gte", count: 1 },
              ],
            },
          ],
          updatedAt: "2026-11-26T10:00:00.000Z",
        },
      ],
      cheatSheetOverrides: [
        {
          id: "custom-1",
          themeName: "独自テーマ",
          aliases: ["どくじ"],
          signatureCards: ["固有カードA"],
          summary: "メモ",
          handTraps: [],
          updatedAt: "2026-11-26T10:00:00.000Z",
        },
      ],
      playerDecks: [
        {
          id: "deck-1",
          name: "スネークアイ",
          memo: "誘発厚め",
          archived: false,
          createdAt: "2026-11-26T09:00:00.000Z",
          updatedAt: "2026-11-26T10:00:00.000Z",
        },
      ],
      duelRecords: [
        {
          id: "duel-1",
          playedAt: "2026-11-26T10:30:00.000Z",
          season: "2026-11 ランク戦",
          rank: "マスター1",
          playerDeckId: "deck-1",
          playerDeckName: "スネークアイ",
          opponentDeck: "天盃龍",
          coinFlip: "heads",
          turnOrder: "first",
          result: "win",
          memo: "うららが刺さった",
          updatedAt: "2026-11-26T10:30:00.000Z",
        },
      ],
    },
    new Date("2026-11-26T12:00:00.000Z"),
  );
}

describe("parseAppBackupJson", () => {
  it("正常なバックアップ JSON をパースできる", () => {
    const sample = createSampleBackup();
    const result = parseAppBackupJson(JSON.stringify(sample));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.data.duelRecords).toHaveLength(1);
      expect(result.backup.data.playerDecks[0]?.name).toBe("スネークアイ");
    }
  });

  it("壊れた JSON や未来バージョンのバックアップを日本語エラーで拒否する", () => {
    const invalidJson = parseAppBackupJson("{broken");
    expect(invalidJson.ok).toBe(false);

    const futureVersion = parseAppBackupJson(
      JSON.stringify({
        ...createSampleBackup(),
        schemaVersion: 99,
      }),
    );
    expect(futureVersion.ok).toBe(false);
    if (!futureVersion.ok) {
      expect(futureVersion.error).toContain("新しいバージョン");
    }
  });
});

describe("createBackupFilename", () => {
  it("日付入りの JSON ファイル名を生成する", () => {
    expect(createBackupFilename(new Date(2026, 10, 26))).toBe(
      "md-oretools-backup-2026-11-26.json",
    );
  });
});

describe("exportAllAppData & importAppData", () => {
  it("マージモードでは既存データを維持しつつ同一 ID を更新し新規 ID を追加する", async () => {
    const tables = createMemoryTables();
    const initial = createSampleBackup();
    await importAppData(initial, "replace", tables);

    const incoming: AppBackup = buildAppBackup({
      simulatorPresets: [],
      cheatSheetOverrides: [],
      playerDecks: [
        {
          id: "deck-1",
          name: "スネークアイ（改）",
          memo: "更新後",
          archived: false,
          createdAt: "2026-11-26T09:00:00.000Z",
          updatedAt: "2026-11-26T11:00:00.000Z",
        },
        {
          id: "deck-2",
          name: "天盃龍",
          memo: "",
          archived: false,
          createdAt: "2026-11-26T11:00:00.000Z",
          updatedAt: "2026-11-26T11:00:00.000Z",
        },
      ],
      duelRecords: [],
    });

    await importAppData(incoming, "merge", tables);
    const exported = await exportAllAppData(tables);

    expect(exported.data.simulatorPresets).toHaveLength(1);
    expect(exported.data.duelRecords).toHaveLength(1);
    expect(exported.data.playerDecks).toHaveLength(2);
    expect(exported.data.playerDecks.find((d) => d.id === "deck-1")?.name).toBe(
      "スネークアイ（改）",
    );
  });

  it("全置換モードでは既存データを消去してバックアップ内容で置き換える", async () => {
    const tables = createMemoryTables();
    await importAppData(createSampleBackup(), "replace", tables);

    const emptyBackup = buildAppBackup({
      simulatorPresets: [],
      cheatSheetOverrides: [],
      playerDecks: [],
      duelRecords: [],
    });

    const summary = await importAppData(emptyBackup, "replace", tables);
    const exported = await exportAllAppData(tables);

    expect(summary).toEqual({
      simulatorPresets: 0,
      cheatSheetOverrides: 0,
      playerDecks: 0,
      duelRecords: 0,
    });
    expect(exported.data.playerDecks).toHaveLength(0);
    expect(exported.data.duelRecords).toHaveLength(0);
  });
});
