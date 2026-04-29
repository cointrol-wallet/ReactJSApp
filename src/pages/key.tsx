import * as React from "react";
import { createPortal } from "react-dom";
import {
  listKeypairs,
  generateAndStoreKeypair,
  deleteKeypair,
  archiveKeypair,
  setKeypairFolioName,
  getPublicKey,
  getSecretKey,
  KeypairMeta,
} from "@/storage/keyStore";
import { getAllFolios, Folio } from "@/storage/folioStore";
import { getAllDomains, Domain } from "@/storage/domainStore";
import { useTx, ADMIN_KEY } from "@/lib/submitTransaction";
import { encodeFunctionData, bytesToHex, keccak256, parseEther, type Hex } from "viem";
import { quantumAccountAbi, extractAbi, getFunctions, AbiFunctionFragment } from "@/lib/abiTypes";
import { notifyBundlerPublicKeyUpdate } from "@/lib/wallets";
import { createFalconWorkerClient } from "@/crypto/falconInterface";
import { Contract, getAllContracts } from "@/storage/contractStore";
import { parseAbiArg } from "@/lib/parseAbiArgs";
import { updateFolio } from "@/storage/folioStore";
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
              className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
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
              className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
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
  const txStatus = useTx(s => s.status);
  const [localPhase, setLocalPhase] = React.useState<"idle" | "notifying" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const currentKeypair = keypairs.find(k => k.id === folio.keypairId);
  const available = keypairs.filter(
    k => k.id !== folio.keypairId &&
         k.level !== "ECC" &&
         !k.archivedAt &&
         k.level === currentKeypair?.level
  );

  async function handleRotate() {
    if (!newKeypairId) return;
    setError(null);
    setLocalPhase("idle");

    const oldKeypairId = folio.keypairId;

    const newPK = await getPublicKey(newKeypairId);
    if (!newPK) { setError("New keypair not found"); return; }

    const encoded = encodeFunctionData({
      abi: quantumAccountAbi,
      functionName: "updatePublicKey",
      args: [bytesToHex(newPK)],
    }) as Hex;

    const { startFlow } = useTx.getState();
    await startFlow({ folio, encoded, domain, nonceKey: ADMIN_KEY });

    const status = useTx.getState().status;
    if (status.phase === "failed") {
      setError(status.message ?? "Transaction failed.");
      return;
    }

    setLocalPhase("notifying");
    try {
      await notifyBundlerPublicKeyUpdate({ folio, domain, newKeypairId });
      await updateFolio(folio.id, { keypairId: newKeypairId });
      await setKeypairFolioName(oldKeypairId, folio.name);
      await archiveKeypair(oldKeypairId);
      await setKeypairFolioName(newKeypairId, folio.name);
      setLocalPhase("done");
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "Bundler notification failed.");
      setLocalPhase("idle");
    }
  }

  const busy =
    (txStatus.phase !== "idle" && txStatus.phase !== "finalized" && txStatus.phase !== "failed") ||
    localPhase === "notifying";

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
            <p className="text-xs text-muted-foreground">No other Falcon-{currentKeypair?.level} keypairs available. Generate one first.</p>
          ) : (
            <select
              className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
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

        {(txStatus.phase !== "idle" || localPhase !== "idle" || error) && (
          <div className={`rounded-md border px-3 py-2 text-xs mb-4 ${txStatus.phase === "failed" || error ? "border-red-300 text-red-600" : "border-border"}`}>
            {txStatus.phase === "preparing" && "Building key rotation UserOp…"}
            {txStatus.phase === "submitted" && `Confirming on-chain… tx: ${(txStatus.hash ?? txStatus.userOpHash ?? "").slice(0, 12)}…`}
            {localPhase === "notifying" && "Notifying bundler…"}
            {localPhase === "done" && "Key rotation complete."}
            {txStatus.phase === "failed" && (error ?? txStatus.message)}
            {txStatus.phase !== "failed" && error && error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={onClose} disabled={busy}>Cancel</button>
          {localPhase === "done" ? (
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

// ─── Archived Key Sign Modal ──────────────────────────────────────────────────

function ArchivedKeySignModal({
  keypair,
  folios,
  onClose,
}: {
  keypair: KeypairMeta;
  folios: Folio[];
  onClose: () => void;
}) {
  type Tab = "raw" | "sendCoins" | "smartContract";

  const [activeTab, setActiveTab] = React.useState<Tab>("raw");
  const [selectedFolioId, setSelectedFolioId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Raw tab
  const [rawInput, setRawInput] = React.useState("");

  // Send coins tab
  const [recipient, setRecipient] = React.useState("");
  const [amount, setAmount] = React.useState("");

  // Smart contract tab
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = React.useState("");
  const [selectedFnName, setSelectedFnName] = React.useState("");
  const [argValues, setArgValues] = React.useState<string[]>([]);

  React.useEffect(() => {
    getAllContracts().then(setContracts);
  }, []);

  const selectedFolio = folios.find(f => f.id === selectedFolioId);
  const chainContracts = contracts.filter(c => !selectedFolio || c.chainId === selectedFolio.chainId);
  const selectedContract = contracts.find(c => c.id === selectedContractId);
  const contractAbi = selectedContract ? extractAbi(selectedContract.metadata) : null;
  const writeFns: AbiFunctionFragment[] = contractAbi
    ? getFunctions(contractAbi).filter(f => f.stateMutability !== "view" && f.stateMutability !== "pure")
    : [];
  const selectedFn = writeFns.find(f => f.name === selectedFnName) ?? null;

  function safeName(s: string) {
    return s.replace(/[^a-z0-9 _-]/gi, "_").trim();
  }

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildFilename() {
    const folioSafe = safeName(selectedFolio?.name || keypair.folioName || keypair.label || keypair.id.slice(0, 8));
    const date = new Date().toISOString().slice(0, 10);
    return `${folioSafe} - archived key - ${date}.txt`;
  }

  async function signBytes(bytes: Uint8Array): Promise<Uint8Array> {
    const sk = await getSecretKey(keypair.id);
    if (!sk) throw new Error("Secret key not found");
    const falcon = createFalconWorkerClient();
    try {
      return await falcon.sign(keypair.level as 512 | 1024, bytes, sk);
    } finally {
      sk.fill(0);
      falcon.terminate();
    }
  }

  async function handleRawSign() {
    setBusy(true);
    setError(null);
    try {
      const inputBytes = new TextEncoder().encode(rawInput);
      const sig = await signBytes(inputBytes);
      const now = new Date().toISOString();
      const archivedDate = keypair.archivedAt ? new Date(keypair.archivedAt).toISOString() : "unknown";
      const content = [
        "Archived Key Signature Report",
        "==============================",
        `Keypair ID:    ${keypair.id}`,
        `Falcon Level:  Falcon-${keypair.level}`,
        `Archived At:   ${archivedDate}`,
        `Generated At:  ${now}`,
        "",
        "--- Input (UTF-8) ---",
        rawInput,
        "",
        "--- Signature (hex) ---",
        bytesToHex(sig),
      ].join("\n");
      const folioSafe = safeName(keypair.label || keypair.id.slice(0, 8));
      downloadTextFile(`${folioSafe} - archived key - ${new Date().toISOString().slice(0, 10)}.txt`, content);
    } catch (e: any) {
      setError(e?.message ?? "Signing failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendCoinsSign() {
    if (!selectedFolio) return;
    setBusy(true);
    setError(null);
    try {
      if (!recipient.startsWith("0x") || recipient.length !== 42) {
        setError("Invalid recipient address — must be 0x followed by 40 hex characters");
        return;
      }
      let amountWei: bigint;
      try {
        amountWei = parseEther(amount.trim());
      } catch {
        setError("Invalid amount");
        return;
      }
      const calldata = encodeFunctionData({
        abi: quantumAccountAbi,
        functionName: "execute",
        args: [recipient as Hex, amountWei, "0x"],
      }) as Hex;
      const sig = await signBytes(new TextEncoder().encode(calldata));
      const now = new Date().toISOString();
      const content = [
        "Archived Key — Send Coins",
        "==========================",
        `Folio:         ${selectedFolio.name} (${selectedFolio.address})`,
        `Recipient:     ${recipient}`,
        `Amount:        ${amount} ETH`,
        `Generated At:  ${now}`,
        "",
        "--- Encoded Calldata (execute) ---",
        calldata,
        "",
        "--- Falcon Signature (hex) ---",
        bytesToHex(sig),
      ].join("\n");
      downloadTextFile(buildFilename(), content);
    } catch (e: any) {
      setError(e?.message ?? "Signing failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSmartContractSign() {
    if (!selectedFolio || !selectedContract || !selectedFn || !contractAbi) return;
    setBusy(true);
    setError(null);
    try {
      const parsedArgs = selectedFn.inputs.map((inp, i) => parseAbiArg(inp.type, argValues[i] ?? ""));
      const innerData = encodeFunctionData({
        abi: contractAbi,
        functionName: selectedFn.name,
        args: parsedArgs,
      }) as Hex;
      const calldata = encodeFunctionData({
        abi: quantumAccountAbi,
        functionName: "execute",
        args: [selectedContract.address as Hex, 0n, innerData],
      }) as Hex;
      const sig = await signBytes(new TextEncoder().encode(calldata));
      const now = new Date().toISOString();
      const content = [
        "Archived Key — Smart Contract",
        "==============================",
        `Folio:         ${selectedFolio.name} (${selectedFolio.address})`,
        `Contract:      ${selectedContract.name} (${selectedContract.address})`,
        `Function:      ${selectedFn.name}`,
        `Arguments:     ${argValues.join(", ") || "(none)"}`,
        `Generated At:  ${now}`,
        "",
        "--- Inner Calldata ---",
        innerData,
        "",
        "--- Execute Calldata ---",
        calldata,
        "",
        "--- Falcon Signature (hex) ---",
        bytesToHex(sig),
      ].join("\n");
      downloadTextFile(buildFilename(), content);
    } catch (e: any) {
      setError(e?.message ?? "Signing failed");
    } finally {
      setBusy(false);
    }
  }

  const canGenerate =
    !busy &&
    (activeTab === "raw"
      ? rawInput.trim().length > 0
      : activeTab === "sendCoins"
      ? !!selectedFolioId && recipient.trim().length > 0 && amount.trim().length > 0
      : !!selectedFolioId && !!selectedContractId && !!selectedFnName);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-1 material-gold-text">Generate Signature</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Archived key: Falcon-{keypair.level}{keypair.label ? ` — ${keypair.label}` : ""}
        </p>

        {/* Tab bar */}
        <div className="flex border-b border-border mb-4">
          {(["raw", "sendCoins", "smartContract"] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => { setActiveTab(tab); setError(null); }}
              disabled={busy}
            >
              {tab === "raw" ? "Raw" : tab === "sendCoins" ? "Send coins" : "Smart contract"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Folio selector (not needed for Raw) */}
          {activeTab !== "raw" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Account</label>
              <select
                className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
                value={selectedFolioId}
                onChange={e => setSelectedFolioId(e.target.value)}
                disabled={busy}
              >
                <option value="">Select an account…</option>
                {folios.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.address.slice(0, 10)}…)</option>
                ))}
              </select>
            </div>
          )}

          {/* Raw tab */}
          {activeTab === "raw" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Data to sign</label>
              <textarea
                className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-xs font-mono resize-y"
                rows={10}
                placeholder="Paste any text or hex bytes to sign…"
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                disabled={busy}
              />
            </div>
          )}

          {/* Send coins tab */}
          {activeTab === "sendCoins" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium">Recipient address</label>
                <input
                  className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm font-mono"
                  placeholder="0x…"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Amount (ETH)</label>
                <input
                  className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
                  placeholder="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={busy}
                />
              </div>
            </>
          )}

          {/* Smart contract tab */}
          {activeTab === "smartContract" && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium">Contract</label>
                <select
                  className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
                  value={selectedContractId}
                  onChange={e => { setSelectedContractId(e.target.value); setSelectedFnName(""); setArgValues([]); }}
                  disabled={busy}
                >
                  <option value="">Select a contract…</option>
                  {chainContracts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {writeFns.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Function</label>
                  <select
                    className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm"
                    value={selectedFnName}
                    onChange={e => { setSelectedFnName(e.target.value); setArgValues([]); }}
                    disabled={busy}
                  >
                    <option value="">Select a function…</option>
                    {writeFns.map(f => (
                      <option key={f.name} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedFn?.inputs.map((inp, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-xs font-medium">
                    {inp.name || `arg${i}`} <span className="text-muted-foreground">({inp.type})</span>
                  </label>
                  <input
                    className="w-full rounded-md border border-border bg-background text-foreground px-2 py-1.5 text-sm font-mono"
                    placeholder={inp.type}
                    value={argValues[i] ?? ""}
                    onChange={e => setArgValues(prev => { const next = [...prev]; next[i] = e.target.value; return next; })}
                    disabled={busy}
                  />
                </div>
              ))}
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            disabled={!canGenerate}
            onClick={activeTab === "raw" ? handleRawSign : activeTab === "sendCoins" ? handleSendCoinsSign : handleSmartContractSign}
          >
            {busy ? "Signing…" : "Generate signature"}
          </button>
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
  const [showArchived, setShowArchived] = React.useState(false);
  const [rotatingFolio, setRotatingFolio] = React.useState<{ folio: Folio; domain: Domain } | null>(null);
  const [signingKey, setSigningKey] = React.useState<KeypairMeta | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const activeKeypairs   = React.useMemo(() => keypairs.filter(k => !k.archivedAt), [keypairs]);
  const archivedKeypairs = React.useMemo(() => keypairs.filter(k =>  k.archivedAt), [keypairs]);
  const visibleKeypairs  = showArchived ? archivedKeypairs : activeKeypairs;

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("details")) return;
      document.querySelectorAll("details[open]").forEach(d => d.removeAttribute("open"));
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCopyRecoveryCode(keypairId: string) {
    try {
      const pkBytes = await getPublicKey(keypairId);
      if (!pkBytes) throw new Error("Key not found");
      const hash = keccak256(bytesToHex(pkBytes));
      await navigator.clipboard.writeText(hash);
      setCopiedId(keypairId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silently fail — clipboard may not be available
    }
  }

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
        <div className="flex items-center gap-2">
          {archivedKeypairs.length > 0 && (
            <button
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              onClick={() => setShowArchived(v => !v)}
            >
              {showArchived ? "Show active keys" : `Show archived (${archivedKeypairs.length})`}
            </button>
          )}
          {!showArchived && (
            <button
              className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
              onClick={() => setShowGenerate(true)}
            >
              Generate New Key
            </button>
          )}
        </div>
      </div>

      {visibleKeypairs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {showArchived ? "No archived keypairs." : "No keypairs yet. Generate one to get started."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleKeypairs.map(k => {
            const isArchived = !!k.archivedAt;
            const assigned = assignedTo.get(k.id) ?? [];
            const isAssigned = assigned.length > 0;

            return (
              <li key={k.id} className={`rounded-lg border border-border px-4 py-3 space-y-2 ${isArchived ? "bg-muted opacity-75" : "bg-card"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Falcon-{k.level}{k.label ? ` — ${k.label}` : ""}
                      </span>
                      {isArchived && (
                        <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-xs text-muted-foreground">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.archivedAt && ` · Archived ${new Date(k.archivedAt).toLocaleDateString()}`}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono break-all">{k.id}</div>
                  </div>
                  <div className="flex gap-2 shrink-0 items-center">
                    {isArchived ? (
                      <>
                        <button
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setSigningKey(k)}
                        >
                          Generate signature
                        </button>
                        <button
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(k.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
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
                        <details className="relative inline-block">
                          <summary className="cursor-pointer list-none rounded-md border border-border bg-background px-2 py-1 text-xs">
                            Actions
                          </summary>
                          <div className="absolute right-0 mt-1 w-44 rounded-md border border-border bg-background shadow-lg z-50">
                            <button
                              className="block w-full px-3 py-2 text-left text-xs hover:bg-primary hover:text-primary-foreground"
                              onClick={(e) => {
                                (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                                handleCopyRecoveryCode(k.id);
                              }}
                            >
                              {copiedId === k.id ? "Copied!" : "Copy recovery code"}
                            </button>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                </div>

                {!isArchived && assigned.length > 0 && (
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

      {signingKey && (
        <ArchivedKeySignModal
          keypair={signingKey}
          folios={folios}
          onClose={() => setSigningKey(null)}
        />
      )}
    </div>
  );
}
