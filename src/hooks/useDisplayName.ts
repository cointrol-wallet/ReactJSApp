import * as React from "react";
import {
  getDisplayName,
  subscribeToDisplayName,
  setDisplayName,
} from "../storage/profileStore";

export function useDisplayName() {
  const [displayName, setLocal] = React.useState<string>("");

  React.useEffect(() => {
    let alive = true;

    getDisplayName().then((n) => {
      if (!alive) return;
      setLocal((n ?? "").toString());
    });

    const unsub = subscribeToDisplayName((n) => {
      setLocal((n ?? "").toString());
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const save = React.useCallback(async (name: string) => {
    const trimmed = (name ?? "").trim();
    await setDisplayName(trimmed);

    // IMPORTANT: update immediately even if subscription doesn't fire
    setLocal(trimmed);
  }, []);

  return { displayName, save };
}
