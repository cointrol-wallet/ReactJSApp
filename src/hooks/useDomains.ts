// src/hooks/useContacts.ts
import * as React from "react";
import {
  Domain,
  getAllDomains,
  addDomain as storeAddDomain,
  updateDomain as storeUpdateDomain,
  deleteDomain as storeDeleteDomain,
  clearDomains as storeClearDomain,
  subscribeToDomains,
} from "../storage/domainStore";

type UseDomainsResult = {
  domains: Domain[];
  loading: boolean;
  error: string | null;
  addDomain: typeof storeAddDomain;
  updateDomain: typeof storeUpdateDomain;
  deleteDomain: typeof storeDeleteDomain;
  clearDomain: typeof storeClearDomain;
};

export function useDomains(): UseDomainsResult {
  const [domains, setDomains] = React.useState<Domain[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllDomains();
        if (!cancelled) {
          setDomains(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Domains] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load domains");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToDomains(next => {
      if (!cancelled) {
        setDomains(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    domains,
    loading,
    error,
    addDomain: storeAddDomain,
    updateDomain: storeUpdateDomain,
    deleteDomain: storeDeleteDomain,
    clearDomain: storeClearDomain,
  };
}
