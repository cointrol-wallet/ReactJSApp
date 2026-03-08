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
  getAllTxns,
  addTxn,
  updateTxn,
  deleteTxn,
  clearTxns,
  upsertIncomingTxns,
  subscribeToTxns,
} from "../transactionStore";

const BASE_TXN = {
  userOpHash: "0x" + "aa".repeat(32),
  transactionHash: "0x" + "bb".repeat(32),
  chainId: 11155111,
  addressId: "addr:001",
  coinId: "builtin:eth-sepolia",
  folioId: "folio:001",
  walletId: "wallet:001",
} as const;

beforeEach(() => {
  idbStore.clear();
});

// ---------------------------------------------------------------------------

describe("getAllTxns", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getAllTxns()).toEqual([]);
  });
});

describe("v1 → v2 migration", () => {
  it("stamps direction=outgoing on v1 records and bumps schemaVersion to 2", async () => {
    // Simulate a v1 install: schema version key absent (will be assumed v1),
    // with pre-existing txns that lack a direction field
    const legacyTxn = { id: "txn:legacy", userOpHash: "0xabc", direction: undefined };
    idbStore.set("cointrol:txns:v1", [legacyTxn]);
    // No schema version key → getTxnSchemaVersion() returns 1

    const txns = await getAllTxns();

    expect(txns[0].direction).toBe("outgoing");
    expect(idbStore.get("cointrol:txns:schemaVersion")).toBe(2);
  });

  it("skips migration when already at v2", async () => {
    idbStore.set("cointrol:txns:schemaVersion", 2);
    idbStore.set("cointrol:txns:v1", [{ id: "txn:1", direction: "incoming" }]);

    const txns = await getAllTxns();

    // direction unchanged — migration did not run
    expect(txns[0].direction).toBe("incoming");
  });
});

describe("addTxn", () => {
  it("creates a txn with generated id, timestamps, and default direction=outgoing", async () => {
    const result = await addTxn(BASE_TXN);

    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^txn:/);
    expect(result[0].direction).toBe("outgoing");
    expect(result[0].createdAt).toBeGreaterThan(0);
    expect(result[0].updatedAt).toBeGreaterThan(0);
    expect(result[0].chainId).toBe(11155111);
  });

  it("respects an explicit direction when provided", async () => {
    const result = await addTxn({ ...BASE_TXN, direction: "incoming" });
    expect(result[0].direction).toBe("incoming");
  });

  it("uses a provided id when given", async () => {
    const result = await addTxn({ ...BASE_TXN, id: "txn:explicit" });
    expect(result[0].id).toBe("txn:explicit");
  });

  it("appends multiple txns", async () => {
    await addTxn(BASE_TXN);
    const result = await addTxn({ ...BASE_TXN, transactionHash: "0x" + "cc".repeat(32) });
    expect(result).toHaveLength(2);
  });
});

describe("updateTxn", () => {
  it("patches the matching txn and updates updatedAt", async () => {
    const added = await addTxn(BASE_TXN);
    const id = added[0].id;
    const before = added[0].updatedAt;

    await new Promise(r => setTimeout(r, 2));
    const result = await updateTxn(id, { amount: "1.5", tokenSymbol: "ETH" });

    const updated = result.find(t => t.id === id)!;
    expect(updated.amount).toBe("1.5");
    expect(updated.tokenSymbol).toBe("ETH");
    expect(updated.updatedAt).toBeGreaterThan(before);
  });

  it("leaves other txns unchanged", async () => {
    await addTxn(BASE_TXN);
    const added2 = await addTxn({ ...BASE_TXN, id: "txn:second" });
    const id2 = added2.find(t => t.id === "txn:second")!.id;

    await updateTxn(id2, { amount: "5.0" });
    const all = await getAllTxns();
    expect(all.find(t => t.id !== "txn:second")?.amount).toBeUndefined();
  });
});

describe("deleteTxn", () => {
  it("removes the matching txn", async () => {
    const added = await addTxn(BASE_TXN);
    const id = added[0].id;

    const result = await deleteTxn(id);
    expect(result).toHaveLength(0);
  });
});

describe("clearTxns", () => {
  it("empties the store", async () => {
    await addTxn(BASE_TXN);
    await clearTxns();
    expect(await getAllTxns()).toEqual([]);
  });
});

describe("upsertIncomingTxns", () => {
  it("adds new incoming txns", async () => {
    const incoming = [{
      ...BASE_TXN,
      id: "incoming:txn:001",
      direction: "incoming" as const,
    }];

    const result = await upsertIncomingTxns(incoming);
    expect(result).toHaveLength(1);
    expect(result[0].direction).toBe("incoming");
  });

  it("updates an existing incoming txn with the same id", async () => {
    const first = [{ ...BASE_TXN, id: "incoming:001", direction: "incoming" as const, amount: "1.0" }];
    await upsertIncomingTxns(first);

    const updated = [{ ...BASE_TXN, id: "incoming:001", direction: "incoming" as const, amount: "2.0" }];
    const result = await upsertIncomingTxns(updated);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe("2.0");
  });

  it("never overwrites an outgoing txn with the same id", async () => {
    await addTxn({ ...BASE_TXN, id: "txn:shared", direction: "outgoing" });

    const incoming = [{ ...BASE_TXN, id: "txn:shared", direction: "incoming" as const, amount: "9.9" }];
    const result = await upsertIncomingTxns(incoming);

    const txn = result.find(t => t.id === "txn:shared")!;
    expect(txn.direction).toBe("outgoing");
    expect(txn.amount).toBeUndefined();
  });
});

describe("subscribeToTxns", () => {
  it("notifies subscriber after addTxn", async () => {
    const listener = vi.fn();
    const unsub = subscribeToTxns(listener);

    await addTxn(BASE_TXN);

    expect(listener).toHaveBeenCalledOnce();
    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsub = subscribeToTxns(listener);
    unsub();

    await addTxn(BASE_TXN);
    expect(listener).not.toHaveBeenCalled();
  });
});
