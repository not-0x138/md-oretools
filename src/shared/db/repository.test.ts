import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { StoredRecord } from "./database";
import {
  createValidatedRepository,
  type StoredRecordTable,
} from "./repository";

const sampleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.iso.datetime(),
});

function createMemoryTable(initial: StoredRecord[] = []): StoredRecordTable {
  const store = new Map<string, StoredRecord>(
    initial.map((row) => [row.id, row]),
  );
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

describe("createValidatedRepository", () => {
  it("正常レコードの保存・取得・一覧・削除ができる", async () => {
    const repo = createValidatedRepository(createMemoryTable(), sampleSchema);
    const item = {
      id: "p1",
      name: "青眼",
      updatedAt: "2026-11-25T10:00:00.000Z",
    };

    await repo.save(item);
    expect(await repo.get("p1")).toEqual(item);

    const listed = await repo.list();
    expect(listed).toEqual({ items: [item], corruptedCount: 0 });

    await repo.remove("p1");
    expect(await repo.get("p1")).toBeUndefined();
  });

  it("破損レコードが混在していても有効レコードのみ返し、破損件数を報告する", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const table = createMemoryTable([
      {
        id: "valid-1",
        schemaVersion: 1,
        updatedAt: "2026-11-25T10:00:00.000Z",
        payload: {
          id: "valid-1",
          name: "正常",
          updatedAt: "2026-11-25T10:00:00.000Z",
        },
      },
      {
        id: "broken-1",
        schemaVersion: 1,
        updatedAt: "2026-11-25T11:00:00.000Z",
        payload: { id: "broken-1", name: "" },
      },
    ]);
    const repo = createValidatedRepository(table, sampleSchema);

    const listed = await repo.list();

    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.id).toBe("valid-1");
    expect(listed.corruptedCount).toBe(1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("スキーマ違反データの保存は ZodError で拒否する", async () => {
    const repo = createValidatedRepository(createMemoryTable(), sampleSchema);

    await expect(
      repo.save({
        id: "bad",
        name: "",
        updatedAt: "2026-11-25T10:00:00.000Z",
      }),
    ).rejects.toThrow();
  });
});
