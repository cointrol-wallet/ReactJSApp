import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCurrentUser } from "../currentUser";

// ---------------------------------------------------------------------------
// In-memory idb-keyval mock
// ---------------------------------------------------------------------------

const { idbStore } = vi.hoisted(() => ({ idbStore: new Map<string, unknown>() }));

vi.mock("idb-keyval", () => ({
  get: vi.fn((k: string) => Promise.resolve(idbStore.get(k))),
  set: vi.fn((k: string, v: unknown) => { idbStore.set(k, v); return Promise.resolve(); }),
  del: vi.fn((k: string) => { idbStore.delete(k); return Promise.resolve(); }),
}));

import {
  getAllFolios,
  addFolio,
  updateFolio,
  deleteFolio,
  clearFolios,
  subscribeToFolios,
} from "../folioStore";

const BASE_FOLIO = {
  address: "0xdeadbeef",
  name: "My Wallet",
  chainId: 11155111,
  paymaster: "0xpaymaster",
  type: 1,
  bundler: "0xbundler",
  createdAt: 0,
  updatedAt: 0,
} as const;

beforeEach(() => {
  idbStore.clear();
  setCurrentUser("test-uid");
});

afterEach(() => {
  setCurrentUser(null);
});

// ---------------------------------------------------------------------------

describe("getAllFolios", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getAllFolios()).toEqual([]);
  });
});

describe("addFolio", () => {
  it("creates a folio with generated id and timestamps", async () => {
    const result = await addFolio(BASE_FOLIO);

    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^folio:/);
    expect(result[0].name).toBe("My Wallet");
    expect(result[0].address).toBe("0xdeadbeef");
    expect(result[0].chainId).toBe(11155111);
    expect(result[0].createdAt).toBeGreaterThan(0);
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });

  it("persists optional wallet array", async () => {
    const result = await addFolio({
      ...BASE_FOLIO,
      wallet: [{ coin: "builtin:eth-sepolia", balance: 1000000n }],
    });

    expect(result[0].wallet).toHaveLength(1);
    expect(result[0].wallet![0].coin).toBe("builtin:eth-sepolia");
  });

  it("appends a second folio without removing the first", async () => {
    await addFolio(BASE_FOLIO);
    const result = await addFolio({ ...BASE_FOLIO, name: "Second Wallet" });

    expect(result).toHaveLength(2);
  });
});

describe("updateFolio", () => {
  it("patches the matching folio and updates updatedAt", async () => {
    const added = await addFolio(BASE_FOLIO);
    const id = added[0].id;
    const before = added[0].updatedAt;

    await new Promise(r => setTimeout(r, 2));
    const result = await updateFolio(id, { name: "Renamed Wallet" });

    const updated = result.find(f => f.id === id)!;
    expect(updated.name).toBe("Renamed Wallet");
    expect(updated.updatedAt).toBeGreaterThan(before);
  });

  it("leaves other folios unchanged", async () => {
    await addFolio(BASE_FOLIO);
    const added2 = await addFolio({ ...BASE_FOLIO, name: "Second" });
    const id2 = added2.find(f => f.name === "Second")!.id;

    await updateFolio(id2, { name: "Second Updated" });
    const all = await getAllFolios();
    expect(all.some(f => f.name === "My Wallet")).toBe(true);
  });
});

describe("deleteFolio", () => {
  it("removes the matching folio", async () => {
    const added = await addFolio(BASE_FOLIO);
    const id = added[0].id;

    const result = await deleteFolio(id);
    expect(result).toHaveLength(0);
  });

  it("leaves other folios intact", async () => {
    await addFolio(BASE_FOLIO);
    const added2 = await addFolio({ ...BASE_FOLIO, name: "Second" });
    const id2 = added2.find(f => f.name === "Second")!.id;

    const result = await deleteFolio(id2);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Wallet");
  });
});

describe("clearFolios", () => {
  it("empties the store", async () => {
    await addFolio(BASE_FOLIO);
    await addFolio({ ...BASE_FOLIO, name: "Second" });
    await clearFolios();
    expect(await getAllFolios()).toEqual([]);
  });
});

describe("subscribeToFolios", () => {
  it("notifies subscriber when a folio is added", async () => {
    const listener = vi.fn();
    const unsub = subscribeToFolios(listener);

    await addFolio(BASE_FOLIO);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toHaveLength(1);

    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsub = subscribeToFolios(listener);
    unsub();

    await addFolio(BASE_FOLIO);
    expect(listener).not.toHaveBeenCalled();
  });
});
