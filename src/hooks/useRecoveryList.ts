import * as React from "react";
import { useRecovery } from "@/hooks/useRecovery";
import { sortRecovery, RecoverySortMode } from "@/lib/recoverySorting";

type UseRecoveryListOptions = {
  query?: string;
  chainId?: number;
  sortMode?: RecoverySortMode;
  status?: string;
};

export function useRecoveryList(options: UseRecoveryListOptions = {}) {
  const { recoveries, loading, error, addRecovery, updateRecovery, deleteRecovery, clearRecoveries } =
    useRecovery();

  const { query = "", sortMode = "nameAsc", chainId = 0, status = "" } = options;

  const filteredAndSorted = React.useMemo(() => {
    let list = recoveries;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q)
      );
    }

    if (chainId != 0) {
      list = list.filter(c => c.chainId === chainId);
    }

    if (status === "consumed") {
      list = list.filter(c => c.consumed === true);
    }

    if (status === "enabled") {
      list = list.filter(c => c.status === true && !c.consumed);
    }

    if (status === "disabled") {
      list = list.filter(c => c.status === false && !c.consumed);
    }

    return sortRecovery(list, sortMode);
  }, [recoveries, query, sortMode, chainId, status]);

  return {
    recoveries: filteredAndSorted,
    loading,
    error,
    addRecovery,
    updateRecovery,
    deleteRecovery,
    clearRecoveries,
  };
}
