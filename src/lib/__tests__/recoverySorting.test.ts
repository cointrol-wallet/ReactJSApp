import { describe, it, expect } from "vitest";
import { sortRecovery } from "../recoverySorting";
import type { Recovery } from "@/storage/recoveryStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rec(
  name: string,
  chainId: number,
  threshold: number,
  createdAt: number
): Recovery {
  return {
    id: `recovery:${name}`,
    name,
    chainId,
    threshold,
    createdAt,
    updatedAt: createdAt,
    paymaster: "0xPay",
    recoverableAddress: "0xRec",
    status: true,
    participants: [],
  };
}

const ALPHA = rec("Alpha", 1,         1, 300);
const BETA  = rec("Beta",  11155111,  2, 100);
const GAMMA = rec("Gamma", 5,         3, 200);

// ---------------------------------------------------------------------------

describe("sortRecovery — nameAsc", () => {
  it("sorts alphabetically ascending", () => {
    const r = sortRecovery([GAMMA, ALPHA, BETA], "nameAsc");
    expect(r.map(x => x.name)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("is case-insensitive", () => {
    const lower = { ...ALPHA, name: "alpha" };
    const upper = { ...BETA,  name: "Zeta"  };
    const r = sortRecovery([upper, lower], "nameAsc");
    expect(r[0].name).toBe("alpha");
  });
});

describe("sortRecovery — nameDesc", () => {
  it("sorts alphabetically descending", () => {
    const r = sortRecovery([ALPHA, BETA, GAMMA], "nameDesc");
    expect(r.map(x => x.name)).toEqual(["Gamma", "Beta", "Alpha"]);
  });
});

describe("sortRecovery — createdAsc", () => {
  it("sorts oldest first", () => {
    const r = sortRecovery([ALPHA, BETA, GAMMA], "createdAsc");
    expect(r.map(x => x.createdAt)).toEqual([100, 200, 300]);
  });
});

describe("sortRecovery — createdDesc", () => {
  it("sorts newest first", () => {
    const r = sortRecovery([BETA, GAMMA, ALPHA], "createdDesc");
    expect(r.map(x => x.createdAt)).toEqual([300, 200, 100]);
  });
});

describe("sortRecovery — chainIdAsc", () => {
  it("sorts lowest chainId first", () => {
    const r = sortRecovery([GAMMA, ALPHA, BETA], "chainIdAsc");
    expect(r.map(x => x.chainId)).toEqual([1, 5, 11155111]);
  });
});

describe("sortRecovery — chainIdDesc", () => {
  it("sorts highest chainId first", () => {
    const r = sortRecovery([ALPHA, GAMMA, BETA], "chainIdDesc");
    expect(r.map(x => x.chainId)).toEqual([11155111, 5, 1]);
  });
});

describe("sortRecovery — thresholdAsc", () => {
  it("sorts lowest threshold first", () => {
    const r = sortRecovery([GAMMA, ALPHA, BETA], "thresholdAsc");
    expect(r.map(x => x.threshold)).toEqual([1, 2, 3]);
  });
});

describe("sortRecovery — thresholdDesc", () => {
  it("sorts highest threshold first", () => {
    const r = sortRecovery([ALPHA, BETA, GAMMA], "thresholdDesc");
    expect(r.map(x => x.threshold)).toEqual([3, 2, 1]);
  });
});

describe("sortRecovery — default mode", () => {
  it("uses createdAsc when no mode is provided", () => {
    const r = sortRecovery([ALPHA, BETA, GAMMA]);
    expect(r.map(x => x.createdAt)).toEqual([100, 200, 300]);
  });
});

describe("sortRecovery — edge cases", () => {
  it("returns empty array unchanged", () => {
    expect(sortRecovery([], "nameAsc")).toEqual([]);
  });

  it("returns single element unchanged", () => {
    expect(sortRecovery([ALPHA], "nameAsc")).toEqual([ALPHA]);
  });

  it("does not mutate the input array", () => {
    const input = [GAMMA, ALPHA, BETA];
    sortRecovery(input, "nameAsc");
    expect(input[0].name).toBe("Gamma");
  });

  it("handles equal createdAt values stably (no crash)", () => {
    const a = rec("A", 1, 1, 500);
    const b = rec("B", 1, 1, 500);
    const r = sortRecovery([a, b], "createdAsc");
    expect(r).toHaveLength(2);
  });

  it("handles equal thresholds without crashing", () => {
    const a = rec("A", 1, 2, 100);
    const b = rec("B", 2, 2, 200);
    const r = sortRecovery([b, a], "thresholdAsc");
    expect(r).toHaveLength(2);
    expect(r[0].threshold).toBe(2);
  });
});
