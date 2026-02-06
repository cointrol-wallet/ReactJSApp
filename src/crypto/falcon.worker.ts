import { createFalcon512, createFalcon1024 } from "@openforge-sh/liboqs";

type FalconLevel = 512 | 1024;

// Works whether createFalcon* returns T or Promise<T>
type Falcon512Api = Awaited<ReturnType<typeof createFalcon512>>;
type Falcon1024Api = Awaited<ReturnType<typeof createFalcon1024>>;

type Req =
  | { id: number; action: "init" }
  | { id: number; action: "generateKeypair"; level: FalconLevel }
  | { id: number; action: "sign"; level: FalconLevel; msg: Uint8Array; sk: Uint8Array }
  | { id: number; action: "verify"; level: FalconLevel; msg: Uint8Array; sig: Uint8Array; pk: Uint8Array };

type Res =
  | { id: number; ok: true; value?: any }
  | { id: number; ok: false; error: string };

let falcon512: Falcon512Api | null = null;
let falcon1024: Falcon1024Api | null = null;

async function ensureInit() {
  if (!falcon512) falcon512 = await Promise.resolve(createFalcon512());
  if (!falcon1024) falcon1024 = await Promise.resolve(createFalcon1024());
}

function apiFor(level: FalconLevel) {
  if (level === 512) {
    if (!falcon512) throw new Error("Falcon512 not initialized");
    return falcon512;
  } else {
    if (!falcon1024) throw new Error("Falcon1024 not initialized");
    return falcon1024;
  }
}

(self as any).onmessage = async (ev: MessageEvent<Req>) => {
  const req = ev.data;

  try {
    if (req.action === "init") {
      await ensureInit();
      (self as any).postMessage({ id: req.id, ok: true } satisfies Res);
      return;
    }

    await ensureInit();

    if (req.action === "generateKeypair") {
      const api = apiFor(req.level);
      const { publicKey, secretKey } = api.generateKeyPair();
      (self as any).postMessage({ id: req.id, ok: true, value: { pk: publicKey, sk: secretKey } } satisfies Res);
      return;
    }

    if (req.action === "sign") {
      const api = apiFor(req.level);
      const signature = api.sign(req.msg, req.sk);
      (self as any).postMessage({ id: req.id, ok: true, value: signature } satisfies Res);
      return;
    }

    if (req.action === "verify") {
      const api = apiFor(req.level);
      const ok = api.verify(req.msg, req.sig, req.pk);
      (self as any).postMessage({ id: req.id, ok: true, value: ok } satisfies Res);
      return;
    }

    throw new Error(`Unknown action: ${(req as any).action}`);
  } catch (e: any) {
    (self as any).postMessage({ id: req.id, ok: false, error: String(e?.message ?? e) } satisfies Res);
  }
};
