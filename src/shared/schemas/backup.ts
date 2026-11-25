import { z } from "zod";

/** 現行のバックアップスキーマバージョン */
export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

/**
 * JSON エクスポート／インポート共通のエンベロープスキーマ。
 * - `z.looseObject` を用い、メタデータ検証時にペイロード（未知キー）を誤って削除しない。
 * - 現行バージョンより新しい未来スキーマ（未対応形式）は明示的に拒否する。
 * - 各 feature のデータスキーマを集約した完全なバックアップスキーマは `src/app/` 層で組み立てる。
 */
export const backupEnvelopeSchema = z.looseObject({
  app: z.literal("md-oretools"),
  schemaVersion: z.int().min(1).max(CURRENT_BACKUP_SCHEMA_VERSION),
  exportedAt: z.iso.datetime(),
});

export type BackupEnvelope = {
  app: "md-oretools";
  schemaVersion: number;
  exportedAt: string;
};

/** エンベロープとペイロードスキーマを合成した厳格なバックアップスキーマを生成する */
export function createBackupSchema<T extends z.ZodType>(payloadSchema: T) {
  return z.object({
    app: z.literal("md-oretools"),
    schemaVersion: z.int().min(1).max(CURRENT_BACKUP_SCHEMA_VERSION),
    exportedAt: z.iso.datetime(),
    data: payloadSchema,
  });
}

/** 新規エクスポート用のメタデータを生成する */
export function createBackupEnvelope(now: Date = new Date()): BackupEnvelope {
  return {
    app: "md-oretools",
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
  };
}
