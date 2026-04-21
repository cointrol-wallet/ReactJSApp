// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock the attestationStore so the hook never touches IndexedDB
// ---------------------------------------------------------------------------

const {
  mockGetAllAttestations,
  mockSubscribeToAttestations,
  mockAddAttestation,
  mockDeleteAttestation,
  mockClearAttestations,
} = vi.hoisted(() => ({
  mockGetAllAttestations: vi.fn(),
  mockSubscribeToAttestations: vi.fn(),
  mockAddAttestation: vi.fn(),
  mockDeleteAttestation: vi.fn(),
  mockClearAttestations: vi.fn(),
}));

vi.mock("@/storage/attestationStore", () => ({
  getAllAttestations: mockGetAllAttestations,
  subscribeToAttestations: mockSubscribeToAttestations,
  addAttestation: mockAddAttestation,
  deleteAttestation: mockDeleteAttestation,
  clearAttestations: mockClearAttestations,
}));

import { useAttestations } from "../useAttestations";
import type { AttestationRecord } from "@/storage/attestationStore";

const ATTESTATION_A: AttestationRecord = {
  id: "att-uuid-1",
  chainId: 11155111,
  accountAddress: "0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef",
  recoverableAddress: "0xRecoverableAddr000000000000000000000001",
  keypairId: "kp-uuid-1234",
  keyHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
  falconLevel: 512,
  paymaster: "0xPaymaster0000000000000000000000000000001",
  createdAt: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSubscribeToAttestations.mockReturnValue(() => {});
});

// ---------------------------------------------------------------------------

describe("useAttestations — initial state", () => {
  it("starts with loading=true and empty attestations", () => {
    mockGetAllAttestations.mockResolvedValue([]);
    const { result } = renderHook(() => useAttestations());

    expect(result.current.loading).toBe(true);
    expect(result.current.attestations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("loads attestations and sets loading=false", async () => {
    mockGetAllAttestations.mockResolvedValue([ATTESTATION_A]);
    const { result } = renderHook(() => useAttestations());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.attestations).toHaveLength(1);
    expect(result.current.attestations[0].id).toBe("att-uuid-1");
    expect(result.current.error).toBeNull();
  });

  it("sets error when getAllAttestations throws", async () => {
    mockGetAllAttestations.mockRejectedValue(new Error("storage failure"));
    const { result } = renderHook(() => useAttestations());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("storage failure");
    expect(result.current.attestations).toEqual([]);
  });

  it("uses a generic message when the thrown error has no message", async () => {
    mockGetAllAttestations.mockRejectedValue({});
    const { result } = renderHook(() => useAttestations());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load attestations");
  });
});

describe("useAttestations — subscription", () => {
  it("subscribes to store on mount", async () => {
    mockGetAllAttestations.mockResolvedValue([]);
    renderHook(() => useAttestations());

    expect(mockSubscribeToAttestations).toHaveBeenCalledOnce();
  });

  it("unsubscribes on unmount", async () => {
    const unsubFn = vi.fn();
    mockSubscribeToAttestations.mockReturnValue(unsubFn);
    mockGetAllAttestations.mockResolvedValue([]);

    const { unmount } = renderHook(() => useAttestations());
    await waitFor(() => {});
    unmount();

    expect(unsubFn).toHaveBeenCalledOnce();
  });

  it("updates attestations when subscriber callback fires", async () => {
    let storedCallback: ((r: AttestationRecord[]) => void) | null = null;
    mockSubscribeToAttestations.mockImplementation((cb: (r: AttestationRecord[]) => void) => {
      storedCallback = cb;
      return () => {};
    });
    mockGetAllAttestations.mockResolvedValue([]);

    const { result } = renderHook(() => useAttestations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate store push
    storedCallback!([ATTESTATION_A]);
    await waitFor(() => expect(result.current.attestations).toHaveLength(1));
    expect(result.current.attestations[0].id).toBe("att-uuid-1");
  });
});

describe("useAttestations — CRUD passthrough", () => {
  it("exposes addAttestation from store", async () => {
    mockGetAllAttestations.mockResolvedValue([]);
    const { result } = renderHook(() => useAttestations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.addAttestation).toBe(mockAddAttestation);
  });

  it("exposes deleteAttestation from store", async () => {
    mockGetAllAttestations.mockResolvedValue([]);
    const { result } = renderHook(() => useAttestations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.deleteAttestation).toBe(mockDeleteAttestation);
  });

  it("exposes clearAttestations from store", async () => {
    mockGetAllAttestations.mockResolvedValue([]);
    const { result } = renderHook(() => useAttestations());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.clearAttestations).toBe(mockClearAttestations);
  });
});
