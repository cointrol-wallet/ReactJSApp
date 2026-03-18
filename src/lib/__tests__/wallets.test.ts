import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks for wallets.ts dependencies
// ---------------------------------------------------------------------------

vi.mock("@/crypto/falconInterface", () => ({
  createFalconWorkerClient: vi.fn().mockReturnValue({
    sign: vi.fn().mockResolvedValue(new Uint8Array([0xde, 0xad])),
    terminate: vi.fn(),
    init: vi.fn(),
    verify: vi.fn(),
    generateKeypair: vi.fn(),
  }),
}));

vi.mock("@/storage/keyStore", () => ({
  isKeyStoreInitialised: vi.fn().mockReturnValue(true),
  getPublicKey: vi.fn().mockResolvedValue(new Uint8Array([0x01, 0x02])),
  getSecretKey: vi.fn().mockResolvedValue(new Uint8Array([0x05, 0x06])),
  listKeypairs: vi.fn().mockResolvedValue([{ id: "key-1", level: 512, createdAt: 0 }]),
  initKeyStore: vi.fn(),
  clearKeyStore: vi.fn(),
}));

vi.mock("@/lib/submitTransaction", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/submitTransaction")>();
  return {
    ...mod,
    PaymasterAPI: {
      createNewAccount: vi.fn().mockResolvedValue({ success: true, result: "ok" }),
    },
  };
});

vi.mock("@/lib/bytesEncoder", () => ({
  createAccountToBytes: vi.fn().mockReturnValue(new Uint8Array([0xab, 0xcd])),
}));

vi.mock("@/storage/domainStore", () => ({
  getAllDomains: vi.fn().mockResolvedValue([{
    name: "ETHEREUM SEPOLIA",
    chainId: 11155111,
    entryPoint: "0xentrypoint",
    paymaster: "0xpaymaster",
    bundler: "0xbundler",
    rpcUrl: "http://localhost:8545",
    transactionUrl: "http://localhost/tx/",
    createdAt: 0,
    updatedAt: 0,
  }]),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    bytesToHex: (b: Uint8Array) => ("0x" + Buffer.from(b).toString("hex")) as `0x${string}`,
    stringToHex: (s: string) => ("0x" + Buffer.from(s).toString("hex")) as `0x${string}`,
  };
});

import { isKeyStoreInitialised } from "@/storage/keyStore";
import { initWallet } from "../wallets";

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isKeyStoreInitialised).mockReturnValue(true);
});

// ---------------------------------------------------------------------------

describe("initWallet", () => {
  it("resolves without throwing when keyStore is initialised", async () => {
    await expect(initWallet()).resolves.toBeUndefined();
  });

  it("throws when keyStore is not initialised", async () => {
    vi.mocked(isKeyStoreInitialised).mockReturnValue(false);
    await expect(initWallet()).rejects.toThrow(/not initialised/i);
  });
});
