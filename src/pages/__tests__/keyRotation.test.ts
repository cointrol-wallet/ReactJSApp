import { describe, it, expect } from "vitest";
import type { KeypairMeta } from "@/storage/keyStore";

// ---------------------------------------------------------------------------
// Helpers — mirrors the filter logic in RotateKeyModal and ArchivedKeySignModal
// ---------------------------------------------------------------------------

function availableForRotation(keypairs: KeypairMeta[], currentId: string): KeypairMeta[] {
  const current = keypairs.find(k => k.id === currentId);
  return keypairs.filter(
    k =>
      k.id !== currentId &&
      k.level !== "ECC" &&
      !k.archivedAt &&
      k.level === current?.level,
  );
}

function canGenerateRaw(rawInput: string): boolean {
  return rawInput.trim().length > 0;
}

// ---------------------------------------------------------------------------

function kp(overrides: Partial<KeypairMeta> & { id: string; level: KeypairMeta["level"] }): KeypairMeta {
  return { createdAt: 0, ...overrides };
}

describe("availableForRotation filter", () => {
  const current = kp({ id: "current", level: 512 });
  const sameLevelActive = kp({ id: "other-512", level: 512 });
  const archived = kp({ id: "archived-512", level: 512, archivedAt: 1000 });
  const wrongLevel = kp({ id: "other-1024", level: 1024 });
  const ecc = kp({ id: "ecc-key", level: "ECC" });

  const all = [current, sameLevelActive, archived, wrongLevel, ecc];

  it("excludes the current keypair", () => {
    const result = availableForRotation(all, "current");
    expect(result.map(k => k.id)).not.toContain("current");
  });

  it("excludes archived keypairs", () => {
    const result = availableForRotation(all, "current");
    expect(result.map(k => k.id)).not.toContain("archived-512");
  });

  it("excludes keypairs with a different Falcon level", () => {
    const result = availableForRotation(all, "current");
    expect(result.map(k => k.id)).not.toContain("other-1024");
  });

  it("excludes ECC keys", () => {
    const result = availableForRotation(all, "current");
    expect(result.map(k => k.id)).not.toContain("ecc-key");
  });

  it("includes only active keypairs of the same level", () => {
    const result = availableForRotation(all, "current");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("other-512");
  });

  it("returns empty array when no matching keypairs exist", () => {
    expect(availableForRotation([current], "current")).toHaveLength(0);
  });
});

describe("ArchivedKeySignModal raw tab canGenerate guard", () => {
  it("returns false for an empty string", () => {
    expect(canGenerateRaw("")).toBe(false);
  });

  it("returns false for a whitespace-only string", () => {
    expect(canGenerateRaw("   \t\n")).toBe(false);
  });

  it("returns true once any non-whitespace character is present", () => {
    expect(canGenerateRaw("x")).toBe(true);
    expect(canGenerateRaw("  hello  ")).toBe(true);
    expect(canGenerateRaw("0xdeadbeef")).toBe(true);
  });
});
