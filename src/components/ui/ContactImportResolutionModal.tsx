import React from "react";
import { createPortal } from "react-dom";
import type { ContactMatchInfo } from "@/lib/shareImporters";
import type { Wallet } from "@/storage/contactStore";

type Props = {
  incoming: { name: string; surname?: string; wallets: Wallet[] };
  matches: ContactMatchInfo[];
  onUpdate: (matchId: string, mergedWallets: Wallet[]) => Promise<void>;
  onCombine: (matchId: string, mergedWallets: Wallet[]) => Promise<void>;
  onAddAsNew: () => Promise<void>;
  onCancel: () => void;
};

function shortAddr(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletList({ wallets, label }: { wallets: Wallet[]; label?: string }) {
  if (!wallets.length) return <p className="text-xs text-muted italic">{label ?? "No wallets"}</p>;
  return (
    <ul className="space-y-1">
      {wallets.map((w) => (
        <li key={`${w.chainId}:${w.address}`} className="text-xs text-muted font-mono">
          {w.name ? <span className="text-foreground font-sans font-medium">{w.name} — </span> : null}
          {shortAddr(w.address)}
          <span className="ml-1 text-[10px] opacity-60">(chain {w.chainId})</span>
        </li>
      ))}
    </ul>
  );
}

type MatchCardProps = {
  match: ContactMatchInfo;
  incoming: Props["incoming"];
  onUpdate: Props["onUpdate"];
  onCombine: Props["onCombine"];
};

function MatchCard({ match, incoming, onUpdate, onCombine }: MatchCardProps) {
  const [busy, setBusy] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const existingName = [match.existing.name, match.existing.surname].filter(Boolean).join(" ");
  const existingWallets = match.existing.wallets ?? [];

  // Which incoming wallets are new (not in existing)?
  const existingAddressKeys = new Set(
    existingWallets.map((w) => `${w.chainId}:${w.address.toLowerCase()}`)
  );
  const newWallets = incoming.wallets.filter(
    (w) => !existingAddressKeys.has(`${w.chainId}:${w.address.toLowerCase()}`)
  );
  // Which existing wallets would gain a name from incoming?
  const walletNameUpdates = incoming.wallets.filter((w) => {
    const key = `${w.chainId}:${w.address.toLowerCase()}`;
    if (!existingAddressKeys.has(key)) return false;
    const ex = existingWallets.find(
      (e) => `${e.chainId}:${e.address.toLowerCase()}` === key
    );
    return !ex?.name && !!w.name;
  });

  async function handleUpdate() {
    setBusy(true);
    try {
      await onUpdate(match.existing.id, match.mergedWallets);
      setDismissed(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleCombine() {
    setBusy(true);
    try {
      await onCombine(match.existing.id, match.mergedWallets);
      setDismissed(true);
    } finally {
      setBusy(false);
    }
  }

  // Case 2 — name match + wallet overlap
  if (match.walletRelationship === "overlap" && match.matchReason === "name") {
    return (
      <div
        className="rounded-lg border border-border bg-card p-3 space-y-2"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <p className="text-sm font-medium text-foreground">
          Matches existing contact — <span className="material-gold-text">{existingName}</span>
        </p>
        <div className="space-y-1">
          <p className="text-xs text-muted">Existing wallets:</p>
          <WalletList wallets={existingWallets} />
        </div>
        {(newWallets.length > 0 || walletNameUpdates.length > 0) && (
          <div className="space-y-1">
            {newWallets.length > 0 && (
              <>
                <p className="text-xs text-muted">Wallets to add:</p>
                <WalletList wallets={newWallets} />
              </>
            )}
            {walletNameUpdates.length > 0 && (
              <p className="text-xs text-muted">
                {walletNameUpdates.length} wallet name{walletNameUpdates.length > 1 ? "s" : ""} will be filled in.
              </p>
            )}
          </div>
        )}
        {newWallets.length === 0 && walletNameUpdates.length === 0 && (
          <p className="text-xs text-muted italic">No new wallets or name updates to add.</p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
          <button
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => setDismissed(true)}
            disabled={busy}
          >
            Skip
          </button>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={handleUpdate}
            disabled={busy || (newWallets.length === 0 && walletNameUpdates.length === 0)}
          >
            {busy ? "Updating…" : "Update with new details"}
          </button>
        </div>
      </div>
    );
  }

  // Case 2b — address match on a contact with a different name
  if (match.walletRelationship === "overlap" && match.matchReason === "address") {
    const sharedWallets = existingWallets.filter((w) =>
      incoming.wallets.some(
        (iw) =>
          iw.chainId === w.chainId &&
          iw.address.toLowerCase() === w.address.toLowerCase()
      )
    );

    return (
      <div
        className="rounded-lg border border-amber-400/40 bg-card p-3 space-y-2"
        style={{ background: "rgba(255,200,0,0.04)" }}
      >
        <p className="text-sm font-medium text-foreground">
          Shared wallet address —{" "}
          <span className="material-gold-text">{existingName}</span>
        </p>
        <p className="text-xs text-muted">
          This contact shares a wallet address with the scanned contact. They may be the same person.
        </p>
        <div className="space-y-1">
          <p className="text-xs text-muted">Shared address{sharedWallets.length > 1 ? "es" : ""}:</p>
          <WalletList wallets={sharedWallets} />
        </div>
        {newWallets.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted">Additional wallets to merge in:</p>
            <WalletList wallets={newWallets} />
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
          <button
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => setDismissed(true)}
            disabled={busy}
          >
            Skip
          </button>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            onClick={handleCombine}
            disabled={busy}
          >
            {busy ? "Combining…" : "Combine into this contact"}
          </button>
        </div>
      </div>
    );
  }

  // Case 3 — name match, no wallet overlap
  return (
    <div
      className="rounded-lg border border-border bg-card p-3 space-y-2"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <p className="text-sm font-medium text-foreground">
        Same name, different wallets —{" "}
        <span className="material-gold-text">{existingName}</span>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted">Existing wallets:</p>
          <WalletList wallets={existingWallets} label="None" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted">Incoming wallets:</p>
          <WalletList wallets={incoming.wallets} label="None" />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-1">
        <button
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => setDismissed(true)}
          disabled={busy}
        >
          Skip
        </button>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={handleCombine}
          disabled={busy}
        >
          {busy ? "Combining…" : "Combine wallets"}
        </button>
      </div>
    </div>
  );
}

export function ContactImportResolutionModal({
  incoming,
  matches,
  onUpdate,
  onCombine,
  onAddAsNew,
  onCancel,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const incomingDisplayName = [incoming.name, incoming.surname]
    .filter(Boolean)
    .join(" ");

  async function handleAddAsNew() {
    setBusy(true);
    try {
      await onAddAsNew();
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as any,
        padding: 16,
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 32,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, calc(100dvw - 32px))",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          background: "#fff",
          color: "#111",
          maxHeight: "calc(100dvh - 64px)",
          overflowY: "auto",
        }}
        className="bg-background text-foreground space-y-4"
      >
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold material-gold-text">
            Scanned contact: {incomingDisplayName}
          </h2>
          {incoming.wallets.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted">Incoming wallets:</p>
              <WalletList wallets={incoming.wallets} />
            </div>
          )}
          {incoming.wallets.length === 0 && (
            <p className="text-xs text-muted mt-1">No wallets in this contact.</p>
          )}
        </div>

        {/* Match sections */}
        {matches.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">
              Possible matches
            </p>
            {matches.map((m) => (
              <MatchCard
                key={m.existing.id}
                match={m}
                incoming={incoming}
                onUpdate={onUpdate}
                onCombine={onCombine}
              />
            ))}
          </div>
        )}

        {matches.length === 0 && (
          <p className="text-sm text-muted">No existing contacts matched this scan.</p>
        )}

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border pt-3">
          <button
            className="rounded-md border px-4 py-3 text-sm sm:py-2"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-primary px-4 py-3 text-sm sm:py-2 text-primary-foreground disabled:opacity-50"
            onClick={handleAddAsNew}
            disabled={busy}
          >
            {busy ? "Adding…" : "Add as New Contact"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
