import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCurrentUser } from "../currentUser";

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
  getAllAttestations,
  addAttestation,
  deleteAttestation,
  clearAttestations,
  subscribeToAttestations,
} from "../attestationStore";

const BASE_ATTESTATION = {
  chainId: 11155111,
  accountAddress: "0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef",
  recoverableAddress: "0xRecoverableAddr000000000000000000000001",
  keypairId: "kp-uuid-1234",
  keyHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab" as `0x${string}`,
  falconLevel: 512 as const,
  paymaster: "0xPaymaster0000000000000000000000000000001",
};

beforeEach(() => {
  idbStore.clear();
  setCurrentUser("test-uid");
});

afterEach(() => {
  setCurrentUser(null);
});

// ---------------------------------------------------------------------------

describe("getAllAttestations", () => {
  it("returns empty array when nothing stored", async () => {
    expect(await getAllAttestations()).toEqual([]);
  });
});

describe("addAttestation", () => {
  it("creates a record with a generated id and timestamp", async () => {
    const result = await addAttestation(BASE_ATTESTATION);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBeTruthy();
    expect(result[0].chainId).toBe(11155111);
    expect(result[0].accountAddress).toBe(BASE_ATTESTATION.accountAddress);
    expect(result[0].recoverableAddress).toBe(BASE_ATTESTATION.recoverableAddress);
    expect(result[0].keypairId).toBe(BASE_ATTESTATION.keypairId);
    expect(result[0].keyHash).toBe(BASE_ATTESTATION.keyHash);
    expect(result[0].falconLevel).toBe(512);
    expect(result[0].paymaster).toBe(BASE_ATTESTATION.paymaster);
    expect(result[0].createdAt).toBeGreaterThan(0);
  });

  it("stores an attestation without a paymaster (standalone flow)", async () => {
    const { paymaster: _, ...withoutPaymaster } = BASE_ATTESTATION;
    const result = await addAttestation(withoutPaymaster);

    expect(result[0].paymaster).toBeUndefined();
  });

  it("appends a second attestation without removing the first", async () => {
    await addAttestation(BASE_ATTESTATION);
    const result = await addAttestation({ ...BASE_ATTESTATION, keypairId: "kp-uuid-5678" });

    expect(result).toHaveLength(2);
  });

  it("persists across separate getAllAttestations calls", async () => {
    await addAttestation(BASE_ATTESTATION);
    const all = await getAllAttestations();
    expect(all).toHaveLength(1);
    expect(all[0].accountAddress).toBe(BASE_ATTESTATION.accountAddress);
  });

  it("supports Falcon-1024 level", async () => {
    const result = await addAttestation({ ...BASE_ATTESTATION, falconLevel: 1024 });
    expect(result[0].falconLevel).toBe(1024);
  });
});

describe("deleteAttestation", () => {
  it("removes the matching record", async () => {
    const added = await addAttestation(BASE_ATTESTATION);
    const id = added[0].id;

    const result = await deleteAttestation(id);
    expect(result).toHaveLength(0);
  });

  it("leaves other attestations intact", async () => {
    await addAttestation(BASE_ATTESTATION);
    const added2 = await addAttestation({ ...BASE_ATTESTATION, keypairId: "kp-uuid-5678" });
    const id2 = added2.find(r => r.keypairId === "kp-uuid-5678")!.id;

    const result = await deleteAttestation(id2);
    expect(result).toHaveLength(1);
    expect(result[0].keypairId).toBe("kp-uuid-1234");
  });

  it("is a no-op for an unknown id", async () => {
    await addAttestation(BASE_ATTESTATION);
    const result = await deleteAttestation("unknown-id");
    expect(result).toHaveLength(1);
  });
});

describe("clearAttestations", () => {
  it("empties the store", async () => {
    await addAttestation(BASE_ATTESTATION);
    await addAttestation({ ...BASE_ATTESTATION, keypairId: "kp-uuid-5678" });
    await clearAttestations();
    expect(await getAllAttestations()).toEqual([]);
  });
});

describe("subscribeToAttestations", () => {
  it("notifies subscriber when an attestation is added", async () => {
    const listener = vi.fn();
    const unsub = subscribeToAttestations(listener);

    await addAttestation(BASE_ATTESTATION);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toHaveLength(1);

    unsub();
  });

  it("notifies subscriber when an attestation is deleted", async () => {
    const added = await addAttestation(BASE_ATTESTATION);
    const id = added[0].id;

    const listener = vi.fn();
    const unsub = subscribeToAttestations(listener);

    await deleteAttestation(id);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toHaveLength(0);
    unsub();
  });

  it("notifies subscriber when the store is cleared", async () => {
    await addAttestation(BASE_ATTESTATION);

    const listener = vi.fn();
    const unsub = subscribeToAttestations(listener);

    await clearAttestations();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toEqual([]);
    unsub();
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn();
    const unsub = subscribeToAttestations(listener);
    unsub();

    await addAttestation(BASE_ATTESTATION);
    expect(listener).not.toHaveBeenCalled();
  });

  it("multiple subscribers all receive notifications", async () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    const u1 = subscribeToAttestations(l1);
    const u2 = subscribeToAttestations(l2);

    await addAttestation(BASE_ATTESTATION);

    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
    u1();
    u2();
  });
});
