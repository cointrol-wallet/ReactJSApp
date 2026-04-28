import { describe, it, expect } from "vitest";
import {
  encodeShareText,
  decodeShareText,
  decodeShareAny,
  COINTROL_TEXT_HEADER,
} from "../shareTextFormat";
import { encodeSharePayload } from "../sharePayload";
import type { SharePayload } from "../sharePayload";

function roundTrip(p: SharePayload): SharePayload {
  return decodeShareText(encodeShareText(p));
}

// ---------------------------------------------------------------------------
// contact
// ---------------------------------------------------------------------------

describe("contact text round-trip", () => {
  const full: SharePayload = {
    v: 1,
    t: "contact",
    data: {
      name: "Alice",
      surname: "Smith",
      wallets: [
        { chainId: 1, address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "Main Wallet" },
        { chainId: 11155111, address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      ],
    },
  };

  it("round-trips a full contact with wallets and wallet names", () => {
    expect(roundTrip(full)).toEqual(full);
  });

  it("round-trips a minimal contact without surname", () => {
    const minimal: SharePayload = { v: 1, t: "contact", data: { name: "Bob" } };
    expect(roundTrip(minimal)).toEqual(minimal);
  });

  it("preserves wallet.name through encode/decode", () => {
    const decoded = roundTrip(full) as Extract<SharePayload, { t: "contact" }>;
    expect(decoded.data.wallets![0].name).toBe("Main Wallet");
  });

  it("first line is COINTROL_TEXT_HEADER", () => {
    expect(encodeShareText(full).split("\n")[0]).toBe(COINTROL_TEXT_HEADER);
  });

  it("encoded text contains 'Type: contact'", () => {
    expect(encodeShareText(full)).toContain("Type: contact");
  });
});

// ---------------------------------------------------------------------------
// contract
// ---------------------------------------------------------------------------

describe("contract text round-trip", () => {
  it("round-trips a contract without metadata", () => {
    const p: SharePayload = {
      v: 1,
      t: "contract",
      data: { name: "MyToken", address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", chainId: 1 },
    };
    expect(roundTrip(p)).toEqual(p);
  });

  it("round-trips a contract with metadata (ABI entries)", () => {
    const p: SharePayload = {
      v: 1,
      t: "contract",
      data: {
        name: "MyToken",
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        chainId: 1,
        metadata: { symbol: "MTK", abi: [{ type: "function", name: "transfer" }] },
      },
    };
    expect(roundTrip(p)).toEqual(p);
  });

  it("decoded contract never has abiOmitted field", () => {
    const p: SharePayload = {
      v: 1,
      t: "contract",
      data: { name: "X", address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", chainId: 1 },
    };
    const decoded = roundTrip(p) as Extract<SharePayload, { t: "contract" }>;
    expect(decoded.data.abiOmitted).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// coin
// ---------------------------------------------------------------------------

describe("coin text round-trip", () => {
  it("round-trips all coin fields", () => {
    const p: SharePayload = {
      v: 1,
      t: "coin",
      data: {
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        chainId: 1,
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        type: "ERC20",
      },
    };
    expect(roundTrip(p)).toEqual(p);
  });
});

// ---------------------------------------------------------------------------
// profile
// ---------------------------------------------------------------------------

describe("profile text round-trip", () => {
  it("preserves wallet.name (folio name) through encode/decode", () => {
    const p: SharePayload = {
      v: 1,
      t: "profile",
      data: {
        name: "My Profile",
        wallets: [
          { chainId: 1, address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", name: "Main Folio" },
          { chainId: 11155111, address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", name: "Test Folio" },
        ],
      },
    };
    expect(roundTrip(p)).toEqual(p);
  });
});

// ---------------------------------------------------------------------------
// recovery
// ---------------------------------------------------------------------------

describe("recovery text round-trip", () => {
  const base: SharePayload = {
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
  };

  it("round-trips recovery with participants", () => {
    expect(roundTrip(base)).toEqual(base);
  });

  it("Status: Enabled decodes to status: true", () => {
    const decoded = roundTrip(base) as Extract<SharePayload, { t: "recovery" }>;
    expect(decoded.data.status).toBe(true);
  });

  it("Status: Disabled decodes to status: false", () => {
    const disabled = { ...base, data: { ...base.data as any, status: false } } as SharePayload;
    const decoded = roundTrip(disabled) as Extract<SharePayload, { t: "recovery" }>;
    expect(decoded.data.status).toBe(false);
  });

  it("round-trips with empty participants array", () => {
    const empty = { ...base, data: { ...base.data as any, participants: [] } } as SharePayload;
    expect(roundTrip(empty)).toEqual(empty);
  });
});

// ---------------------------------------------------------------------------
// txrequest — contract type with Falcon raw hex keys
// ---------------------------------------------------------------------------

describe("txrequest text round-trip — contract with Falcon keys", () => {
  const ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const CHAIN_ID = 11155111;

  // Raw hex: Falcon-512 public key is 1026 bytes, Falcon-1024 is 2050 bytes
  function makeRawHex(bytes: number): string {
    return "0x" + "09".repeat(bytes);
  }

  it("Falcon-512 raw key (1026 bytes) survives encode → file → trim → decode", () => {
    const p: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: CHAIN_ID,
        contractAddress: ADDR,
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { publicKeyBytes: makeRawHex(1026) },
      },
    };
    expect(decodeShareText(encodeShareText(p).trim())).toEqual(p);
  });

  it("Falcon-1024 raw key (2050 bytes) survives encode → file → trim → decode", () => {
    const p: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: CHAIN_ID,
        contractAddress: ADDR,
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { publicKeyBytes: makeRawHex(2050) },
      },
    };
    expect(decodeShareText(encodeShareText(p).trim())).toEqual(p);
  });

  it("trailing newline in file content: caller trims before passing to decodeShareText", () => {
    const p: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: CHAIN_ID,
        contractAddress: ADDR,
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { publicKeyBytes: makeRawHex(1026) },
      },
    };
    const fileContent = encodeShareText(p) + "\n";
    expect(decodeShareText(fileContent.trim())).toEqual(p);
  });
});

// ---------------------------------------------------------------------------
// txrequest — transfer type
// ---------------------------------------------------------------------------

describe("txrequest text round-trip — transfer", () => {
  it("round-trips a transfer request", () => {
    const p: SharePayload = {
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
        payableValue: "0.01",
      },
    };
    expect(roundTrip(p)).toEqual(p);
  });

  it("preserves underscore-prefixed arg keys verbatim (normalization is the consumer's responsibility)", () => {
    // The text format must not silently strip or rename arg keys.
    // Keys like "_publicKeyBytes" written by legacy builders survive encode→decode unchanged.
    const p: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: 11155111,
        contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        contractName: "QuantumAccount",
        functionName: "updatePublicKey",
        args: { _publicKeyBytes: "0xdeadbeef" },
      },
    };
    const decoded = roundTrip(p) as Extract<SharePayload, { t: "txrequest" }>;
    expect(decoded.data.args!["_publicKeyBytes"]).toBe("0xdeadbeef");
    expect(decoded.data.args!["publicKeyBytes"]).toBeUndefined();
  });

  it("arg keys with multiple leading underscores are preserved verbatim", () => {
    const p: SharePayload = {
      v: 1,
      t: "txrequest",
      data: {
        type: "contract",
        chainId: 1,
        contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        functionName: "foo",
        args: { __newKey: "0xabcd" },
      },
    };
    const decoded = roundTrip(p) as Extract<SharePayload, { t: "txrequest" }>;
    expect(decoded.data.args!["__newKey"]).toBe("0xabcd");
  });
});

