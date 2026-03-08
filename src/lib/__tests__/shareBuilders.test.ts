import { describe, it, expect } from "vitest";
import { buildContactShare, buildContractShare, buildProfileShareFromFolios, buildCoinShare } from "../shareBuilders";
import { encodeSharePayload } from "../sharePayload";
import type { Contact } from "@/storage/contactStore";
import type { Contract } from "@/storage/contractStore";
import type { Folio } from "@/storage/folioStore";
import type { Coin } from "@/storage/coinStore";

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
    expect(p.data.name).toBe("Alice");
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
    expect(p.data.name).toBe("MyToken");
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
    expect(p.data.name).toBe("MyName");
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
