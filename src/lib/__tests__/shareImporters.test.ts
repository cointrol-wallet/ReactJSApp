import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCurrentUser } from "@/storage/currentUser";

// ---------------------------------------------------------------------------
// idb-keyval in-memory mock (same pattern as storage tests)
// ---------------------------------------------------------------------------

const { idbStore } = vi.hoisted(() => ({ idbStore: new Map<string, unknown>() }));

vi.mock("idb-keyval", () => ({
  get: vi.fn((k: string) => Promise.resolve(idbStore.get(k))),
  set: vi.fn((k: string, v: unknown) => { idbStore.set(k, v); return Promise.resolve(); }),
  del: vi.fn((k: string) => { idbStore.delete(k); return Promise.resolve(); }),
}));

import { importSharePayload, applyAddNewContact, applyContactUpdate } from "../shareImporters";
import type { ContactImportReview, ContactMatchInfo } from "../shareImporters";
import { getAllContacts, addContact } from "@/storage/contactStore";
import { getAllContracts, addContract } from "@/storage/contractStore";
import { getAllCoins, addCoin } from "@/storage/coinStore";
import type { SharePayload } from "../sharePayload";

beforeEach(() => {
  idbStore.clear();
  setCurrentUser("test-uid");
});

afterEach(() => {
  setCurrentUser(null);
});

const ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;
const ADDR2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`;
const ADDR3 = "0xcccccccccccccccccccccccccccccccccccccccc" as `0x${string}`;

// ---------------------------------------------------------------------------
// contact — importSharePayload always returns mode:"review"
// ---------------------------------------------------------------------------

describe("importSharePayload — contact", () => {
  const payload: SharePayload = {
    v: 1,
    t: "contact",
    data: {
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR }],
    },
  };

  it("returns mode:review even when no existing contact matches", async () => {
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.mode).toBe("review");
    expect(result.matches).toHaveLength(0);
    // nothing written to store
    expect(await getAllContacts()).toHaveLength(0);
  });

  it("includes incoming name and wallets in the review result", async () => {
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.incoming.name).toBe("Alice");
    expect(result.incoming.surname).toBe("Smith");
    expect(result.incoming.wallets).toHaveLength(1);
  });

  it("returns one match with matchReason:name when name+surname match exists", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: null });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.mode).toBe("review");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchReason).toBe("name");
  });

  it("match is case-insensitive on name and surname", async () => {
    await addContact({ name: "ALICE", surname: "SMITH", wallets: null });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches).toHaveLength(1);
  });

  it("walletRelationship is overlap when incoming wallet exists in existing contact", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR }] });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches[0].walletRelationship).toBe("overlap");
  });

  it("walletRelationship is none when no wallets are shared", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR2 }] });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches[0].walletRelationship).toBe("none");
  });

  it("deduplicates wallets by chainId:address in mergedWallets (not doubled)", async () => {
    await addContact({
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR }],
    });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches[0].mergedWallets).toHaveLength(1);
  });

  it("includes new wallets in mergedWallets for overlap match", async () => {
    await addContact({
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR }],
    });
    const withExtra: SharePayload = {
      v: 1,
      t: "contact",
      data: { name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR }, { chainId: 1, address: ADDR2 }] },
    };
    const result = await importSharePayload(withExtra) as ContactImportReview;
    expect(result.matches[0].mergedWallets).toHaveLength(2);
  });

  it("smart merge: incoming wallet name fills blank existing wallet name", async () => {
    await addContact({
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR }], // no name
    });
    const withName: SharePayload = {
      v: 1,
      t: "contact",
      data: { name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR, name: "Main" }] },
    };
    const result = await importSharePayload(withName) as ContactImportReview;
    const merged = result.matches[0].mergedWallets;
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("Main");
  });

  it("does not overwrite an existing wallet name with incoming", async () => {
    await addContact({
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR, name: "Primary" }],
    });
    const withDifferentName: SharePayload = {
      v: 1,
      t: "contact",
      data: { name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR, name: "Renamed" }] },
    };
    const result = await importSharePayload(withDifferentName) as ContactImportReview;
    expect(result.matches[0].mergedWallets[0].name).toBe("Primary");
  });

  it("returns multiple matches when multiple contacts share the same name+surname", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: null });
    await addContact({ name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR2 }] });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches).toHaveLength(2);
    expect(result.matches.every(m => m.matchReason === "name")).toBe(true);
  });

  it("does not write to store when matches are found", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: null });
    const before = (await getAllContacts()).length;
    await importSharePayload(payload);
    expect((await getAllContacts()).length).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// contact — address match across different names
// ---------------------------------------------------------------------------

describe("importSharePayload — contact address-based match", () => {
  const payload: SharePayload = {
    v: 1,
    t: "contact",
    data: {
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR }],
    },
  };

  it("surfaces a contact with a different name that shares a wallet address", async () => {
    await addContact({ name: "Bob", surname: "Jones", wallets: [{ chainId: 1, address: ADDR }] });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchReason).toBe("address");
    expect(result.matches[0].walletRelationship).toBe("overlap");
  });

  it("address match does not duplicate a contact already found by name", async () => {
    // Same contact matches BOTH by name AND wallet — should appear only once (name match wins)
    await addContact({ name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR }] });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchReason).toBe("name");
  });

  it("returns both a name match and an address match when they are different contacts", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: [{ chainId: 1, address: ADDR2 }] });
    await addContact({ name: "Bob", surname: "Jones", wallets: [{ chainId: 1, address: ADDR }] });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches).toHaveLength(2);
    const reasons = result.matches.map(m => m.matchReason).sort();
    expect(reasons).toEqual(["address", "name"]);
  });

  it("does not surface address matches when incoming has no wallets", async () => {
    await addContact({ name: "Bob", surname: "Jones", wallets: [{ chainId: 1, address: ADDR }] });
    const noWallets: SharePayload = {
      v: 1,
      t: "contact",
      data: { name: "Alice", surname: "Smith", wallets: [] },
    };
    const result = await importSharePayload(noWallets) as ContactImportReview;
    expect(result.matches).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// contact — applyAddNewContact helper
// ---------------------------------------------------------------------------

describe("applyAddNewContact", () => {
  it("writes a new contact to the store", async () => {
    await applyAddNewContact({ name: "Alice", surname: "Smith", wallets: [] });
    const contacts = await getAllContacts();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("Alice");
  });

  it("creates two separate contacts when called twice (no duplicate guard)", async () => {
    await applyAddNewContact({ name: "Alice", surname: "Smith", wallets: [] });
    await applyAddNewContact({ name: "Alice", surname: "Smith", wallets: [] });
    expect(await getAllContacts()).toHaveLength(2);
  });

  it("stores wallets when provided", async () => {
    await applyAddNewContact({ name: "Alice", wallets: [{ chainId: 1, address: ADDR }] });
    const contacts = await getAllContacts();
    expect(contacts[0].wallets).toHaveLength(1);
    expect(contacts[0].wallets![0].address).toBe(ADDR);
  });
});

// ---------------------------------------------------------------------------
// contact — applyContactUpdate helper
// ---------------------------------------------------------------------------

describe("applyContactUpdate", () => {
  it("updates the wallets on the target contact", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: null });
    const [contact] = await getAllContacts();
    await applyContactUpdate(contact.id, [{ chainId: 1, address: ADDR }]);
    const [updated] = await getAllContacts();
    expect(updated.wallets).toHaveLength(1);
    expect(updated.wallets![0].address).toBe(ADDR);
  });
});

// ---------------------------------------------------------------------------
// profile (treated as contact) — always returns review
// ---------------------------------------------------------------------------

describe("importSharePayload — profile", () => {
  const payload: SharePayload = {
    v: 1,
    t: "profile",
    data: {
      name: "Bob",
      wallets: [{ chainId: 11155111, address: ADDR }],
    },
  };

  it("returns mode:review for a profile payload", async () => {
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.mode).toBe("review");
    expect(result.incoming.name).toBe("Bob");
  });

  it("returns a name match for a profile payload when an existing contact matches", async () => {
    await addContact({ name: "Bob", wallets: null });
    const result = await importSharePayload(payload) as ContactImportReview;
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].matchReason).toBe("name");
  });
});

// ---------------------------------------------------------------------------
// contract
// ---------------------------------------------------------------------------

describe("importSharePayload — contract", () => {
  const payload: SharePayload = {
    v: 1,
    t: "contract",
    data: {
      name: "MyToken",
      address: ADDR,
      chainId: 1,
      metadata: { symbol: "MTK" },
    },
  };

  it("creates a new contract", async () => {
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("created");
    const contracts = await getAllContracts();
    expect(contracts[0].name).toBe("MyToken");
  });

  it("returns matched when contract with same chainId+address exists", async () => {
    await addContract({ name: "MyToken", address: ADDR, chainId: 1 });
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("matched");
  });

  it("reports abiOmitted when flag is set", async () => {
    const noAbi: SharePayload = {
      v: 1,
      t: "contract",
      data: { name: "NFT", address: ADDR2, chainId: 137, abiOmitted: true },
    };
    const result = await importSharePayload(noAbi);
    expect((result as any).abiOmitted).toBe(true);
  });

  it("match uses normalized address (case-insensitive)", async () => {
    await addContract({ name: "MyToken", address: ADDR.toUpperCase() as any, chainId: 1 });
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("matched");
  });
});

// ---------------------------------------------------------------------------
// coin
// ---------------------------------------------------------------------------

describe("importSharePayload — coin", () => {
  const payload: SharePayload = {
    v: 1,
    t: "coin",
    data: {
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      chainId: 1,
      address: ADDR,
      type: "ERC20",
    },
  };

  it("creates a new coin", async () => {
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("created");
    const coins = await getAllCoins();
    const found = coins.find(c => c.symbol === "USDC");
    expect(found).toBeDefined();
  });

  it("returns matched when coin with same chainId+address exists", async () => {
    await addCoin({ name: "USDC", symbol: "USDC", decimals: 6, chainId: 1, address: ADDR, type: "ERC20" });
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("matched");
  });
});

// ---------------------------------------------------------------------------
// recovery — returns prefill, does NOT write to any store
// ---------------------------------------------------------------------------

describe("importSharePayload — recovery", () => {
  const payload: SharePayload = {
    v: 1,
    t: "recovery",
    data: {
      name: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      chainId: 11155111,
      recoverableAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      paymaster: "0xcccccccccccccccccccccccccccccccccccccccc",
      threshold: 2,
      status: true,
      participants: [ADDR, ADDR2],
    },
  };

  it("returns mode=prefill", async () => {
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("prefill");
  });

  it("returns the full recovery data object", async () => {
    const result = await importSharePayload(payload) as { mode: "prefill"; data: typeof payload.data };
    expect(result.data.name).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(result.data.chainId).toBe(11155111);
    expect(result.data.threshold).toBe(2);
    expect(result.data.participants).toEqual([ADDR, ADDR2]);
  });

  it("does not write to any store", async () => {
    const contactsBefore = (await getAllContacts()).length;
    const contractsBefore = (await getAllContracts()).length;
    const coinsBefore = (await getAllCoins()).length;
    await importSharePayload(payload);
    expect((await getAllContacts()).length).toBe(contactsBefore);
    expect((await getAllContracts()).length).toBe(contractsBefore);
    expect((await getAllCoins()).length).toBe(coinsBefore);
  });
});

// ---------------------------------------------------------------------------
// txrequest — returns prefill, does NOT write to any store
// ---------------------------------------------------------------------------

describe("importSharePayload — txrequest", () => {
  const transferPayload: SharePayload = {
    v: 1,
    t: "txrequest",
    data: {
      type: "transfer",
      chainId: 11155111,
      sender: ADDR,
      coinAddress: ADDR2,
      coinSymbol: "ETH",
      coinDecimals: 18,
      functionName: "transfer",
      args: { to: ADDR2, amount: "1000000000000000000" },
    },
  };

  const contractPayload: SharePayload = {
    v: 1,
    t: "txrequest",
    data: {
      type: "contract",
      chainId: 1,
      contractAddress: ADDR,
      contractName: "MyVault",
      functionName: "deposit",
      payableValue: "0.01",
    },
  };

  it("returns mode=prefill for transfer request", async () => {
    const result = await importSharePayload(transferPayload);
    expect(result.mode).toBe("prefill");
  });

  it("returns the full transfer data object", async () => {
    const result = await importSharePayload(transferPayload) as { mode: "prefill"; data: typeof transferPayload.data };
    expect(result.data.type).toBe("transfer");
    expect(result.data.chainId).toBe(11155111);
    expect((result.data as any).coinSymbol).toBe("ETH");
    expect((result.data as any).functionName).toBe("transfer");
  });

  it("returns mode=prefill for contract request", async () => {
    const result = await importSharePayload(contractPayload);
    expect(result.mode).toBe("prefill");
  });

  it("returns the full contract data object", async () => {
    const result = await importSharePayload(contractPayload) as { mode: "prefill"; data: typeof contractPayload.data };
    expect(result.data.type).toBe("contract");
    expect((result.data as any).contractName).toBe("MyVault");
    expect((result.data as any).payableValue).toBe("0.01");
  });

  it("does not write to any store", async () => {
    const contactsBefore = (await getAllContacts()).length;
    const contractsBefore = (await getAllContracts()).length;
    const coinsBefore = (await getAllCoins()).length;
    await importSharePayload(transferPayload);
    await importSharePayload(contractPayload);
    expect((await getAllContacts()).length).toBe(contactsBefore);
    expect((await getAllContracts()).length).toBe(contractsBefore);
    expect((await getAllCoins()).length).toBe(coinsBefore);
  });

  it("works with only required fields (minimal partial pre-fill)", async () => {
    const minimal: SharePayload = {
      v: 1,
      t: "txrequest",
      data: { type: "transfer", chainId: 1 },
    };
    const result = await importSharePayload(minimal);
    expect(result.mode).toBe("prefill");
  });
});
