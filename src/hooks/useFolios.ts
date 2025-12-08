// src/hooks/usefolios.ts
import * as React from "react";
import {
  Folio,
  getAllFolios,
  addFolio as storeAddFolio,
  updateFolio as storeUpdateFolio,
  deleteFolio as storeDeleteFolio,
  clearFolios as storeClearFolios,
  subscribeToFolios,
} from "../storage/folioStore";

type UseFoliosResult = {
  folios: Folio[];
  loading: boolean;
  error: string | null;
  addFolio: typeof storeAddFolio;
  updateFolio: typeof storeUpdateFolio;
  deleteFolio: typeof storeDeleteFolio;
  clearFolios: typeof storeClearFolios;
};

export function useFolios(): UseFoliosResult {
  const [folios, setFolios] = React.useState<Folio[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllFolios();
        if (!cancelled) {
          setFolios(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Folios] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load Folios");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToFolios(next => {
      if (!cancelled) {
        setFolios(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    folios,
    loading,
    error,
    addFolio: storeAddFolio,
    updateFolio: storeUpdateFolio,
    deleteFolio: storeDeleteFolio,
    clearFolios: storeClearFolios,
  };
}
