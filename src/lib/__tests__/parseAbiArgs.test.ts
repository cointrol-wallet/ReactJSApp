import { describe, it, expect } from "vitest";
import { parseAbiArg } from "../parseAbiArgs";
import { rawToPacked } from "@/crypto/falconUtils";
import { bytesToHex } from "viem";

// Build a mock raw Falcon key (1026 or 2050 bytes) with all coefficients = coeff.
function makeMockRaw(level: 512 | 1024, coeff = 1): Uint8Array {
  const out = new Uint8Array(2 + level * 2);
  out[0] = level === 512 ? 0x09 : 0x0A;
  out[1] = 0x01;
  for (let i = 0; i < level; i++) {
    out[2 + 2 * i] = (coeff >> 8) & 0xFF;
    out[2 + 2 * i + 1] = coeff & 0xFF;
  }
  return out;
}

describe("parseAbiArg", () => {
  // --- string ---
  it("returns string as-is for type 'string'", () => {
    expect(parseAbiArg("string", "hello world")).toBe("hello world");
  });

  it("trims whitespace for type 'string'", () => {
    expect(parseAbiArg("string", "  hi  ")).toBe("hi");
  });

  // --- address ---
  it("returns address value as-is", () => {
    const addr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(parseAbiArg("address", addr)).toBe(addr);
  });

  // --- bool ---
  it("converts 'true' to boolean true", () => {
    expect(parseAbiArg("bool", "true")).toBe(true);
  });

  it("converts 'True' (mixed case) to boolean true", () => {
    expect(parseAbiArg("bool", "True")).toBe(true);
  });

  it("converts 'false' to boolean false", () => {
    expect(parseAbiArg("bool", "false")).toBe(false);
  });

  it("converts any non-'true' string to false for bool", () => {
    expect(parseAbiArg("bool", "yes")).toBe(false);
    expect(parseAbiArg("bool", "1")).toBe(false);
  });

  // --- uint / int ---
  it("converts uint256 string to BigInt", () => {
    expect(parseAbiArg("uint256", "1000000")).toBe(1000000n);
  });

  it("converts int128 negative string to BigInt", () => {
    expect(parseAbiArg("int128", "-42")).toBe(-42n);
  });

  it("returns 0n for empty uint input", () => {
    expect(parseAbiArg("uint256", "")).toBe(0n);
  });

  // --- bytes: hex pass-through ---
  it("returns bytes32 value as-is", () => {
    const val = "0x" + "ff".repeat(32);
    expect(parseAbiArg("bytes32", val)).toBe(val);
  });

  it("returns bytes value as-is for 0x-prefixed hex", () => {
    expect(parseAbiArg("bytes", "0xdeadbeef")).toBe("0xdeadbeef");
  });

  // --- bytes: packed:0x... Falcon decoding ---
  it("decodes packed:0x... Falcon-512 key to raw Uint8Array", () => {
    const raw = makeMockRaw(512, 5);
    const packed = rawToPacked(raw, 512);
    const arg = `packed:${bytesToHex(packed)}`;
    const result = parseAbiArg("bytes", arg);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(1026);
    expect(result).toEqual(raw);
  });

  it("decodes packed:0x... Falcon-1024 key to raw Uint8Array", () => {
    const raw = makeMockRaw(1024, 9);
    const packed = rawToPacked(raw, 1024);
    const arg = `packed:${bytesToHex(packed)}`;
    const result = parseAbiArg("bytes", arg);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(2050);
    expect(result).toEqual(raw);
  });

  it("throws on packed: prefix with unrecognised key length", () => {
    const badPacked = new Uint8Array(100).fill(0xAB);
    const arg = `packed:${bytesToHex(badPacked)}`;
    expect(() => parseAbiArg("bytes", arg)).toThrow("Unrecognised Falcon packed key length");
  });

  // --- arrays ---
  it("parses address[] from JSON array string", () => {
    const addrs = '["0xaa","0xbb"]';
    expect(parseAbiArg("address[]", addrs)).toEqual(["0xaa", "0xbb"]);
  });

  it("parses string[] from JSON array string", () => {
    expect(parseAbiArg("string[]", '["hello","world"]')).toEqual(["hello", "world"]);
  });

  it("returns empty array for empty input on address[] type", () => {
    expect(parseAbiArg("address[]", "")).toEqual([]);
  });

  it("throws on invalid JSON for array type", () => {
    expect(() => parseAbiArg("address[]", "not-json")).toThrow(/Invalid array JSON/i);
  });

  // --- fallback ---
  it("returns raw string for unknown type", () => {
    expect(parseAbiArg("tuple", "something")).toBe("something");
  });
});
