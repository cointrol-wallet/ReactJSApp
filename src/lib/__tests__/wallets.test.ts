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
  getFalconPublicKey: vi.fn().mockResolvedValue(new Uint8Array([0x01, 0x02])),
  getSecretKey: vi.fn().mockResolvedValue(new Uint8Array([0x05, 0x06])),
  getFalconSecretKey: vi.fn().mockResolvedValue(new Uint8Array([0x05, 0x06])),
  ensureFalconKeypair: vi.fn().mockResolvedValue(true),
  getAddress: vi.fn().mockResolvedValue("0xabcdef1234567890abcdef1234567890abcdef12"),
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

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    bytesToHex: (b: Uint8Array) => ("0x" + Buffer.from(b).toString("hex")) as `0x${string}`,
    stringToHex: (s: string) => ("0x" + Buffer.from(s).toString("hex")) as `0x${string}`,
  };
});

import { ensureFalconKeypair, getAddress } from "@/storage/keyStore";
import { initWallet } from "../wallets";

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureFalconKeypair).mockResolvedValue(true);
  vi.mocked(getAddress).mockResolvedValue("0xabcdef1234567890abcdef1234567890abcdef12");
});

// ---------------------------------------------------------------------------

describe("initWallet", () => {
  it("returns a string (the quantum account address)", async () => {
    const addr = await initWallet();
    expect(typeof addr).toBe("string");
  });

  it("returns the address provided by getAddress", async () => {
    const expected = "0x1111111111111111111111111111111111111111";
    vi.mocked(getAddress).mockResolvedValue(expected);
    const addr = await initWallet();
    expect(addr).toBe(expected);
  });

  it("calls ensureFalconKeypair before deriving the address", async () => {
    await initWallet();
    expect(ensureFalconKeypair).toHaveBeenCalledOnce();
    // getAddress must be called after ensureFalconKeypair succeeds
    const ensureOrder = vi.mocked(ensureFalconKeypair).mock.invocationCallOrder[0];
    const addressOrder = vi.mocked(getAddress).mock.invocationCallOrder[0];
    expect(addressOrder).toBeGreaterThan(ensureOrder);
  });

  it("throws when ensureFalconKeypair returns false", async () => {
    vi.mocked(ensureFalconKeypair).mockResolvedValue(false);
    await expect(initWallet()).rejects.toThrow();
  });

  it("propagates errors thrown by ensureFalconKeypair", async () => {
    vi.mocked(ensureFalconKeypair).mockRejectedValue(new Error("WASM init failed"));
    await expect(initWallet()).rejects.toThrow("WASM init failed");
  });

  it("throws when getAddress returns a falsy value", async () => {
    vi.mocked(getAddress).mockResolvedValue("");
    await expect(initWallet()).rejects.toThrow();
  });
});
