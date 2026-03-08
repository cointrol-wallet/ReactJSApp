import { describe, it, expect } from "vitest";
import { sortAddresses } from "../addressSorting";
import type { Address } from "@/storage/addressStore";

function addr(name: string, createdAt: number, indexOrder = 0): Address {
  return { id: name, name, createdAt, indexOrder, group: [] } as unknown as Address;
}

const A = addr("Alice", 100, 2);
const B = addr("Bob", 200, 0);
const C = addr("Charlie", 50, 1);

describe("sortAddresses", () => {
  it("nameAsc — alphabetical ascending", () => {
    const result = sortAddresses([C, A, B], "nameAsc");
    expect(result.map(a => a.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("nameDesc — alphabetical descending", () => {
    const result = sortAddresses([A, B, C], "nameDesc");
    expect(result.map(a => a.name)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("createdAsc — oldest first", () => {
    const result = sortAddresses([A, B, C], "createdAsc");
    expect(result.map(a => a.createdAt)).toEqual([50, 100, 200]);
  });

  it("createdDesc — newest first", () => {
    const result = sortAddresses([A, B, C], "createdDesc");
    expect(result.map(a => a.createdAt)).toEqual([200, 100, 50]);
  });

  it("custom — by indexOrder ascending", () => {
    const result = sortAddresses([A, B, C], "custom");
    expect(result.map(a => a.name)).toEqual(["Bob", "Charlie", "Alice"]);
  });

  it("does not mutate the input array", () => {
    const input = [B, A, C];
    sortAddresses(input, "nameAsc");
    expect(input.map(a => a.name)).toEqual(["Bob", "Alice", "Charlie"]);
  });

  it("empty array returns empty array", () => {
    expect(sortAddresses([], "nameAsc")).toEqual([]);
  });

  it("single element returns same element", () => {
    expect(sortAddresses([A], "nameAsc")).toEqual([A]);
  });

  it("default mode is createdAsc", () => {
    const result = sortAddresses([A, B, C]);
    expect(result.map(a => a.createdAt)).toEqual([50, 100, 200]);
  });
});
