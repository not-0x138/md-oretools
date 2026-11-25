import type { z } from "zod";
import {
  CURRENT_DB_RECORD_SCHEMA_VERSION,
  type StoredRecord,
} from "./database";

export interface IdentifiableRecord {
  id: string;
  updatedAt: string;
}

export interface StoredRecordTable {
  orderBy(index: "updatedAt"): {
    reverse(): {
      toArray(): Promise<StoredRecord[]>;
    };
  };
  get(id: string): Promise<StoredRecord | undefined>;
  put(record: StoredRecord): Promise<unknown>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ListResult<T> {
  items: T[];
  corruptedCount: number;
}

/**
 * Dexie テーブルと Zod スキーマを組み合わせた型安全な CRUD アダプタ。
 * 破損レコードはアプリ全体の起動を阻害しないよう隔離しつつ、件数を返して呼び出し元へ通知する。
 */
export function createValidatedRepository<T extends IdentifiableRecord>(
  table: StoredRecordTable,
  schema: z.ZodType<T>,
) {
  return {
    async list(): Promise<ListResult<T>> {
      const rows = await table.orderBy("updatedAt").reverse().toArray();
      const items: T[] = [];
      let corruptedCount = 0;

      for (const row of rows) {
        const parsed = schema.safeParse(row.payload);
        if (parsed.success) {
          items.push(parsed.data);
        } else {
          corruptedCount += 1;
          console.warn(
            `[md-oretools] 破損または未対応形式のレコードをスキップしました (id=${row.id})`,
          );
        }
      }

      return { items, corruptedCount };
    },

    async get(id: string): Promise<T | undefined> {
      const row = await table.get(id);
      if (!row) {
        return undefined;
      }
      const parsed = schema.safeParse(row.payload);
      return parsed.success ? parsed.data : undefined;
    },

    async save(item: T): Promise<T> {
      const validated = schema.parse(item);
      await table.put({
        id: validated.id,
        schemaVersion: CURRENT_DB_RECORD_SCHEMA_VERSION,
        updatedAt: validated.updatedAt,
        payload: validated,
      });
      return validated;
    },

    async remove(id: string): Promise<void> {
      await table.delete(id);
    },

    async clear(): Promise<void> {
      await table.clear();
    },
  };
}
