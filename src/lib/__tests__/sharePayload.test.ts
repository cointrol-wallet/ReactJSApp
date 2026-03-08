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
