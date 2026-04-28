import { describe, it, expect } from "vitest";
import { buildContactShare, buildContractShare, buildProfileShareFromFolios, buildCoinShare, buildRecoveryShare, buildTxRequestShare } from "../shareBuilders";
import { encodeSharePayload, decodeSharePayload } from "../sharePayload";
import type { Contact } from "@/storage/contactStore";
import type { Contract } from "@/storage/contractStore";
import type { Folio } from "@/storage/folioStore";
import type { Coin } from "@/storage/coinStore";
import type { Recovery } from "@/storage/recoveryStore";

const ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

// ---------------------------------------------------------------------------
// buildContactShare
// ---------------------------------------------------------------------------

describe("buildContactShare", () => {
  const contact = {
    id: "c1",
    name: "Alice",
    surname: "Smith",
    wallets: [
      { chainId: 1, address: ADDR },
      { chainId: 1, address: ADDR },          // duplicate — should be deduped
      { chainId: 11155111, address: ADDR },
    ],
    createdAt: 1000,
  } as unknown as Contact;

  it("sets v=1 and t=contact", () => {
    const p = buildContactShare(contact);
    expect(p.v).toBe(1);
    expect(p.t).toBe("contact");
  });

  it("includes name and surname", () => {
    const p = buildContactShare(contact);
    expect((p.data as any).name).toBe("Alice");
    expect((p.data as any).surname).toBe("Smith");
  });

  it("deduplicates wallets by chainId:address", () => {
    const p = buildContactShare(contact);
    expect((p.data as any).wallets).toHaveLength(2);
  });

  it("sets meta.source to Cointrol", () => {
    const p = buildContactShare(contact);
    expect(p.meta?.source).toBe("Cointrol");
  });

  it("omits wallets when contact has none", () => {
    const noWallet = { ...contact, wallets: undefined } as unknown as Contact;
    const p = buildContactShare(noWallet);
    expect((p.data as any).wallets).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildContractShare
// ---------------------------------------------------------------------------

describe("buildContractShare", () => {
  const base = {
    id: "ct1",
    name: "MyToken",
    address: ADDR,
    chainId: 1,
    createdAt: 1000,
  } as unknown as Contract;

  it("includes name, address, chainId", () => {
    const p = buildContractShare(base);
    expect((p.data as any).name).toBe("MyToken");
    expect((p.data as any).address).toBe(ADDR);
    expect((p.data as any).chainId).toBe(1);
  });

  it("includes metadata when small enough", () => {
    const withMeta = { ...base, metadata: { symbol: "MTK" } } as unknown as Contract;
    const p = buildContractShare(withMeta);
    expect((p.data as any).metadata?.symbol).toBe("MTK");
  });

  it("strips ABI and sets abiOmitted when encoded payload exceeds QR limit", () => {
    const hugeAbi = Array.from({ length: 500 }, (_, i) => ({
      type: "function", name: `fn${i}`, inputs: [], outputs: [],
    }));
    const withHugeAbi = { ...base, metadata: { ABI: hugeAbi, symbol: "BIG" } } as unknown as Contract;
    const p = buildContractShare(withHugeAbi);
    // should NOT include the ABI but may still include other metadata
    expect((p.data as any).metadata?.ABI).toBeUndefined();
  });

  it("encodes successfully even without metadata", () => {
    const p = buildContractShare(base);
    const encoded = encodeSharePayload(p);
    expect(encoded.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// buildProfileShareFromFolios
// ---------------------------------------------------------------------------

describe("buildProfileShareFromFolios", () => {
  const folios = [
    { id: "f1", name: "Main", chainId: 1, address: ADDR, createdAt: 1000 },
    { id: "f2", name: "Sepolia", chainId: 11155111, address: ADDR, createdAt: 2000 },
    { id: "f3", name: "Dup", chainId: 1, address: ADDR, createdAt: 3000 },  // duplicate wallet
  ] as unknown as Folio[];

  it("sets v=1 and t=profile", () => {
    const p = buildProfileShareFromFolios("MyName", folios);
    expect(p.v).toBe(1);
    expect(p.t).toBe("profile");
  });

  it("includes display name", () => {
    const p = buildProfileShareFromFolios("MyName", folios);
    expect((p.data as any).name).toBe("MyName");
  });

  it("deduplicates wallets across folios", () => {
    const p = buildProfileShareFromFolios("MyName", folios);
    expect((p.data as any).wallets).toHaveLength(2);
  });

  it("sets meta.source to Cointrol", () => {
    const p = buildProfileShareFromFolios("MyName", folios);
    expect(p.meta?.source).toBe("Cointrol");
  });
});

// ---------------------------------------------------------------------------
// buildCoinShare
// ---------------------------------------------------------------------------

describe("buildCoinShare", () => {
  const coin = {
    id: "coin1",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    chainId: 1,
    address: ADDR,
    type: "ERC20",
    createdAt: 1000,
  } as unknown as Coin;

  it("sets v=1 and t=coin", () => {
    const p = buildCoinShare(coin);
    expect(p.v).toBe(1);
    expect(p.t).toBe("coin");
  });

  it("includes all coin fields", () => {
    const p = buildCoinShare(coin);
    const d = p.data as any;
    expect(d.name).toBe("USD Coin");
    expect(d.symbol).toBe("USDC");
    expect(d.decimals).toBe(6);
    expect(d.chainId).toBe(1);
    expect(d.address).toBe(ADDR);
    expect(d.type).toBe("ERC20");
  });

  it("round-trips through encode/decode", () => {
    const p = buildCoinShare(coin);
    const encoded = encodeSharePayload(p);
    expect(encoded.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// buildRecoveryShare
// ---------------------------------------------------------------------------

describe("buildRecoveryShare", () => {
  const recovery = {
    id: "recovery:1",
    name: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chainId: 11155111,
    recoverableAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    paymaster: "0xcccccccccccccccccccccccccccccccccccccccc",
    threshold: 2,
    status: true,
    participants: [
      "0xdddddddddddddddddddddddddddddddddddddddd",
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    ],
    createdAt: 1000,
    updatedAt: 1000,
  } as unknown as Recovery;

  it("sets v=1 and t=recovery", () => {
    const p = buildRecoveryShare(recovery);
    expect(p.v).toBe(1);
    expect(p.t).toBe("recovery");
  });

  it("maps all Recovery fields into data", () => {
    const p = buildRecoveryShare(recovery);
    const d = p.data as any;
    expect(d.name).toBe(recovery.name);
    expect(d.chainId).toBe(11155111);
    expect(d.recoverableAddress).toBe(recovery.recoverableAddress);
    expect(d.paymaster).toBe(recovery.paymaster);
    expect(d.threshold).toBe(2);
    expect(d.status).toBe(true);
    expect(d.participants).toEqual(recovery.participants);
  });

  it("sets meta.source to Cointrol", () => {
    const p = buildRecoveryShare(recovery);
    expect(p.meta?.source).toBe("Cointrol");
  });

  it("round-trips through encode/decode", () => {
    const p = buildRecoveryShare(recovery);
    const decoded = decodeSharePayload(encodeSharePayload(p));
    expect(decoded).toEqual(p);
  });

  it("handles empty participants array", () => {
    const noParticipants = { ...recovery, participants: [] } as unknown as Recovery;
    const p = buildRecoveryShare(noParticipants);
    expect((p.data as any).participants).toEqual([]);
  });

  it("handles empty recoverableAddress (pre-deployment)", () => {
    const preDeployment = { ...recovery, recoverableAddress: "" } as unknown as Recovery;
    const p = buildRecoveryShare(preDeployment);
    expect((p.data as any).recoverableAddress).toBe("");
  });
});

// Generate non-repetitive pseudo-random hex using Knuth multiplicative hashing.
// Avoids LZ-string's pattern-matching, which would otherwise compress repetitive
// test data (e.g. "ab".repeat(N)) down to well under the QR limit.
function nonRepetitiveHex(bytes: number): string {
  let h = "0x";
  for (let i = 1; i <= bytes; i++) {
    h += ((Math.imul(i, 0x9E3779B9) >>> 24) & 0xFF).toString(16).padStart(2, "0");
  }
  return h;
}

function nonRepetitiveAddress(seed: number): string {
  let h = "0x";
  for (let i = 1; i <= 20; i++) {
    h += ((Math.imul(seed * 20 + i, 0x9E3779B9) >>> 24) & 0xFF).toString(16).padStart(2, "0");
  }
  return h;
}

// ---------------------------------------------------------------------------
// buildContactShare — size guard
// ---------------------------------------------------------------------------

describe("buildContactShare size guard", () => {
  it("does not throw for a contact with a handful of wallets", () => {
    const small = {
      id: "c1",
      name: "Alice",
      wallets: [
        { chainId: 1, address: ADDR },
        { chainId: 11155111, address: ADDR },
      ],
      createdAt: 1000,
    } as unknown as Contact;
    expect(() => buildContactShare(small)).not.toThrow();
  });

  it("throws when contact has so many unique-address wallets that the payload exceeds QR capacity", () => {
    // Use non-repetitive addresses so LZ-string cannot compress the payload.
    const manyWallets = Array.from({ length: 80 }, (_, i) => ({
      chainId: 11155111,
      address: nonRepetitiveAddress(i),
      name: `W${i}`,
    }));
    const big = {
      id: "c2",
      name: "BigContact",
      wallets: manyWallets,
      createdAt: 1000,
    } as unknown as Contact;
    expect(() => buildContactShare(big)).toThrow(/too many wallets/i);
  });
});

// ---------------------------------------------------------------------------
// buildTxRequestShare — size guard
// ---------------------------------------------------------------------------

describe("buildTxRequestShare size guard", () => {
  it("throws when args make the payload exceed QR capacity", () => {
    // Use non-repetitive hex so LZ-string cannot compress it below the QR limit.
    const hugeArg = nonRepetitiveHex(2100);
    expect(() =>
      buildTxRequestShare({
        type: "contract",
        chainId: 11155111,
        contractAddress: ADDR,
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { publicKeyBytes: hugeArg },
      })
    ).toThrow(/too large/i);
  });
});

// ---------------------------------------------------------------------------
// buildTxRequestShare
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Arg key regression: builders must use stripped keys (no leading underscores)
// ---------------------------------------------------------------------------

describe("buildTxRequestShare — arg key format", () => {
  it("migrate-account payload uses 'publicKeyBytes' not '_publicKeyBytes'", () => {
    // Regression guard for MigrateAccountModal.handleGenerateKey fix.
    // getInputName strips leading underscores, so keys in txrequest args must
    // match the stripped form or the import pre-fill will silently fail.
    const p = buildTxRequestShare({
      type: "contract",
      chainId: 11155111,
      contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      contractName: "QuantumAccount",
      functionName: "updatePublicKey",
      args: { publicKeyBytes: "0xdeadbeef" },
    });
    const args = (p.data as any).args ?? {};
    expect(args["publicKeyBytes"]).toBe("0xdeadbeef");
    expect(args["_publicKeyBytes"]).toBeUndefined();
  });

  it("recover-wallet payload uses 'newKey' not '_newKey'", () => {
    // Regression guard for InitiateRecoveryModal fix.
    const p = buildTxRequestShare({
      type: "contract",
      chainId: 11155111,
      contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      contractName: "Recoverable",
      functionName: "recoverWallet",
      args: { newKey: "0xcafe" },
    });
    const args = (p.data as any).args ?? {};
    expect(args["newKey"]).toBe("0xcafe");
    expect(args["_newKey"]).toBeUndefined();
  });
});

describe("buildTxRequestShare", () => {
  it("sets v=1 and t=txrequest", () => {
    const p = buildTxRequestShare({ type: "transfer", chainId: 1 });
    expect(p.v).toBe(1);
    expect(p.t).toBe("txrequest");
  });

  it("includes required fields type and chainId", () => {
    const p = buildTxRequestShare({ type: "contract", chainId: 11155111 });
    const d = p.data as any;
    expect(d.type).toBe("contract");
    expect(d.chainId).toBe(11155111);
  });

  it("passes through all optional transfer fields", () => {
    const input = {
      type: "transfer" as const,
      chainId: 1,
      sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      coinAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      coinSymbol: "USDC",
      coinDecimals: 6,
      functionName: "transfer",
      args: { to: "0xcccccccccccccccccccccccccccccccccccccccc", amount: "100" },
    };
    const p = buildTxRequestShare(input);
    const d = p.data as any;
    expect(d.sender).toBe(input.sender);
    expect(d.coinAddress).toBe(input.coinAddress);
    expect(d.coinSymbol).toBe("USDC");
    expect(d.coinDecimals).toBe(6);
    expect(d.functionName).toBe("transfer");
    expect(d.args).toEqual(input.args);
  });

  it("passes through all optional contract fields", () => {
    const input = {
      type: "contract" as const,
      chainId: 1,
      contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      contractName: "MyVault",
      functionName: "deposit",
      payableValue: "0.05",
    };
    const p = buildTxRequestShare(input);
    const d = p.data as any;
    expect(d.contractAddress).toBe(input.contractAddress);
    expect(d.contractName).toBe("MyVault");
    expect(d.payableValue).toBe("0.05");
  });

  it("sets meta.source to Cointrol", () => {
    const p = buildTxRequestShare({ type: "transfer", chainId: 1 });
    expect(p.meta?.source).toBe("Cointrol");
  });

  it("round-trips through encode/decode with full transfer payload", () => {
    const input = {
      type: "transfer" as const,
      chainId: 11155111,
      sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      coinAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      coinSymbol: "ETH",
      coinDecimals: 18,
      functionName: "transfer",
      args: { to: "0xcccccccccccccccccccccccccccccccccccccccc", amount: "1000000000000000000" },
    };
    const p = buildTxRequestShare(input);
    const decoded = decodeSharePayload(encodeSharePayload(p));
    expect(decoded).toEqual(p);
  });
});
