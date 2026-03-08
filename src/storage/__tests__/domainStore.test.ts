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
  getAllDomains,
  addDomain,
  updateDomain,
  deleteDomain,
  clearDomains,
} from "../domainStore";

const BUILTIN_NAME = "ETHEREUM SEPOLIA";

const BASE_DOMAIN = {
  name: "MY TESTNET",
  chainId: 31337,
  entryPoint: "0xentrypoint",
  paymaster: "0xpaymaster",
  bundler: "0xbundler",
  rpcUrl: "http://localhost:8545",
  transactionUrl: "http://localhost/tx/",
  createdAt: 0,
  updatedAt: 0,
} as const;

beforeEach(() => {
  idbStore.clear();
});

// ---------------------------------------------------------------------------

describe("getAllDomains", () => {
  it("includes the builtin Sepolia domain when user store is empty", async () => {
    const domains = await getAllDomains();
    expect(domains.some(d => d.name === BUILTIN_NAME)).toBe(true);
  });
});

describe("addDomain", () => {
  it("creates a user domain; getAllDomains includes builtins + new domain", async () => {
    await addDomain(BASE_DOMAIN);

    // addDomain returns user domains only; getAllDomains merges in builtins
    const all = await getAllDomains();
    expect(all.some(d => d.name === BUILTIN_NAME)).toBe(true);
    const mine = all.find(d => d.name === "MY TESTNET")!;
    expect(mine).toBeDefined();
    expect(mine.chainId).toBe(31337);
    expect(mine.rpcUrl).toBe("http://localhost:8545");
  });

  it("timestamps are set from Date.now(), ignoring input values", async () => {
    const result = await addDomain(BASE_DOMAIN);
    const mine = result.find(d => d.name === "MY TESTNET")!;
    expect(mine.createdAt).toBeGreaterThan(0);
    expect(mine.updatedAt).toBeGreaterThan(0);
  });

  it("appends a second domain without removing the first", async () => {
    await addDomain(BASE_DOMAIN);
    const result = await addDomain({ ...BASE_DOMAIN, name: "SECOND NET", chainId: 99 });
    const userDomains = result.filter(d => d.name !== BUILTIN_NAME);
    expect(userDomains).toHaveLength(2);
  });
});

describe("updateDomain", () => {
  it("patches the matching domain by name and updates updatedAt", async () => {
    const added = await addDomain(BASE_DOMAIN);
    const before = added.find(d => d.name === "MY TESTNET")!.updatedAt;

    await new Promise(r => setTimeout(r, 2));
    const result = await updateDomain("MY TESTNET", { rpcUrl: "http://localhost:9999" });

    const updated = result.find(d => d.name === "MY TESTNET")!;
    expect(updated.rpcUrl).toBe("http://localhost:9999");
    expect(updated.updatedAt).toBeGreaterThan(before);
  });

  it("leaves other domains unchanged", async () => {
    await addDomain(BASE_DOMAIN);
    await addDomain({ ...BASE_DOMAIN, name: "SECOND NET", chainId: 99 });

    await updateDomain("MY TESTNET", { rpcUrl: "http://new" });
    const all = await getAllDomains();
    expect(all.find(d => d.name === "SECOND NET")?.rpcUrl).toBe("http://localhost:8545");
  });
});

describe("deleteDomain", () => {
  it("removes a user domain by name", async () => {
    await addDomain(BASE_DOMAIN);
    const result = await deleteDomain("MY TESTNET");
    expect(result.some(d => d.name === "MY TESTNET")).toBe(false);
  });

  it("builtin domain cannot be removed via deleteDomain", async () => {
    await deleteDomain(BUILTIN_NAME);
    const domains = await getAllDomains();
    expect(domains.some(d => d.name === BUILTIN_NAME)).toBe(true);
  });
});

describe("clearDomains", () => {
  it("removes user domains; builtin remains", async () => {
    await addDomain(BASE_DOMAIN);
    await clearDomains();

    const domains = await getAllDomains();
    expect(domains.every(d => d.name !== "MY TESTNET")).toBe(true);
    expect(domains.some(d => d.name === BUILTIN_NAME)).toBe(true);
  });
});
