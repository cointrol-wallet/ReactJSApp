import { describe, it, expect } from "vitest";
import { packedToRaw, rawToPacked } from "../falconUtils";

// Build a mock raw Falcon public key with all coefficients set to a given value.
// Coefficient values must fit in 14 bits (< 16384).
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

// Build a mock raw key with varied coefficient values to exercise bit-packing.
function makeMockRawVaried(level: 512 | 1024): Uint8Array {
  const out = new Uint8Array(2 + level * 2);
  out[0] = level === 512 ? 0x09 : 0x0A;
  out[1] = 0x01;
  for (let i = 0; i < level; i++) {
    // Use values 0–8191 cycling to stay within 14-bit range (< 16384)
    const coeff = i % 8192;
    out[2 + 2 * i] = (coeff >> 8) & 0xFF;
    out[2 + 2 * i + 1] = coeff & 0xFF;
  }
  return out;
}

describe("rawToPacked output size", () => {
  it("Falcon-512 packed is 897 bytes", () => {
    const raw = makeMockRaw(512);
    expect(rawToPacked(raw, 512).length).toBe(897);
  });

  it("Falcon-1024 packed is 1793 bytes", () => {
    const raw = makeMockRaw(1024);
    expect(rawToPacked(raw, 1024).length).toBe(1793);
  });
});

describe("packedToRaw output size", () => {
  it("Falcon-512 raw is 1026 bytes", () => {
    const raw = makeMockRaw(512);
    const packed = rawToPacked(raw, 512);
    expect(packedToRaw(packed, 512).length).toBe(1026);
  });

  it("Falcon-1024 raw is 2050 bytes", () => {
    const raw = makeMockRaw(1024);
    const packed = rawToPacked(raw, 1024);
    expect(packedToRaw(packed, 1024).length).toBe(2050);
  });
});

describe("rawToPacked → packedToRaw round-trip (Falcon-512)", () => {
  it("recovers original bytes with uniform coefficients", () => {
    const raw = makeMockRaw(512, 42);
    const result = packedToRaw(rawToPacked(raw, 512), 512);
    expect(result).toEqual(raw);
  });

  it("recovers original bytes with varied coefficients", () => {
    const raw = makeMockRawVaried(512);
    const result = packedToRaw(rawToPacked(raw, 512), 512);
    expect(result).toEqual(raw);
  });

  it("preserves type header bytes [0x09, 0x01]", () => {
    const raw = makeMockRaw(512, 100);
    const result = packedToRaw(rawToPacked(raw, 512), 512);
    expect(result[0]).toBe(0x09);
    expect(result[1]).toBe(0x01);
  });
});

describe("rawToPacked → packedToRaw round-trip (Falcon-1024)", () => {
  it("recovers original bytes with uniform coefficients", () => {
    const raw = makeMockRaw(1024, 99);
    const result = packedToRaw(rawToPacked(raw, 1024), 1024);
    expect(result).toEqual(raw);
  });

  it("recovers original bytes with varied coefficients", () => {
    const raw = makeMockRawVaried(1024);
    const result = packedToRaw(rawToPacked(raw, 1024), 1024);
    expect(result).toEqual(raw);
  });

  it("preserves type header bytes [0x0A, 0x01]", () => {
    const raw = makeMockRaw(1024, 7);
    const result = packedToRaw(rawToPacked(raw, 1024), 1024);
    expect(result[0]).toBe(0x0A);
    expect(result[1]).toBe(0x01);
  });
});
