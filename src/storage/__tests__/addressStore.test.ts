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
  getAllAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  clearAddress,
  subscribeToAddress,
} from "../addressStore";

beforeEach(() => {
  idbStore.clear();
  setCurrentUser("test-uid");
});

afterEach(() => {
  setCurrentUser(null);
});

// ---------------------------------------------------------------------------

describe("getAllAddress", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getAllAddress()).toEqual([]);
  });
});

describe("addAddress", () => {
  it("inserts a new address and returns the updated array", async () => {
    const result = await addAddress({
      id: "addr:001",
      name: "Alice",
      isContact: true,
      isVisible: true,
      indexOrder: 0,
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("addr:001");
    expect(result[0].name).toBe("Alice");
    expect(result[0].isContact).toBe(true);
    expect(result[0].isVisible).toBe(true);
    expect(result[0].createdAt).toBeGreaterThan(0);
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });

  it("appends a second address without removing the first", async () => {
    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });
    const result = await addAddress({ id: "addr:002", name: "Bob", isContact: false, isVisible: true, indexOrder: 1 });

    expect(result).toHaveLength(2);
    expect(result.map(a => a.id)).toEqual(["addr:001", "addr:002"]);
  });

  it("persists optional group field when provided", async () => {
    const result = await addAddress({
      id: "addr:003",
      name: "Carol",
      group: ["family"],
      isContact: true,
      isVisible: true,
      indexOrder: 0,
    });

    expect(result[0].group).toEqual(["family"]);
  });

  it("omits group field when not provided", async () => {
    const result = await addAddress({ id: "addr:004", name: "Dave", isContact: true, isVisible: false, indexOrder: 0 });
    expect(result[0].group).toBeUndefined();
  });
});

describe("updateAddress", () => {
  it("patches the matching entry and updates updatedAt", async () => {
    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });
    const before = (await getAllAddress())[0].updatedAt;

    await new Promise(r => setTimeout(r, 2)); // ensure timestamp advances
    const result = await updateAddress("addr:001", { name: "Alice Updated", isVisible: false });

    const updated = result.find(a => a.id === "addr:001")!;
    expect(updated.name).toBe("Alice Updated");
    expect(updated.isVisible).toBe(false);
    expect(updated.updatedAt).toBeGreaterThan(before);
  });

  it("leaves other entries unchanged", async () => {
    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });
    await addAddress({ id: "addr:002", name: "Bob", isContact: true, isVisible: true, indexOrder: 1 });

    await updateAddress("addr:001", { name: "Alice Updated" });
    const all = await getAllAddress();

    expect(all.find(a => a.id === "addr:002")?.name).toBe("Bob");
  });
});

describe("deleteAddress", () => {
  it("removes the matching entry", async () => {
    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });
    await addAddress({ id: "addr:002", name: "Bob", isContact: true, isVisible: true, indexOrder: 1 });

    const result = await deleteAddress("addr:001");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("addr:002");
  });

  it("returns unchanged array when id not found", async () => {
    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });
    const result = await deleteAddress("addr:does-not-exist");

    expect(result).toHaveLength(1);
  });
});

describe("clearAddress", () => {
  it("empties the store", async () => {
    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });
    await clearAddress();
    expect(await getAllAddress()).toEqual([]);
  });
});

describe("subscribeToAddress", () => {
  it("notifies subscriber when an address is added", async () => {
    const listener = vi.fn();
    const unsub = subscribeToAddress(listener);

    await addAddress({ id: "addr:001", name: "Alice", isContact: true, isVisible: true, indexOrder: 0 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toHaveLength(1);

    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsub = subscribeToAddress(listener);
    unsub();

    await addAddress({ id: "addr:002", name: "Bob", isContact: true, isVisible: true, indexOrder: 0 });

    expect(listener).not.toHaveBeenCalled();
  });
});
