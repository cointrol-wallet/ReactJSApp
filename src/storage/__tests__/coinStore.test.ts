import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getAllCoins,
  addCoin,
  updateCoin,
  deleteCoin,
  clearCoins,
} from "../coinStore";

// Builtin coin IDs defined in coinStore.ts
const BUILTIN_IDS = ["builtin:eth-sepolia", "builtin:eth-mainnet", "builtin:fakecoin"];

beforeEach(() => {
  idbStore.clear();
});

// ---------------------------------------------------------------------------

describe("getAllCoins", () => {
  it("returns the three builtin coins even when user store is empty", async () => {
    const coins = await getAllCoins();
    expect(coins.length).toBeGreaterThanOrEqual(3);
    for (const id of BUILTIN_IDS) {
      expect(coins.some(c => c.id === id)).toBe(true);
    }
  });
});

describe("addCoin", () => {
  it("adds a user coin; result includes builtins + new coin", async () => {
    const result = await addCoin({
      name: "My Token",
      symbol: "MYT",
      decimals: 18,
      chainId: 11155111,
      address: "0xabc",
      type: "ERC20",
      tags: ["defi"],
    });

    // addCoin returns user coins only; use getAllCoins() to verify builtins still present
    const all = await getAllCoins();
    for (const id of BUILTIN_IDS) {
      expect(all.some(c => c.id === id)).toBe(true);
    }

    const mine = result.find(c => c.name === "My Token")!;
    expect(mine).toBeDefined();
    expect(mine.symbol).toBe("MYT");
    expect(mine.decimals).toBe(18);
    expect(mine.tags).toEqual(["defi"]);
    expect(mine.id).toMatch(/^coin:/);
    expect(mine.createdAt).toBeGreaterThan(0);
  });

  it("adding a second coin keeps both plus builtins", async () => {
    await addCoin({ name: "Token A", symbol: "A", decimals: 6, chainId: 1, address: "0x1", type: "ERC20" });
    const result = await addCoin({ name: "Token B", symbol: "B", decimals: 6, chainId: 1, address: "0x2", type: "ERC20" });

    expect(result.filter(c => !BUILTIN_IDS.includes(c.id))).toHaveLength(2);
  });
});

describe("updateCoin — user coin", () => {
  it("patches a user coin's fields", async () => {
    const added = await addCoin({ name: "Token A", symbol: "A", decimals: 6, chainId: 1, address: "0x1", type: "ERC20" });
    const userCoin = added.find(c => !BUILTIN_IDS.includes(c.id))!;

    await new Promise(r => setTimeout(r, 2));
    const result = await updateCoin(userCoin.id, { name: "Token A Updated", symbol: "AU" });

    const updated = result.find(c => c.id === userCoin.id)!;
    expect(updated.name).toBe("Token A Updated");
    expect(updated.symbol).toBe("AU");
    expect(updated.updatedAt).toBeGreaterThan(userCoin.updatedAt);
  });
});

describe("updateCoin — builtin coin", () => {
  it("allows tag updates on builtin coins", async () => {
    const result = await updateCoin("builtin:eth-sepolia", { tags: ["layer1"] });
    const eth = result.find(c => c.id === "builtin:eth-sepolia")!;
    expect(eth.tags).toEqual(["layer1"]);
  });

  it("ignores non-tag field changes on builtin coins", async () => {
    await updateCoin("builtin:eth-sepolia", { name: "Hacked Name" } as any);
    const coins = await getAllCoins();
    const eth = coins.find(c => c.id === "builtin:eth-sepolia")!;
    expect(eth.name).toBe("Ether Sepolia");
  });
});

describe("deleteCoin", () => {
  it("removes a user coin", async () => {
    const added = await addCoin({ name: "Token A", symbol: "A", decimals: 6, chainId: 1, address: "0x1", type: "ERC20" });
    const userCoin = added.find(c => !BUILTIN_IDS.includes(c.id))!;

    const result = await deleteCoin(userCoin.id);
    expect(result.some(c => c.id === userCoin.id)).toBe(false);
  });

  it("cannot delete builtin coins", async () => {
    const result = await deleteCoin("builtin:eth-sepolia");
    expect(result.some(c => c.id === "builtin:eth-sepolia")).toBe(true);
  });
});

describe("clearCoins", () => {
  it("removes all user coins; builtins remain", async () => {
    await addCoin({ name: "Token A", symbol: "A", decimals: 6, chainId: 1, address: "0x1", type: "ERC20" });
    await clearCoins();

    const coins = await getAllCoins();
    const userCoins = coins.filter(c => !BUILTIN_IDS.includes(c.id));
    expect(userCoins).toHaveLength(0);
    for (const id of BUILTIN_IDS) {
      expect(coins.some(c => c.id === id)).toBe(true);
    }
  });
});
