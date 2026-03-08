import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// In-memory idb-keyval mock
// ---------------------------------------------------------------------------

const { idbStore, FAKE_PK, FAKE_SK } = vi.hoisted(() => ({
  idbStore: new Map<string, unknown>(),
  FAKE_PK: new Uint8Array(897).fill(0x01),   // Falcon-512 pk length
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
  falconKeypairExists,
  getFalconPublicKey,
  getFalconSecretKey,
  generateAndStoreFalconKeypair,
  ensureFalconKeypair,
} from "../keyStore";

// IDB key constants (mirrors keyStore.ts internals)
const LEGACY_KEY = "cointrol:wrappingKey:v1";
const SALT_KEY = "cointrol:wrappingSalt:v2";
const PK_512 = "cointrol:falcon:512:pk:v1";
const SK_512 = "cointrol:falcon:512:sk:v1";
const PK_1024 = "cointrol:falcon:1024:pk:v1";
const SK_1024 = "cointrol:falcon:1024:sk:v1";

beforeEach(async () => {
  idbStore.clear();
  // Always initialise with a test UID so crypto operations can proceed
  await initKeyStore("test-uid-abc123");
});

// ---------------------------------------------------------------------------

describe("falconKeypairExists", () => {
  it("returns false when no keys are stored", async () => {
    expect(await falconKeypairExists(512)).toBe(false);
  });

  it("returns false when only pk is stored (sk missing)", async () => {
    idbStore.set(PK_512, { alg: "falcon", level: 512, cipherText: new Uint8Array(1), iv: new Uint8Array(12), createdAt: 0 });
    expect(await falconKeypairExists(512)).toBe(false);
  });

  it("returns true when both pk and sk records are present", async () => {
    const stub = { alg: "falcon", level: 512, cipherText: new Uint8Array(1), iv: new Uint8Array(12), createdAt: 0 };
    idbStore.set(PK_512, stub);
    idbStore.set(SK_512, stub);
    expect(await falconKeypairExists(512)).toBe(true);
  });
});

describe("generateAndStoreFalconKeypair + getFalconPublicKey / getFalconSecretKey", () => {
  it("stores cipher records for pk and sk after generation", async () => {
    await generateAndStoreFalconKeypair(512);

    expect(idbStore.has(PK_512)).toBe(true);
    expect(idbStore.has(SK_512)).toBe(true);
    expect(idbStore.has(SALT_KEY)).toBe(true); // wrapping salt created on first use
  });

  it("getFalconPublicKey returns the original pk bytes after a round-trip", async () => {
    await generateAndStoreFalconKeypair(512);
    const pk = await getFalconPublicKey(512);

    expect(pk).not.toBeNull();
    expect(pk!).toEqual(FAKE_PK);
  });

  it("getFalconSecretKey returns the original sk bytes after a round-trip", async () => {
    await generateAndStoreFalconKeypair(512);
    const sk = await getFalconSecretKey(512);

    expect(sk).not.toBeNull();
    expect(sk!).toEqual(FAKE_SK);
  });

  it("getFalconPublicKey returns null when no key has been generated", async () => {
    expect(await getFalconPublicKey(512)).toBeNull();
  });

  it("getFalconSecretKey returns null when no key has been generated", async () => {
    expect(await getFalconSecretKey(512)).toBeNull();
  });
});

describe("ensureFalconKeypair", () => {
  it("returns true and stores keys when none exist", async () => {
    const ok = await ensureFalconKeypair(512);
    expect(ok).toBe(true);
    expect(await falconKeypairExists(512)).toBe(true);
  });

  it("returns true without regenerating when keys already exist", async () => {
    const { createFalconWorkerClient } = await import("@/crypto/falconInterface");
    await ensureFalconKeypair(512);
    vi.mocked(createFalconWorkerClient).mockClear();

    const ok = await ensureFalconKeypair(512);
    expect(ok).toBe(true);
    // Worker should not have been called again
    expect(vi.mocked(createFalconWorkerClient)).not.toHaveBeenCalled();
  });
});

describe("initKeyStore — legacy key migration", () => {
  it("deletes legacy key and all cipher records when legacy key is present", async () => {
    // Simulate an older install with a raw stored wrapping key
    idbStore.set(LEGACY_KEY, new Uint8Array(32));
    idbStore.set(PK_512, { alg: "falcon" });
    idbStore.set(SK_512, { alg: "falcon" });
    idbStore.set(PK_1024, { alg: "falcon" });
    idbStore.set(SK_1024, { alg: "falcon" });

    await initKeyStore("new-uid");

    expect(idbStore.has(LEGACY_KEY)).toBe(false);
    expect(idbStore.has(PK_512)).toBe(false);
    expect(idbStore.has(SK_512)).toBe(false);
    expect(idbStore.has(PK_1024)).toBe(false);
    expect(idbStore.has(SK_1024)).toBe(false);
  });

  it("does not delete keys when no legacy key is present", async () => {
    idbStore.set(PK_512, { alg: "falcon" });
    idbStore.set(SK_512, { alg: "falcon" });

    await initKeyStore("fresh-uid");

    expect(idbStore.has(PK_512)).toBe(true);
    expect(idbStore.has(SK_512)).toBe(true);
  });
});

describe("clearKeyStore", () => {
  it("causes subsequent decrypt to throw when keys are present but uid is cleared", async () => {
    // Generate and store keys first so there is a cipher record to decrypt
    await generateAndStoreFalconKeypair(512);
    clearKeyStore();
    // getFalconPublicKey finds the stored record and attempts decryptBytes,
    // which calls loadOrCreateWrappingKey() — that throws because _uid is null
    await expect(getFalconPublicKey(512)).rejects.toThrow(/not initialised/i);
  });

  it("does not throw when called without a prior initKeyStore", () => {
    // clearKeyStore is synchronous and safe to call in any order
    expect(() => clearKeyStore()).not.toThrow();
  });
});
