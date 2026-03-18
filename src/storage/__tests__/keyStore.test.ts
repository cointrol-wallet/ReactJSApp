import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// In-memory idb-keyval mock
// ---------------------------------------------------------------------------

const { idbStore, FAKE_PK, FAKE_SK } = vi.hoisted(() => ({
  idbStore: new Map<string, unknown>(),
  FAKE_PK: new Uint8Array(1026).fill(0x01),  // Falcon-512 raw uint16 format (2-byte header + 512×2)
  FAKE_SK: new Uint8Array(1281).fill(0x02),  // Falcon-512 sk length
}));

vi.mock("idb-keyval", () => ({
  get: vi.fn((k: string) => Promise.resolve(idbStore.get(k))),
  set: vi.fn((k: string, v: unknown) => { idbStore.set(k, v); return Promise.resolve(); }),
  del: vi.fn((k: string) => { idbStore.delete(k); return Promise.resolve(); }),
}));

// ---------------------------------------------------------------------------
// Falcon worker mock — returns deterministic dummy key bytes
// ---------------------------------------------------------------------------

vi.mock("@/crypto/falconInterface", () => ({
  createFalconWorkerClient: vi.fn().mockReturnValue({
    generateKeypair: vi.fn().mockResolvedValue({ pk: FAKE_PK, sk: FAKE_SK }),
    terminate: vi.fn(),
  }),
}));

// viem utilities used inside keyStore
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    bytesToHex: (b: Uint8Array) => ("0x" + Buffer.from(b).toString("hex")) as `0x${string}`,
    stringToHex: (s: string) => ("0x" + Buffer.from(s).toString("hex")) as `0x${string}`,
  };
});

vi.mock("@/lib/predictQuantumAccountAddress", () => ({
  predictQuantumAccountAddress: vi.fn().mockReturnValue("0xpredicted"),
}));

import {
  initKeyStore,
  clearKeyStore,
  listKeypairs,
  generateAndStoreKeypair,
  getPublicKey,
  getSecretKey,
  KeypairMeta,
} from "../keyStore";

// IDB key constants (mirrors keyStore.ts internals)
const LEGACY_KEY = "cointrol:wrappingKey:v1";
const SALT_KEY   = "cointrol:wrappingSalt:v2";
// Old non-UID-namespaced keys (used only in migration tests)
const PK_512  = "cointrol:falcon:512:pk:v1";
const SK_512  = "cointrol:falcon:512:sk:v1";
const PK_1024 = "cointrol:falcon:1024:pk:v1";
const SK_1024 = "cointrol:falcon:1024:sk:v1";

const TEST_UID = "test-uid-abc123";
const POOL_KEY = `cointrol:keypairs:v1:${TEST_UID}`;

beforeEach(async () => {
  idbStore.clear();
  await initKeyStore(TEST_UID);
});

// ---------------------------------------------------------------------------

describe("listKeypairs", () => {
  it("returns an empty array when no keypairs are stored", async () => {
    const kps = await listKeypairs();
    expect(kps).toEqual([]);
  });

  it("returns keypair metadata after generating one", async () => {
    await generateAndStoreKeypair(512);
    const kps = await listKeypairs();
    expect(kps).toHaveLength(1);
    expect(kps[0].level).toBe(512);
    expect(typeof kps[0].id).toBe("string");
    expect(typeof kps[0].createdAt).toBe("number");
  });

  it("returns only metadata (no pk/sk cipher records)", async () => {
    await generateAndStoreKeypair(512, "my label");
    const kps = await listKeypairs();
    expect(kps[0]).not.toHaveProperty("pk");
    expect(kps[0]).not.toHaveProperty("sk");
    expect(kps[0].label).toBe("my label");
  });
});

describe("generateAndStoreKeypair", () => {
  it("appends a keypair to the pool and stores cipher records", async () => {
    const meta = await generateAndStoreKeypair(512);

    expect(meta.level).toBe(512);
    expect(typeof meta.id).toBe("string");
    expect(idbStore.has(POOL_KEY)).toBe(true);
    expect(idbStore.has(SALT_KEY)).toBe(true);

    const pool = idbStore.get(POOL_KEY) as any[];
    expect(pool).toHaveLength(1);
    expect(pool[0].pk).toBeDefined();
    expect(pool[0].sk).toBeDefined();
  });

  it("accumulates multiple keypairs in the pool", async () => {
    await generateAndStoreKeypair(512, "first");
    await generateAndStoreKeypair(512, "second");
    const kps = await listKeypairs();
    expect(kps).toHaveLength(2);
  });

  it("throws for ECC level", async () => {
    await expect(generateAndStoreKeypair("ECC" as any)).rejects.toThrow(/ECC/i);
  });
});

describe("getPublicKey", () => {
  it("returns the original pk bytes after a round-trip", async () => {
    const meta = await generateAndStoreKeypair(512);
    const pk = await getPublicKey(meta.id);
    expect(pk).not.toBeNull();
    expect(pk!).toEqual(FAKE_PK);
  });

  it("returns null when keypair id is not found", async () => {
    expect(await getPublicKey("nonexistent-id")).toBeNull();
  });
});

describe("getSecretKey", () => {
  it("returns the original sk bytes after a round-trip", async () => {
    const meta = await generateAndStoreKeypair(512);
    const sk = await getSecretKey(meta.id);
    expect(sk).not.toBeNull();
    expect(sk!).toEqual(FAKE_SK);
  });

  it("returns null when keypair id is not found", async () => {
    expect(await getSecretKey("nonexistent-id")).toBeNull();
  });
});

describe("initKeyStore — legacy key migration", () => {
  it("deletes legacy key and all cipher records when legacy key is present", async () => {
    idbStore.set(LEGACY_KEY, new Uint8Array(32));
    idbStore.set(PK_512,  { alg: "falcon" });
    idbStore.set(SK_512,  { alg: "falcon" });
    idbStore.set(PK_1024, { alg: "falcon" });
    idbStore.set(SK_1024, { alg: "falcon" });

    await initKeyStore("new-uid");

    expect(idbStore.has(LEGACY_KEY)).toBe(false);
    expect(idbStore.has(PK_512)).toBe(false);
    expect(idbStore.has(SK_512)).toBe(false);
    expect(idbStore.has(PK_1024)).toBe(false);
    expect(idbStore.has(SK_1024)).toBe(false);
  });

  it("does not delete pool keys when no legacy key is present", async () => {
    const freshUid = "fresh-uid";
    const freshPool = `cointrol:keypairs:v1:${freshUid}`;
    idbStore.set(freshPool, [{ id: "k1", level: 512, createdAt: 0, pk: {}, sk: {} }]);

    await initKeyStore(freshUid);

    expect(idbStore.has(freshPool)).toBe(true);
  });
});

describe("clearKeyStore", () => {
  it("causes subsequent key operations to throw because uid is cleared", async () => {
    const meta = await generateAndStoreKeypair(512);
    clearKeyStore();
    await expect(getPublicKey(meta.id)).rejects.toThrow(/not initialised/i);
  });

  it("does not throw when called without a prior initKeyStore", () => {
    expect(() => clearKeyStore()).not.toThrow();
  });
});
