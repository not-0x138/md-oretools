import Dexie, { type EntityTable } from "dexie";

/**
 * 各 feature 固有のデータ型を `shared` 層から直接 import すると依存ルール違反になるため、
 * IndexedDB の各テーブルは汎用レコード構造（payload: unknown）として保持し、
 * 読み書き時に各 feature の Zod スキーマで検証する。
 */
export interface StoredRecord {
  id: string;
  schemaVersion: number;
  updatedAt: string;
  payload: unknown;
}

export const CURRENT_DB_RECORD_SCHEMA_VERSION = 1;

export type DatabaseNoticeType = "versionchange" | "blocked";
type DatabaseNoticeListener = (notice: DatabaseNoticeType) => void;

export class MdOretoolsDatabase extends Dexie {
  simulatorPresets!: EntityTable<StoredRecord, "id">;
  cheatSheetOverrides!: EntityTable<StoredRecord, "id">;
  playerDecks!: EntityTable<StoredRecord, "id">;
  duelRecords!: EntityTable<StoredRecord, "id">;
  captureSettings!: EntityTable<StoredRecord, "id">;

  private readonly noticeListeners = new Set<DatabaseNoticeListener>();

  constructor(name = "md-oretools") {
    super(name);

    this.version(1).stores({
      simulatorPresets: "id, updatedAt",
      cheatSheetOverrides: "id, updatedAt",
    });

    this.version(2).stores({
      simulatorPresets: "id, updatedAt",
      cheatSheetOverrides: "id, updatedAt",
      playerDecks: "id, updatedAt",
      duelRecords: "id, updatedAt",
    });

    this.version(3).stores({
      simulatorPresets: "id, updatedAt",
      cheatSheetOverrides: "id, updatedAt",
      playerDecks: "id, updatedAt",
      duelRecords: "id, updatedAt",
      captureSettings: "id, updatedAt",
    });

    // 複数タブ同時起動時に他タブでスキーマバージョンが上がった場合、
    // 接続を閉じてロック競合（BlockedError）を防ぎつつ UI へ再読み込み案内を通知する。
    this.on("versionchange", () => {
      this.close();
      this.emitNotice("versionchange");
    });

    this.on("blocked", () => {
      this.emitNotice("blocked");
    });
  }

  subscribeNotice(listener: DatabaseNoticeListener): () => void {
    this.noticeListeners.add(listener);
    return () => {
      this.noticeListeners.delete(listener);
    };
  }

  private emitNotice(notice: DatabaseNoticeType): void {
    for (const listener of this.noticeListeners) {
      listener(notice);
    }
  }
}

export const db = new MdOretoolsDatabase();
