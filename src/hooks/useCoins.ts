// src/hooks/useContacts.ts
import * as React from "react";
import {
  Coin,
  getAllCoins,
  addCoin as storeAddCoin,
  updateCoin as storeUpdateCoins,
  deleteCoin as storeDeleteCoins,
  clearCoins as storeClearCoins,
  subscribeToCoins,
} from "../storage/coinStore";

type UseCoinsResult = {
  coins: Coin[];
  loading: boolean;
  error: string | null;
  addCoin: typeof storeAddCoin;
  updateCoin: typeof storeUpdateCoins;
  deleteCoin: typeof storeDeleteCoins;
  clearCoins: typeof storeClearCoins;
};

export function useCoins(): UseCoinsResult {
  const [coins, setCoins] = React.useState<Coin[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllCoins();
        if (!cancelled) {
          setCoins(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Coins] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load coins");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToCoins(next => {
      if (!cancelled) {
        setCoins(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    coins,
    loading,
    error,
    addCoin: storeAddCoin,
    updateCoin: storeUpdateCoins,
    deleteCoin: storeDeleteCoins,
    clearCoins: storeClearCoins,
  };
}
