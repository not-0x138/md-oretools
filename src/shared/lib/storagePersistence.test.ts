import { describe, expect, it, vi } from "vitest";
import { requestStoragePersistence } from "./storagePersistence";

describe("requestStoragePersistence", () => {
  it("StorageManager が利用できない環境では unsupported を返す", async () => {
    const status = await requestStoragePersistence({});

    expect(status).toBe("unsupported");
  });

  it("すでに永続化済みの場合は persist を呼ばず persisted を返す", async () => {
    const persist = vi.fn(async () => false);
    const persisted = vi.fn(async () => true);

    const status = await requestStoragePersistence({ persisted, persist });

    expect(status).toBe("persisted");
    expect(persisted).toHaveBeenCalledTimes(1);
    expect(persist).not.toHaveBeenCalled();
  });

  it("未永続化かつ persist が許可された場合は persisted を返す", async () => {
    const persist = vi.fn(async () => true);
    const persisted = vi.fn(async () => false);

    const status = await requestStoragePersistence({ persisted, persist });

    expect(status).toBe("persisted");
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("persist が拒否または例外を送出した場合は not-persisted を返す", async () => {
    const deniedStatus = await requestStoragePersistence({
      persisted: async () => false,
      persist: async () => false,
    });
    const errorStatus = await requestStoragePersistence({
      persisted: async () => {
        throw new Error("denied");
      },
      persist: async () => true,
    });

    expect(deniedStatus).toBe("not-persisted");
    expect(errorStatus).toBe("not-persisted");
  });
});