// ---------------------------------------------------------------------------
// decodeShareText — error cases
// ---------------------------------------------------------------------------

describe("decodeShareText error cases", () => {
  it("throws on empty string", () => {
    expect(() => decodeShareText("")).toThrow(/Not a Cointrol text file/i);
  });

  it("throws on compressed QR payload (cointrol:// prefix)", () => {
    const compressed = encodeSharePayload({ v: 1, t: "contact", data: { name: "Bob" } });
    expect(() => decodeShareText(compressed)).toThrow(/Not a Cointrol text file/i);
  });

  it("throws on garbage text", () => {
    expect(() => decodeShareText("hello world")).toThrow(/Not a Cointrol text file/i);
  });

  it("throws when separator '---' is missing", () => {
    const noSep = `${COINTROL_TEXT_HEADER}\nType: contact\nName: Bob`;
    expect(() => decodeShareText(noSep)).toThrow(/Missing separator/i);
  });

  it("throws when Type is missing from header", () => {
    const noType = `${COINTROL_TEXT_HEADER}\n---\nName: Bob`;
    expect(() => decodeShareText(noType)).toThrow(/Missing 'Type'/i);
  });

  it("throws when body fails Zod validation (missing required field)", () => {
    const badBody = `${COINTROL_TEXT_HEADER}\nType: coin\n---\nName: Missing\nSymbol: X`;
    expect(() => decodeShareText(badBody)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// decodeShareAny — format detection
// ---------------------------------------------------------------------------

describe("decodeShareAny format detection", () => {
  it("decodes text format correctly", () => {
    const p: SharePayload = { v: 1, t: "contact", data: { name: "Alice" } };
    expect(decodeShareAny(encodeShareText(p))).toEqual(p);
  });

  it("falls back to compressed format for QR payloads", () => {
    const p: SharePayload = { v: 1, t: "contact", data: { name: "Alice" } };
    expect(decodeShareAny(encodeSharePayload(p))).toEqual(p);
  });

  it("falls back to compressed format when text has whitespace prefix", () => {
    const p: SharePayload = { v: 1, t: "contact", data: { name: "Alice" } };
    const compressed = encodeSharePayload(p);
    expect(decodeShareAny(compressed)).toEqual(p);
  });
});

// ---------------------------------------------------------------------------
// Header format
// ---------------------------------------------------------------------------

describe("encodeShareText header format", () => {
  it("first line is exactly COINTROL_TEXT_HEADER", () => {
    const p: SharePayload = { v: 1, t: "contact", data: { name: "X" } };
    const lines = encodeShareText(p).split("\n");
    expect(lines[0]).toBe(COINTROL_TEXT_HEADER);
  });

  it("contains 'Type: txrequest' for txrequest payload", () => {
    const p: SharePayload = { v: 1, t: "txrequest", data: { type: "transfer", chainId: 1 } };
    expect(encodeShareText(p)).toContain("Type: txrequest");
  });

  it("contains 'Source: Cointrol'", () => {
    const p: SharePayload = { v: 1, t: "contact", data: { name: "X" } };
    expect(encodeShareText(p)).toContain("Source: Cointrol");
  });
});
