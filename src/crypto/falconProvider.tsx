import * as React from "react";
import { createFalconWorkerClient } from "./falconInterface";

const FalconCtx = React.createContext<ReturnType<typeof createFalconWorkerClient> | null>(null);

export function FalconProvider({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<ReturnType<typeof createFalconWorkerClient> | null>(null);

  if (!ref.current) {
    ref.current = createFalconWorkerClient();
    ref.current.init().catch(() => {});
  }

  React.useEffect(() => {
    const c = ref.current!;
    return () => c.terminate(); // optional: mostly useful in dev/unmount
  }, []);

  return <FalconCtx.Provider value={ref.current}>{children}</FalconCtx.Provider>;
}

export function useFalcon() {
  const c = React.useContext(FalconCtx);
  if (!c) throw new Error("useFalcon must be used within <FalconProvider>");
  return c;
}
