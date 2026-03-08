import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// In-memory idb-keyval mock
// ---------------------------------------------------------------------------

const { idbStore } = vi.hoisted(() => ({ idbStore: new Map<string, unknown>() }));

vi.mock("idb-keyval", () => ({
  get: vi.fn((k: string) => Promise.resolve(idbStore.get(k))),
  set: vi.fn((k: string, v: unknown) => { idbStore.set(k, v); return Promise.resolve(); }),
  del: vi.fn((k: string) => { idbStore.delete(k); return Promise.resolve(); }),
}));

import {
  getUUID,
  setUUID,
  hasAcceptedTerms,
  setTermsAccepted,
  isFirstTimeUser,
} from "../authStore";

beforeEach(() => {
  idbStore.clear();
});

// ---------------------------------------------------------------------------

describe("getUUID / setUUID", () => {
  it("returns null when nothing stored", async () => {
    expect(await getUUID()).toBeNull();
  });

  it("returns the stored UUID after setUUID", async () => {
    await setUUID("0xdeadbeef");
    expect(await getUUID()).toBe("0xdeadbeef");
  });

  it("overwrites a previous UUID", async () => {
    await setUUID("0xfirst");
    await setUUID("0xsecond");
    expect(await getUUID()).toBe("0xsecond");
  });
});

// ---------------------------------------------------------------------------

describe("hasAcceptedTerms / setTermsAccepted", () => {
  it("returns false when nothing stored", async () => {
    expect(await hasAcceptedTerms()).toBe(false);
  });

  it("returns true after setTermsAccepted", async () => {
    await setTermsAccepted();
    expect(await hasAcceptedTerms()).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("isFirstTimeUser", () => {
  it("returns true when neither UUID nor terms are set", async () => {
    expect(await isFirstTimeUser()).toBe(true);
  });

  it("returns false when UUID is set", async () => {
    await setUUID("0xabc");
    expect(await isFirstTimeUser()).toBe(false);
  });

  it("returns false when terms are accepted", async () => {
    await setTermsAccepted();
    expect(await isFirstTimeUser()).toBe(false);
  });

  it("returns false when both are set", async () => {
    await setUUID("0xabc");
    await setTermsAccepted();
    expect(await isFirstTimeUser()).toBe(false);
  });
});
