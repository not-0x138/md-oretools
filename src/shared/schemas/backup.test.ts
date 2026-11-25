import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  backupEnvelopeSchema,
  CURRENT_BACKUP_SCHEMA_VERSION,
  createBackupEnvelope,
  createBackupSchema,
} from "./backup";

describe("backupEnvelopeSchema", () => {
  const fixedDate = new Date("2026-11-25T12:00:00.000Z");

  it("正常なバックアップメタデータを生成・検証できる", () => {
    const envelope = createBackupEnvelope(fixedDate);

    const parsed = backupEnvelopeSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.app).toBe("md-oretools");
      expect(parsed.data.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
      expect(parsed.data.exportedAt).toBe("2026-11-25T12:00:00.000Z");
    }
  });

  it("エンベロープ単体の検証でもペイロード（未知キー）を削除せず保持する", () => {
    const raw = {
      ...createBackupEnvelope(fixedDate),
      data: { decks: ["天盃龍"] },
    };

    const parsed = backupEnvelopeSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data).toEqual({ decks: ["天盃龍"] });
    }
  });

  it("app 識別子が一致しない場合は拒否する", () => {
    const parsed = backupEnvelopeSchema.safeParse({
      ...createBackupEnvelope(fixedDate),
      app: "other-app",
    });
    expect(parsed.success).toBe(false);
  });

  it("schemaVersion が 0 以下または小数の場合は拒否する", () => {
    expect(
      backupEnvelopeSchema.safeParse({
        ...createBackupEnvelope(fixedDate),
        schemaVersion: 0,
      }).success,
    ).toBe(false);

    expect(
      backupEnvelopeSchema.safeParse({
        ...createBackupEnvelope(fixedDate),
        schemaVersion: 1.5,
      }).success,
    ).toBe(false);
  });

  it("現行より新しい未来の schemaVersion を拒否する", () => {
    const parsed = backupEnvelopeSchema.safeParse({
      ...createBackupEnvelope(fixedDate),
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION + 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("exportedAt が ISO 8601 日時でない場合は拒否する", () => {
    const parsed = backupEnvelopeSchema.safeParse({
      ...createBackupEnvelope(fixedDate),
      exportedAt: "2026/11/25 12:00:00",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("createBackupSchema", () => {
  it("ペイロードスキーマと合成してデータ全体を検証できる", () => {
    const schema = createBackupSchema(
      z.object({
        presets: z.array(z.string()),
      }),
    );

    const valid = schema.safeParse({
      ...createBackupEnvelope(new Date("2026-11-25T12:00:00.000Z")),
      data: { presets: ["40枚標準"] },
    });
    expect(valid.success).toBe(true);

    const invalidPayload = schema.safeParse({
      ...createBackupEnvelope(new Date("2026-11-25T12:00:00.000Z")),
      data: { presets: [123] },
    });
    expect(invalidPayload.success).toBe(false);
  });
});
