import * as React from "react";
import { createPortal } from "react-dom";
import {
  listKeypairs,
  generateAndStoreKeypair,
  deleteKeypair,
  KeypairMeta,
  FalconLevel,
} from "@/storage/keyStore";
import { getAllFolios, Folio } from "@/storage/folioStore";
import { getAllDomains, Domain } from "@/storage/domainStore";
import { rotateKey, KeyRotationStatus } from "@/lib/keyRotation";
import { useNavigate } from "react-router-dom";

// ─── Generate Key Modal ───────────────────────────────────────────────────────

function GenerateKeyModal({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: () => void;
}) {
  const [level, setLevel] = React.useState<512 | 1024>(512);
  const [label, setLabel] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await generateAndStoreKeypair(level, label.trim() || undefined);
      onGenerated();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Key generation failed");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4 material-gold-text">Generate New Keypair</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Level</label>
            <select
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              value={level}
              onChange={e => setLevel(Number(e.target.value) as 512 | 1024)}
              disabled={busy}
            >
              <option value={512}>Falcon-512</option>
              <option value={1024}>Falcon-1024</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Label (optional)</label>
            <input
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              placeholder="e.g. Main key"
              value={label}
              onChange={e => setLabel(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium" disabled={busy}>
              {busy ? "Generating…" : "Generate"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Rotate Key Modal ─────────────────────────────────────────────────────────

function RotateKeyModal({
  folio,
  domain,
  keypairs,
  onClose,
  onDone,
}: {
  folio: Folio;
  domain: Domain;
  keypairs: KeypairMeta[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [newKeypairId, setNewKeypairId] = React.useState("");
  const [status, setStatus] = React.useState<KeyRotationStatus>({ phase: "idle" });

  const available = keypairs.filter(k => k.id !== folio.keypairId && k.level !== "ECC");

  async function handleRotate() {
    if (!newKeypairId) return;
    await rotateKey(folio, domain, newKeypairId, setStatus);
    if (status.phase === "done") onDone();
  }

  const busy = status.phase !== "idle" && status.phase !== "error" && status.phase !== "done";

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-1 material-gold-text">Rotate Key</h2>
        <p className="text-xs text-muted-foreground mb-4">Account: <span className="font-mono">{folio.address.slice(0, 10)}…</span></p>

        <div className="space-y-1 mb-4">
          <label className="text-xs font-medium">New keypair</label>
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground">No other keypairs available. Generate one first on the Keys page.</p>
          ) : (
            <select
              className="w-full rounded-md border border-border px-2 py-1.5 text-sm"
              value={newKeypairId}
              onChange={e => setNewKeypairId(e.target.value)}
              disabled={busy}
            >
              <option value="">Select a keypair…</option>
              {available.map(k => (
                <option key={k.id} value={k.id}>
                  Falcon-{k.level}{k.label ? ` — ${k.label}` : ""} ({new Date(k.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>

        {status.phase !== "idle" && (
          <div className={`rounded-md border px-3 py-2 text-xs mb-4 ${status.phase === "error" ? "border-red-300 text-red-600" : "border-border"}`}>
            {status.phase === "submitting" && "Submitting key rotation UserOp…"}
            {status.phase === "confirming" && `Confirming on-chain… tx: ${status.txHash.slice(0, 12)}…`}
            {status.phase === "notifying" && "Notifying bundler…"}
            {status.phase === "done" && "Key rotation complete."}
            {status.phase === "error" && status.message}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={onClose} disabled={busy}>Cancel</button>
          {status.phase === "done" ? (
            <button type="button" className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium" onClick={() => { onDone(); onClose(); }}>Done</button>
          ) : (
            <button
              type="button"
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              onClick={handleRotate}
              disabled={!newKeypairId || busy || available.length === 0}
            >
              {busy ? "Rotating…" : "Rotate"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Keys() {
  const navigate = useNavigate();
  const [keypairs, setKeypairs] = React.useState<KeypairMeta[]>([]);
  const [folios, setFolios] = React.useState<Folio[]>([]);
  const [domains, setDomains] = React.useState<Domain[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showGenerate, setShowGenerate] = React.useState(false);
  const [rotatingFolio, setRotatingFolio] = React.useState<{ folio: Folio; domain: Domain } | null>(null);

  async function reload() {
    const [kps, fls, doms] = await Promise.all([listKeypairs(), getAllFolios(), getAllDomains()]);
    setKeypairs(kps);
    setFolios(fls);
    setDomains(doms);
  }

  React.useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  // Build a map from keypairId → folios using it
  const assignedTo = React.useMemo(() => {
    const map = new Map<string, Folio[]>();
    for (const f of folios) {
      if (!f.keypairId) continue;
      const list = map.get(f.keypairId) ?? [];
      list.push(f);
      map.set(f.keypairId, list);
    }
    return map;
  }, [folios]);

  function domainForFolio(folio: Folio): Domain | undefined {
    return domains.find(d => d.chainId === folio.chainId);
  }

  async function handleDelete(id: string) {
    await deleteKeypair(id);
    await reload();
  }

  if (loading) return <div className="p-4 text-sm">Loading keys…</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold leading-tight material-charcoal-text material-gold-text">Key Management</h1>
        <button
          className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
          onClick={() => setShowGenerate(true)}
        >
          Generate New Key
        </button>
      </div>

      {keypairs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No keypairs yet. Generate one to get started.</p>
      ) : (
        <ul className="space-y-3">
          {keypairs.map(k => {
            const assigned = assignedTo.get(k.id) ?? [];
            const isAssigned = assigned.length > 0;

            return (
              <li key={k.id} className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      Falcon-{k.level}{k.label ? ` — ${k.label}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono break-all">{k.id}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isAssigned && (
                      <button
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-primary hover:text-primary-foreground"
                        onClick={() => navigate("/dashboard")}
                        title="Create account using this key"
                      >
                        Create account
                      </button>
                    )}
                    <button
                      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={isAssigned}
                      title={isAssigned ? "Cannot delete a keypair assigned to an account" : "Delete keypair"}
                      onClick={() => handleDelete(k.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {assigned.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground">Assigned to:</div>
                    {assigned.map(f => {
                      const dom = domainForFolio(f);
                      return (
                        <div key={f.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{f.name}</span>
                          <button
                            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                            disabled={!dom}
                            title={dom ? "Rotate key for this account" : "Domain not found"}
                            onClick={() => dom && setRotatingFolio({ folio: f, domain: dom })}
                          >
                            Rotate key
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showGenerate && (
        <GenerateKeyModal
          onClose={() => setShowGenerate(false)}
          onGenerated={reload}
        />
      )}

      {rotatingFolio && (
        <RotateKeyModal
          folio={rotatingFolio.folio}
          domain={rotatingFolio.domain}
          keypairs={keypairs}
          onClose={() => setRotatingFolio(null)}
          onDone={() => { reload(); setRotatingFolio(null); }}
        />
      )}
    </div>
  );
}
