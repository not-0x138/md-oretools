export type StoragePersistenceStatus =
  | "persisted"
  | "not-persisted"
  | "unsupported";

export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

/**
 * ブラウザによる自動ストレージ削除を緩和するため、永続化ストレージの許可を要求する。
 * 非対応ブラウザやプライベートモード等では例外を投げず状態値で返す。
 */
export async function requestStoragePersistence(
  storage?: StorageManagerLike,
): Promise<StoragePersistenceStatus> {
  const manager =
    storage ??
    (typeof navigator !== "undefined" ? navigator.storage : undefined);

  if (!manager || typeof manager.persist !== "function") {
    return "unsupported";
  }

  try {
    if (typeof manager.persisted === "function") {
      const alreadyPersisted = await manager.persisted();
      if (alreadyPersisted) {
        return "persisted";
      }
    }
    const granted = await manager.persist();
    return granted ? "persisted" : "not-persisted";
  } catch {
    return "not-persisted";
  }
}
