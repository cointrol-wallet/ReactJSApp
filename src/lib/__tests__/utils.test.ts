import { describe, it, expect } from "vitest";
import { cn, isSimilarFolioName } from "../utils";

describe("cn", () => {
  it("combines class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes (falsy values omitted)", () => {
    expect(cn("foo", false && "bar", undefined, "baz")).toBe("foo baz");
  });

  it("merges tailwind classes correctly (last wins for conflicts)", () => {
    // tailwind-merge: p-4 overrides p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });

  it("handles object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("handles array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});

describe("isSimilarFolioName", () => {
  it("returns false for exact matches (not similar)", () => {
    expect(isSimilarFolioName("main", "main")).toBe(false);
  });

  it("returns true for case variants", () => {
    expect(isSimilarFolioName("Main", "main")).toBe(true);
    expect(isSimilarFolioName("MAIN", "main")).toBe(true);
  });

  it("returns true for singular/plural pairs", () => {
    expect(isSimilarFolioName("wallet", "wallets")).toBe(true);
    expect(isSimilarFolioName("wallets", "wallet")).toBe(true);
    expect(isSimilarFolioName("key", "keys")).toBe(true);
  });

  it("returns true for combined case + plural variants", () => {
    expect(isSimilarFolioName("wallet", "Wallets")).toBe(true);
    expect(isSimilarFolioName("Wallets", "wallet")).toBe(true);
  });

  it("returns false for unrelated names", () => {
    expect(isSimilarFolioName("alpha", "beta")).toBe(false);
  });

  it("returns false for exact match after trim", () => {
    expect(isSimilarFolioName("  main  ", "main")).toBe(false);
  });

  it("returns true for case variant after trim", () => {
    expect(isSimilarFolioName("  Main  ", "main")).toBe(true);
  });

  it("returns false when suffix is more than a simple plural 's'", () => {
    expect(isSimilarFolioName("main", "mainnet")).toBe(false);
  });
});
