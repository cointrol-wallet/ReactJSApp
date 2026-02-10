import * as React from "react";
import { getDisplayName, subscribeToDisplayName, setDisplayName } from "../storage/profileStore";

export function useDisplayName() {
  const [displayName, setLocal] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    getDisplayName().then(n => alive && setLocal(n));
    const unsub = subscribeToDisplayName(n => setLocal(n));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const save = React.useCallback(async (name: string) => {
    await setDisplayName(name);
  }, []);

  return { displayName, save };
}