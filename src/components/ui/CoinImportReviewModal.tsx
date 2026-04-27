import * as React from "react";
import { createPortal } from "react-dom";
import { createPublicClient, http } from "viem";
import { erc20Abi } from "@/lib/abiTypes";
import type { CoinImportReview } from "@/lib/shareImporters";
import type { Domain } from "@/storage/domainStore";

function shortenAddress(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type OnChainData = { name: string; symbol: string; decimals: number };

export function CoinImportReviewModal({
  incoming,
  existingId,
  domains,
  onConfirm,
  onCancel,
}: {
  incoming: CoinImportReview["incoming"];
  existingId: string | null;
  domains: Domain[];
  onConfirm: (override?: Partial<CoinImportReview["incoming"]>) => Promise<void>;
  onCancel: () => void;
}) {
  const [validating, setValidating] = React.useState(false);
  const [onChainData, setOnChainData] = React.useState<OnChainData | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const domain = domains.find(d => d.chainId === incoming.chainId);
  const isErc20 = incoming.type === "ERC20";

  // On-chain validation for ERC20 tokens
  React.useEffect(() => {
    if (!isErc20 || !domain) return;
    let cancelled = false;
    setValidating(true);
    setValidationError(null);
    setOnChainData(null);

    (async () => {
      try {
        const client = createPublicClient({ transport: http(domain.rpcUrl) });
        const [name, symbol, decimals] = await Promise.all([
          client.readContract({ address: incoming.address as `0x${string}`, abi: erc20Abi, functionName: "name" }) as Promise<string>,
          client.readContract({ address: incoming.address as `0x${string}`, abi: erc20Abi, functionName: "symbol" }) as Promise<string>,
          client.readContract({ address: incoming.address as `0x${string}`, abi: erc20Abi, functionName: "decimals" }) as Promise<number>,
        ]);
        if (!cancelled) setOnChainData({ name, symbol, decimals });
      } catch {
        if (!cancelled) setValidationError("Could not verify on-chain — RPC unavailable or address is not an ERC20 token.");
      } finally {
        if (!cancelled) setValidating(false);
      }
    })();

    return () => { cancelled = true; };
  }, [incoming.address, incoming.chainId, domain, isErc20]);

  const dataMatches = !onChainData || (
    onChainData.name === incoming.name &&
    onChainData.symbol === incoming.symbol &&
    onChainData.decimals === incoming.decimals
  );

  async function handleConfirm(override?: Partial<CoinImportReview["incoming"]>) {
    setConfirming(true);
    setError(null);
    try {
      await onConfirm(override);
    } catch (e: any) {
      setError(e?.message ?? "Failed to add coin.");
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
          {existingId ? "Coin Already in Library" : "Add Coin?"}
        </h2>

        {/* Incoming data */}
        <div className="space-y-2 text-sm mb-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{incoming.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Symbol</span>
            <span>{incoming.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Decimals</span>
            <span>{incoming.decimals}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Chain ID</span>
            <span>{incoming.chainId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address</span>
            <span className="font-mono text-xs">{shortenAddress(incoming.address)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span>{incoming.type}</span>
          </div>
        </div>

        {/* On-chain validation status */}
        {isErc20 && !existingId && (
          <div className="mb-3">
            {validating && (
              <p className="text-xs text-muted-foreground">Verifying on-chain…</p>
            )}
            {validationError && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {validationError} — the shared data will be used as-is.
              </div>
            )}
            {onChainData && !dataMatches && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
                <p className="font-medium">On-chain data differs from shared data:</p>
                {onChainData.name !== incoming.name && (
                  <p>Name: <span className="line-through">{incoming.name}</span> → {onChainData.name}</p>
                )}
                {onChainData.symbol !== incoming.symbol && (
                  <p>Symbol: <span className="line-through">{incoming.symbol}</span> → {onChainData.symbol}</p>
                )}
                {onChainData.decimals !== incoming.decimals && (
                  <p>Decimals: <span className="line-through">{incoming.decimals}</span> → {onChainData.decimals}</p>
                )}
              </div>
            )}
            {onChainData && dataMatches && (
              <p className="text-xs text-green-600">On-chain data verified.</p>
            )}
          </div>
        )}

        {existingId && (
          <p className="text-xs text-muted-foreground mb-4">
            This coin is already in your library. No changes will be made.
          </p>
        )}

        {error && (
          <p className="text-xs text-red-600 mb-3">{error}</p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm"
            onClick={onCancel}
            disabled={confirming}
          >
            {existingId ? "Close" : "Cancel"}
          </button>
          {!existingId && onChainData && !dataMatches && (
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
              onClick={() => handleConfirm({
                name: onChainData.name,
                symbol: onChainData.symbol,
                decimals: onChainData.decimals,
              })}
              disabled={confirming || validating}
            >
              {confirming ? "Adding…" : "Add with on-chain data"}
            </button>
          )}
          {!existingId && (
            <button
              type="button"
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              onClick={() => handleConfirm()}
              disabled={confirming || validating}
            >
              {confirming ? "Adding…" : onChainData && !dataMatches ? "Add (shared data)" : "Add"}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
