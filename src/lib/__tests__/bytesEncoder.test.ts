import { describe, it, expect } from "vitest";
import { createAccountToBytes, hexToBuffer } from "../bytesEncoder";

const SENDER = "0x1111111111111111111111111111111111111111";
const PUBLIC_KEY = "0x" + "ab".repeat(897);
const SALT = "0x" + "cc".repeat(2);
const DOMAIN = "test.domain";

const BASE = { sender: SENDER, domain: DOMAIN, publicKey: PUBLIC_KEY, salt: SALT };

// ---------------------------------------------------------------------------
// createAccountToBytes
// ---------------------------------------------------------------------------

describe("createAccountToBytes", () => {
  it("returns a non-empty Uint8Array", () => {
    const result = createAccountToBytes(BASE);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("is deterministic — same inputs always produce same output", () => {
    const a = createAccountToBytes(BASE);
    const b = createAccountToBytes(BASE);
    expect(a).toEqual(b);
  });

  it("produces different output for different sender", () => {
    const other = createAccountToBytes({
      ...BASE,
      sender: "0x2222222222222222222222222222222222222222",
    });
    expect(createAccountToBytes(BASE)).not.toEqual(other);
  });

  it("produces different output for different domain", () => {
    const other = createAccountToBytes({ ...BASE, domain: "other.domain" });
    expect(createAccountToBytes(BASE)).not.toEqual(other);
  });

  it("produces different output for different publicKey", () => {
    const other = createAccountToBytes({ ...BASE, publicKey: "0x" + "dd".repeat(897) });
    expect(createAccountToBytes(BASE)).not.toEqual(other);
  });

  it("produces different output for different salt", () => {
    const other = createAccountToBytes({ ...BASE, salt: "0x" + "ff".repeat(2) });
    expect(createAccountToBytes(BASE)).not.toEqual(other);
  });

  it("total length equals sum of component byte lengths", () => {
    const result = createAccountToBytes(BASE);
    const senderLen = 20;                          // 20-byte address
    const domainLen = new TextEncoder().encode(DOMAIN).length;
    const pubKeyLen = 897;
    const saltLen = 2;
    expect(result.length).toBe(senderLen + domainLen + pubKeyLen + saltLen);
  });
});

// ---------------------------------------------------------------------------
// hexToBuffer
// ---------------------------------------------------------------------------

describe("hexToBuffer", () => {
  it("converts 0x-prefixed hex to Buffer", () => {
    const buf = hexToBuffer("0xdeadbeef");
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0xde);
    expect(buf[3]).toBe(0xef);
  });

  it("converts non-prefixed hex", () => {
    const buf = hexToBuffer("cafebabe");
    expect(buf.length).toBe(4);
    expect(buf[0]).toBe(0xca);
  });

  it("handles empty hex string", () => {
    expect(hexToBuffer("0x").length).toBe(0);
  });
});
