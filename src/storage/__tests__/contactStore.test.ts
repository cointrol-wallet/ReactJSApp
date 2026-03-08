import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// In-memory idb-keyval mock (shared by contactStore + addressStore)
// ---------------------------------------------------------------------------

const { idbStore } = vi.hoisted(() => ({ idbStore: new Map<string, unknown>() }));

vi.mock("idb-keyval", () => ({
  get: vi.fn((k: string) => Promise.resolve(idbStore.get(k))),
  set: vi.fn((k: string, v: unknown) => { idbStore.set(k, v); return Promise.resolve(); }),
  del: vi.fn((k: string) => { idbStore.delete(k); return Promise.resolve(); }),
}));

import {
  getAllContacts,
  addContact,
  updateContact,
  deleteContact,
  clearContacts,
} from "../contactStore";
import { getAllAddress } from "../addressStore";

beforeEach(() => {
  idbStore.clear();
});

// ---------------------------------------------------------------------------

describe("getAllContacts", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getAllContacts()).toEqual([]);
  });
});

describe("addContact", () => {
  it("creates a contact with generated id and timestamps", async () => {
    const result = await addContact({ name: "Alice", surname: "Smith" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^contact:/);
    expect(result[0].name).toBe("Alice");
    expect(result[0].surname).toBe("Smith");
    expect(result[0].createdAt).toBeGreaterThan(0);
    expect(result[0].updatedAt).toBeGreaterThan(0);
  });

  it("also creates a corresponding address book entry", async () => {
    await addContact({ name: "Alice", surname: "Smith" });

    const addresses = await getAllAddress();
    expect(addresses).toHaveLength(1);
    expect(addresses[0].name).toBe("Alice Smith");
    expect(addresses[0].isContact).toBe(true);
    expect(addresses[0].isVisible).toBe(true);
  });

  it("address name omits surname when not provided", async () => {
    await addContact({ name: "Bob" });

    const addresses = await getAllAddress();
    expect(addresses[0].name).toBe("Bob");
  });

  it("adds optional wallet and tag fields", async () => {
    const result = await addContact({
      name: "Carol",
      tags: ["vip"],
      wallets: [{ chainId: 1, address: "0xabc" }],
    });

    expect(result[0].tags).toEqual(["vip"]);
    expect(result[0].wallets).toEqual([{ chainId: 1, address: "0xabc" }]);
  });

  it("appends a second contact without removing the first", async () => {
    await addContact({ name: "Alice" });
    const result = await addContact({ name: "Bob" });

    expect(result).toHaveLength(2);
  });
});

describe("updateContact", () => {
  it("patches the matching contact and updates updatedAt", async () => {
    const added = await addContact({ name: "Alice", surname: "Smith" });
    const id = added[0].id;
    const before = added[0].updatedAt;

    await new Promise(r => setTimeout(r, 2));
    const result = await updateContact(id, { name: "Alicia", surname: "Jones" });

    const updated = result.find(c => c.id === id)!;
    expect(updated.name).toBe("Alicia");
    expect(updated.surname).toBe("Jones");
    expect(updated.updatedAt).toBeGreaterThan(before);
  });

  it("also updates the address book entry name", async () => {
    const added = await addContact({ name: "Alice", surname: "Smith" });
    const id = added[0].id;

    await updateContact(id, { name: "Alicia" });

    const addresses = await getAllAddress();
    const addr = addresses.find(a => a.id === `address:${id}`)!;
    expect(addr.name).toBe("Alicia");
  });

  it("leaves other contacts unchanged", async () => {
    await addContact({ name: "Alice" });
    const added2 = await addContact({ name: "Bob" });
    const id2 = added2.find(c => c.name === "Bob")!.id;

    await updateContact(id2, { name: "Robert" });
    const all = await getAllContacts();
    expect(all.some(c => c.name === "Alice")).toBe(true);
  });
});

describe("deleteContact", () => {
  it("removes the matching contact and its address entry", async () => {
    const added = await addContact({ name: "Alice" });
    const id = added[0].id;

    const result = await deleteContact(id);
    expect(result).toHaveLength(0);

    const addresses = await getAllAddress();
    expect(addresses.some(a => a.id === `address:${id}`)).toBe(false);
  });

  it("leaves other contacts intact", async () => {
    await addContact({ name: "Alice" });
    const added2 = await addContact({ name: "Bob" });
    const bob = added2.find(c => c.name === "Bob")!;

    await deleteContact(bob.id);
    const all = await getAllContacts();
    expect(all.some(c => c.name === "Alice")).toBe(true);
    expect(all.some(c => c.name === "Bob")).toBe(false);
  });
});

describe("clearContacts", () => {
  it("empties the contacts store", async () => {
    await addContact({ name: "Alice" });
    await addContact({ name: "Bob" });
    await clearContacts();
    expect(await getAllContacts()).toEqual([]);
  });
});
