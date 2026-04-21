import * as React from "react";
import {
  AttestationRecord,
  getAllAttestations,
  addAttestation as storeAddAttestation,
  deleteAttestation as storeDeleteAttestation,
  clearAttestations as storeClearAttestations,
  subscribeToAttestations,
} from "../storage/attestationStore";

type UseAttestationsResult = {
  attestations: AttestationRecord[];
  loading: boolean;
  error: string | null;
  addAttestation: typeof storeAddAttestation;
  deleteAttestation: typeof storeDeleteAttestation;
  clearAttestations: typeof storeClearAttestations;
};

export function useAttestations(): UseAttestationsResult {
  const [attestations, setAttestations] = React.useState<AttestationRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllAttestations();
        if (!cancelled) {
          setAttestations(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Attestations] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load attestations");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToAttestations(next => {
      if (!cancelled) {
        setAttestations(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    attestations,
    loading,
    error,
    addAttestation: storeAddAttestation,
    deleteAttestation: storeDeleteAttestation,
    clearAttestations: storeClearAttestations,
  };
}
