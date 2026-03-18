import { Folio, updateFolio } from "@/storage/folioStore";
import { Domain } from "@/storage/domainStore";
import { updatePublicKeyOnChain, notifyBundlerPublicKeyUpdate } from "./wallets";

export type KeyRotationStatus =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "confirming"; userOpHash: string; txHash: string }
  | { phase: "notifying" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export async function rotateKey(
  folio: Folio,
  domain: Domain,
  newKeypairId: string,
  onStatus: (s: KeyRotationStatus) => void,
): Promise<void> {
  try {
    onStatus({ phase: "submitting" });

    const { txHash, userOpHash } = await updatePublicKeyOnChain({ folio, domain, newKeypairId });

    onStatus({ phase: "confirming", userOpHash, txHash });

    onStatus({ phase: "notifying" });
    await notifyBundlerPublicKeyUpdate({ folio, domain, newKeypairId });

    await updateFolio(folio.id, { keypairId: newKeypairId });

    onStatus({ phase: "done" });
  } catch (e: any) {
    onStatus({ phase: "error", message: e?.message ?? String(e) });
  }
}
