import * as React from "react";
import {
  Contract,
  getAllContracts,
  addContract as storeAddContract,
  updateContract as storeUpdateContract,
  deleteContract as storeDeleteContract,
  clearContracts as storeClearContracts,
  subscribeToContracts,
} from "../storage/contractStore";

type UseContractsResult = {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  addContract: typeof storeAddContract;
  updateContract: typeof storeUpdateContract;
  deleteContract: typeof storeDeleteContract;
  clearContracts: typeof storeClearContracts;
};

export function useContracts(): UseContractsResult {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllContracts();
        if (!cancelled) {
          setContracts(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Contracts] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load contracts");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToContracts(next => {
      if (!cancelled) {
        setContracts(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    contracts,
    loading,
    error,
    addContract: storeAddContract,
    updateContract: storeUpdateContract,
    deleteContract: storeDeleteContract,
    clearContracts: storeClearContracts,
  };
}
