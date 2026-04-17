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

import { importSharePayload } from "../shareImporters";
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

// ---------------------------------------------------------------------------
// contact
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

  it("creates a new contact when none exists", async () => {
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("created");
    const contacts = await getAllContacts();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("Alice");
  });

  it("returns matched and merges wallets when contact already exists", async () => {
    await addContact({ name: "Alice", surname: "Smith", wallets: null });

    const result = await importSharePayload(payload);
    expect(result.mode).toBe("matched");
    expect((result as any).mergedWallets).toHaveLength(1);
  });

  it("deduplicates wallets by chainId:address on merge", async () => {
    await addContact({
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 1, address: ADDR }],
    });

    const result = await importSharePayload(payload); // same wallet
    expect(result.mode).toBe("matched");
    expect((result as any).mergedWallets).toHaveLength(1); // not doubled
  });

  it("match is case-insensitive on name and surname", async () => {
    await addContact({ name: "ALICE", surname: "SMITH", wallets: null });
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("matched");
  });
});

// ---------------------------------------------------------------------------
// profile (treated as contact)
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

  it("creates a new contact from profile payload", async () => {
    const result = await importSharePayload(payload);
    expect(result.mode).toBe("created");
    const contacts = await getAllContacts();
    expect(contacts[0].name).toBe("Bob");
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
