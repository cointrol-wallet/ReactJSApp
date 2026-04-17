// src/hooks/useContacts.ts
import * as React from "react";
import {
  Recovery,
  getAllRecoveries,
  addRecovery as storeAddRecovery,
  updateRecovery as storeUpdateRecovery,
  deleteRecovery as storeDeleteRecovery,
  clearRecovery as storeClearRecovery,
  subscribeToRecovery,
} from "../storage/recoveryStore";

type UseRecoveriesResult = {
  recoveries: Recovery[];
  loading: boolean;
  error: string | null;
  addRecovery: typeof storeAddRecovery;
  updateRecovery: typeof storeUpdateRecovery;
  deleteRecovery: typeof storeDeleteRecovery;
  clearRecoveries: typeof storeClearRecovery;
};

export function useRecovery(): UseRecoveriesResult {
  const [recoveries, setRecoveries] = React.useState<Recovery[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllRecoveries();
        if (!cancelled) {
          setRecoveries(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Recoveries] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load recoveries");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToRecovery(next => {
      if (!cancelled) {
        setRecoveries(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    recoveries,
    loading,
    error,
    addRecovery: storeAddRecovery,
    updateRecovery: storeUpdateRecovery,
    deleteRecovery: storeDeleteRecovery,
    clearRecoveries: storeClearRecovery,
  };
}
