import * as React from "react";
import { createPortal } from "react-dom";
import type { ContractImportReview } from "@/lib/shareImporters";

function shortenAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ContractImportReviewModal({
  incoming,
  existingId,
  onConfirm,
  onCancel,
}: {
  incoming: ContractImportReview["incoming"];
  existingId: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add contract.");
      setConfirming(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, zIndex: 2147483646,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="bg-background rounded-xl border border-border shadow-xl"
        style={{
          position: "fixed", zIndex: 2147483647,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "min(440px, calc(100vw - 32px))", padding: 20,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold material-gold-text mb-3">
          {existingId ? "Contract Already in Library" : "Add Contract?"}
        </h2>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{incoming.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address</span>
            <span className="font-mono text-xs">{shortenAddress(incoming.address)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chain ID</span>
            <span>{incoming.chainId}</span>
          </div>
          {incoming.metadata && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ABI</span>
              <span className="text-xs text-muted-foreground">
                {Array.isArray(incoming.metadata?.abi)
                  ? `${incoming.metadata.abi.length} entries`
                  : "included"}
              </span>
            </div>
          )}
        </div>

        {existingId ? (
          <p className="text-xs text-muted-foreground mb-4">
            This contract is already in your library. No changes will be made.
          </p>
        ) : null}

        {error && (
          <p className="text-xs text-red-600 mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm"
            onClick={onCancel}
            disabled={confirming}
          >
            {existingId ? "Close" : "Cancel"}
          </button>
          {!existingId && (
            <button
              type="button"
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              onClick={handleConfirm}
              disabled={confirming}
            >
              {confirming ? "Adding…" : "Add"}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
