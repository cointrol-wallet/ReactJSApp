import { describe, it, expect } from "vitest";
import {
  computeNormalizedOrderAfterHide,
  computeIndexOrderForAppend,
} from "../addressOrderHelpers";
import type { Address } from "@/storage/addressStore";

function addr(id: string, indexOrder: number): Address {
  return { id, name: id, indexOrder, isVisible: true, isContact: false, createdAt: 0, updatedAt: 0 } as Address;
}

describe("computeNormalizedOrderAfterHide", () => {
  it("hides a middle item and renumbers remaining 0–3", () => {
    const items = [addr("a", 0), addr("b", 1), addr("c", 2), addr("d", 3), addr("e", 4)];
    const result = computeNormalizedOrderAfterHide(items, "c");
    expect(result.map((p) => p.id)).toEqual(["a", "b", "d", "e"]);
    expect(result.map((p) => p.indexOrder)).toEqual([0, 1, 2, 3]);
  });

  it("hides the first item and renumbers remaining 0–3", () => {
    const items = [addr("a", 0), addr("b", 1), addr("c", 2), addr("d", 3), addr("e", 4)];
    const result = computeNormalizedOrderAfterHide(items, "a");
    expect(result.map((p) => p.id)).toEqual(["b", "c", "d", "e"]);
    expect(result.map((p) => p.indexOrder)).toEqual([0, 1, 2, 3]);
  });

  it("closes gaps — input (0,2,4), hide order=2 → output (0,1)", () => {
    const items = [addr("a", 0), addr("b", 2), addr("c", 4)];
    const result = computeNormalizedOrderAfterHide(items, "b");
    expect(result.map((p) => p.id)).toEqual(["a", "c"]);
    expect(result.map((p) => p.indexOrder)).toEqual([0, 1]);
  });

  it("hiding the only item returns an empty array", () => {
    const result = computeNormalizedOrderAfterHide([addr("a", 0)], "a");
    expect(result).toEqual([]);
  });

  it("id not in list — all items renumbered without crash", () => {
    const items = [addr("a", 0), addr("b", 1), addr("c", 2)];
    const result = computeNormalizedOrderAfterHide(items, "z");
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.indexOrder)).toEqual([0, 1, 2]);
  });

  it("preserves relative order when input is not sorted by indexOrder", () => {
    // c(0) should come before a(1) should come before b(2) — input is shuffled
    const items = [addr("a", 1), addr("b", 2), addr("c", 0)];
    const result = computeNormalizedOrderAfterHide(items, "b");
    expect(result.map((p) => p.id)).toEqual(["c", "a"]);
    expect(result.map((p) => p.indexOrder)).toEqual([0, 1]);
  });
});

describe("computeIndexOrderForAppend", () => {
  it("returns max(indexOrder) + 1 for a populated list", () => {
    const items = [addr("a", 0), addr("b", 2), addr("c", 5)];
    expect(computeIndexOrderForAppend(items)).toBe(6);
  });

  it("returns 0 for an empty list", () => {
    expect(computeIndexOrderForAppend([])).toBe(0);
  });
});
