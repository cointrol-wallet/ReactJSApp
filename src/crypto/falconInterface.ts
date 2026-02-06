export type FalconLevel = 512 | 1024;

type Pending = { resolve: (v: any) => void; reject: (e: any) => void };

export function createFalconWorkerClient() {
  const w = new Worker(new URL("./falcon.worker.ts", import.meta.url), { type: "module" });

  let seq = 0;
  const pending = new Map<number, Pending>();

  w.onmessage = (ev: MessageEvent<any>) => {
    const { id, ok, value, error } = ev.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    ok ? p.resolve(value) : p.reject(new Error(error));
  };

  function call<T>(payload: any): Promise<T> {
    const id = ++seq;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      w.postMessage({ id, ...payload });
    });
  }

  return {
    init: () => call<void>({ action: "init" }),

    generateKeypair: (level: FalconLevel) =>
      call<{ pk: Uint8Array; sk: Uint8Array }>({ action: "generateKeypair", level }),

    sign: (level: FalconLevel, msg: Uint8Array, sk: Uint8Array) =>
      call<Uint8Array>({ action: "sign", level, msg, sk }),

    verify: (level: FalconLevel, msg: Uint8Array, sig: Uint8Array, pk: Uint8Array) =>
      call<boolean>({ action: "verify", level, msg, sig, pk }),

    terminate: () => w.terminate(),
  };
}
