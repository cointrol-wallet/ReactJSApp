import { describe, it, expect } from "vitest";
import {
  encodeSharePayload,
  decodeSharePayload,
  SHARE_PREFIX,
  type SharePayload,
} from "../sharePayload";

// ---------------------------------------------------------------------------
// Round-trip helpers
// ---------------------------------------------------------------------------

function roundTrip(payload: SharePayload): SharePayload {
  return decodeSharePayload(encodeSharePayload(payload));
}

// ---------------------------------------------------------------------------
// contact
// ---------------------------------------------------------------------------

describe("contact payload round-trip", () => {
  const payload: SharePayload = {
    v: 1,
    t: "contact",
    data: {
      name: "Alice",
      surname: "Smith",
      wallets: [{ chainId: 11155111, address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
    },
    meta: { createdAt: 1000, source: "Cointrol" },
  };

  it("decodes to the same object", () => {
    expect(roundTrip(payload)).toEqual(payload);
  });

  it("encoded string starts with SHARE_PREFIX", () => {
    expect(encodeSharePayload(payload).startsWith(SHARE_PREFIX)).toBe(true);
  });

  it("works without optional fields", () => {
    const minimal: SharePayload = { v: 1, t: "contact", data: { name: "Bob" }, meta: undefined };
    expect(roundTrip(minimal)).toEqual(minimal);
  });
});

// ---------------------------------------------------------------------------
// contract
// ---------------------------------------------------------------------------

describe("contract payload round-trip", () => {
  const payload: SharePayload = {
    v: 1,
    t: "contract",
    data: {
      name: "MyToken",
      address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      chainId: 1,
      metadata: { symbol: "MTK" },
    },
    meta: { source: "Cointrol" },
  };

  it("decodes to the same object", () => {
    expect(roundTrip(payload)).toEqual(payload);
  });

  it("preserves abiOmitted flag", () => {
    const noAbi: SharePayload = {
      v: 1,
      t: "contract",
      data: { name: "NFT", address: "0xcccccccccccccccccccccccccccccccccccccccc", chainId: 137, abiOmitted: true },
    };
    expect(roundTrip(noAbi)).toEqual(noAbi);
  });
});

// ---------------------------------------------------------------------------
// profile
// ---------------------------------------------------------------------------

describe("profile payload round-trip", () => {
  it("decodes to the same object", () => {
    const payload: SharePayload = {
      v: 1,
      t: "profile",
      data: {
        name: "MyProfile",
        wallets: [
          { chainId: 1, address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
          { chainId: 11155111, address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
        ],
      },
      meta: { createdAt: 2000 },
    };
    expect(roundTrip(payload)).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// coin
// ---------------------------------------------------------------------------

describe("coin payload round-trip", () => {
  it("decodes to the same object", () => {
    const payload: SharePayload = {
      v: 1,
      t: "coin",
      data: {
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        chainId: 1,
        address: "0xdddddddddddddddddddddddddddddddddddddddd",
        type: "ERC20",
      },
      meta: { source: "Cointrol" },
    };
    expect(roundTrip(payload)).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// recovery
// ---------------------------------------------------------------------------

describe("recovery payload round-trip", () => {
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
      participants: [
        "0xdddddddddddddddddddddddddddddddddddddddd",
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      ],
    },
    meta: { createdAt: 1000, source: "Cointrol" },
  };

  it("decodes to the same object", () => {
    expect(roundTrip(payload)).toEqual(payload);
  });

  it("encoded string starts with SHARE_PREFIX", () => {
    expect(encodeSharePayload(payload).startsWith(SHARE_PREFIX)).toBe(true);
  });

  it("works with an empty participants array", () => {
    const minimal: SharePayload = {
      v: 1,
      t: "recovery",
      data: {
        name: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        chainId: 1,
        recoverableAddress: "",
        paymaster: "",
        threshold: 1,
        status: false,
        participants: [],
      },
    };
    expect(roundTrip(minimal)).toEqual(minimal);
  });

  it("works without optional meta field", () => {
    const noMeta: SharePayload = {
      v: 1,
      t: "recovery",
      data: {
        name: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        chainId: 1,
        recoverableAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        paymaster: "0xcccccccccccccccccccccccccccccccccccccccc",
        threshold: 1,
        status: false,
        participants: [],
      },
    };
    expect(roundTrip(noMeta)).toEqual(noMeta);
  });
});

// ---------------------------------------------------------------------------
// txrequest
// ---------------------------------------------------------------------------

describe("txrequest payload round-trip", () => {
  it("round-trips a full transfer request", () => {
    const payload: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "transfer",
        chainId: 11155111,
        sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        coinAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        coinSymbol: "USDC",
        coinDecimals: 6,
        functionName: "transfer",
        args: { to: "0xcccccccccccccccccccccccccccccccccccccccc", amount: "1000000" },
      },
      meta: { source: "Cointrol" },
    };
    expect(roundTrip(payload)).toEqual(payload);
  });

  it("round-trips a full contract request", () => {
    const payload: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: 1,
        sender: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        contractName: "MyVault",
        functionName: "deposit",
        args: { amount: "500" },
        payableValue: "0.01",
      },
      meta: { createdAt: 2000 },
    };
    expect(roundTrip(payload)).toEqual(payload);
  });

  it("round-trips with only required fields (partial pre-fill)", () => {
    const payload: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "transfer",
        chainId: 11155111,
      },
    };
    expect(roundTrip(payload)).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// txrequest QR size — Falcon key encoding
// ---------------------------------------------------------------------------

describe("txrequest QR size with Falcon keys", () => {
  const ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const CHAIN_ID = 11155111;

  // Non-repetitive hex simulates real Falcon key entropy so LZ-string cannot compress it.
  function nonRepetitiveHex(bytes: number): string {
    let h = "0x";
    for (let i = 1; i <= bytes; i++) {
      h += ((Math.imul(i, 0x9E3779B9) >>> 24) & 0xFF).toString(16).padStart(2, "0");
    }
    return h;
  }

  it("Falcon-512 raw key (1026 bytes, non-repetitive) fits within QR_CHAR_LIMIT", () => {
    const payload: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: CHAIN_ID,
        contractAddress: ADDR,
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { publicKeyBytes: nonRepetitiveHex(1026) },
      },
    };
    const encoded = encodeSharePayload(payload);
    // LZ-string compression keeps Falcon-512 raw keys within the QR limit.
    expect(encoded.length).toBeLessThanOrEqual(2800);
  });

  it("Falcon-1024 raw key (2050 bytes, non-repetitive) exceeds QR_CHAR_LIMIT — text file is the required transport", () => {
    const payload: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: CHAIN_ID,
        contractAddress: ADDR,
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { publicKeyBytes: nonRepetitiveHex(2050) },
      },
    };
    const encoded = encodeSharePayload(payload);
    expect(encoded.length).toBeGreaterThan(2800);
    console.log(`Falcon-1024 raw QR encoded length: ${encoded.length} (limit: 2800)`);
  });
});

// ---------------------------------------------------------------------------
// decodeSharePayload — error cases
// ---------------------------------------------------------------------------

describe("decodeSharePayload error cases", () => {
  it("throws on empty string", () => {
    expect(() => decodeSharePayload("")).toThrow(/Invalid or unsupported QR payload/i);
  });

  it("throws on garbage text", () => {
    expect(() => decodeSharePayload("not-a-valid-payload")).toThrow();
  });

  it("throws on valid JSON that fails Zod parse", () => {
    const { compressToEncodedURIComponent } = require("lz-string");
    const bad = compressToEncodedURIComponent(JSON.stringify({ v: 2, t: "unknown" }));
    expect(() => decodeSharePayload(bad)).toThrow();
  });

  it("handles payload without prefix (raw compressed string)", () => {
    const payload: SharePayload = { v: 1, t: "contact", data: { name: "Raw" } };
    const encoded = encodeSharePayload(payload);
    const withoutPrefix = encoded.slice(SHARE_PREFIX.length);
    expect(decodeSharePayload(withoutPrefix)).toEqual(payload);
  });
});
