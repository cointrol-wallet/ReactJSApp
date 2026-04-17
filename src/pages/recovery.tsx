import * as React from "react";
import { createPortal } from "react-dom";
import { useRecoveryList } from "@/hooks/useRecoveryList";
import { Recovery } from "@/storage/recoveryStore";
import { useFolios } from "@/hooks/useFolios";
import { useDomains } from "@/hooks/useDomains";
import { useContactsList } from "@/hooks/useContactList";
import { Contact } from "@/storage/contactStore";
import { Folio } from "@/storage/folioStore";
import { resolveEnsAddress } from "@/lib/ens";
import { RecoverySortMode } from "@/lib/recoverySorting";
import { ShareQrModal } from "@/components/ui/ShareQrModal";
import { buildRecoveryShare } from "@/lib/shareBuilders";

// ── Constants ─────────────────────────────────────────────────────────────────

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const ENS_REGEX = /^[a-z0-9-]+\.eth$/i;
const ENS_MAINNET_RPC = "https://cloudflare-eth.com";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function buildContactMap(contacts: Contact[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of contacts) {
    const displayName = [c.name, c.surname].filter(Boolean).join(" ");
    for (const w of c.wallets ?? []) {
      if (w.address) {
        const walletLabel = w.name ? ` (${w.name})` : "";
        map.set(w.address.toLowerCase(), displayName + walletLabel);
      }
    }
  }
  return map;
}

function buildRecoveryExportText(
  r: Recovery,
  folioName: string | null,
  chainName: string,
  contactMap: Map<string, string>
): string {
  const lines: string[] = ["=== Cointrol Recovery Export ===", `Account (Folio): ${r.name}`];
  if (folioName) lines.push(`Folio Name: ${folioName}`);
  lines.push(
    `Network: ${chainName} (${r.chainId})`,
    `Recoverable Contract: ${r.recoverableAddress}`,
    `Paymaster: ${r.paymaster}`,
    `Threshold: ${r.threshold} of ${r.participants.length}`,
    `Status: ${r.status ? "Enabled" : "Disabled"}`,
    "",
    "Participants:"
  );
  if (r.participants.length === 0) {
    lines.push("  (none)");
  } else {
    r.participants.forEach((addr, i) => {
      const label = contactMap.get(addr.toLowerCase());
      lines.push(`  ${i + 1}. ${label ? `${label} (${addr})` : addr}`);
    });
  }
  lines.push("", `Exported: ${new Date().toISOString().slice(0, 10)}`);
  return lines.join("\n");
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Participant row type ───────────────────────────────────────────────────────

type PRow = {
  key: string;
  mode: "contact" | "manual";
  contactId: string;
  contactWalletIdx: number;
  input: string;
  resolved: string | null;
  resolving: boolean;
  error: string | null;
};

function emptyRow(): PRow {
  return {
    key: crypto.randomUUID(),
    mode: "manual",
    contactId: "",
    contactWalletIdx: 0,
    input: "",
    resolved: null,
    resolving: false,
    error: null,
  };
}

// ── ParticipantRows sub-component ─────────────────────────────────────────────
// Shared between Create and Edit modals.

type ParticipantRowsProps = {
  rows: PRow[];
  contacts: Contact[];
  chainId: number;
  existingAddresses?: string[];
  onChange: (rows: PRow[]) => void;
  disabled?: boolean;
  showRemove?: boolean;
};

function ParticipantRows({ rows, contacts, chainId, existingAddresses = [], onChange, disabled, showRemove = true }: ParticipantRowsProps) {
  function setRow(key: string, patch: Partial<PRow>) {
    onChange(rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    onChange(rows.filter(r => r.key !== key));
  }

  function addRow() {
    onChange([...rows, emptyRow()]);
  }

  async function resolveInput(key: string, raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setRow(key, { resolved: null, error: null, resolving: false });
      return;
    }
    if (EVM_ADDRESS_REGEX.test(trimmed)) {
      setRow(key, { resolved: trimmed, error: null, resolving: false });
      return;
    }
    if (ENS_REGEX.test(trimmed)) {
      setRow(key, { resolving: true, error: null, resolved: null });
      const addr = await resolveEnsAddress(trimmed, ENS_MAINNET_RPC);
      if (addr) {
        setRow(key, { resolved: addr, error: null, resolving: false });
      } else {
        setRow(key, { resolved: null, error: `Could not resolve ENS name "${trimmed}"`, resolving: false });
      }
      return;
    }
    setRow(key, { resolved: null, error: "Enter a valid 0x address or ENS name (.eth)", resolving: false });
  }

  const eligibleContacts = contacts.filter(c =>
    (c.wallets ?? []).some(w => w.chainId === chainId)
  );

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const contact = contacts.find(c => c.id === row.contactId);
        const chainWallets = (contact?.wallets ?? [])
          .filter(w => w.chainId === chainId)
          .filter(w => !existingAddresses.includes(w.address));
        return (
          <div key={row.key} className="rounded-md border border-border p-2 space-y-1">
            <div className="flex gap-2 items-center">
              <select
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                value={row.mode === "contact" ? `contact:${row.contactId}` : "manual"}
                disabled={disabled}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "manual") {
                    setRow(row.key, { mode: "manual", contactId: "", input: "", resolved: null, error: null });
                  } else {
                    const cid = val.replace("contact:", "");
                    setRow(row.key, {
                      mode: "contact",
                      contactId: cid,
                      contactWalletIdx: 0,
                      input: "",
                      resolved: null,
                      error: null,
                    });
                  }
                }}
              >
                <option value="manual">Manual input / ENS</option>
                {eligibleContacts.map(c => (
                  <option key={c.id} value={`contact:${c.id}`}>
                    {[c.name, c.surname].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>

              {showRemove && (
                <button
                  type="button"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm text-red-600 hover:bg-primary hover:text-primary-foreground"
                  onClick={() => removeRow(row.key)}
                  disabled={disabled}
                >
                  Remove
                </button>
              )}
            </div>

            {row.mode === "contact" && row.contactId && (() => {
              if (chainWallets.length === 0) return <p className="text-xs text-muted">This contact has no eligible wallets on this chain.</p>;
              return (
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
                  value={row.contactWalletIdx}
                  disabled={disabled}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setRow(row.key, {
                      contactWalletIdx: idx,
                      resolved: chainWallets[idx]?.address ?? null,
                      error: null,
                    });
                  }}
                >
                  {chainWallets.map((w, i) => (
                    <option key={i} value={i}>
                      {w.name ? `${w.name} (${shortenAddress(w.address)})` : shortenAddress(w.address)}
                    </option>
                  ))}
                </select>
              );
            })()}

            {row.mode === "manual" && (
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted"
                placeholder="0x address or ENS name (.eth)"
                value={row.input}
                disabled={disabled || row.resolving}
                onChange={async (e) => {
                  const raw = e.target.value;
                  setRow(row.key, { input: raw, resolved: null, error: null });
                  await resolveInput(row.key, raw);
                }}
              />
            )}

            {row.resolving && <p className="text-xs text-muted">Resolving ENS…</p>}
            {row.error && <p className="text-xs text-red-600">{row.error}</p>}
            {!row.error && row.resolved && (
              <p className="text-xs text-muted font-mono">{row.resolved}</p>
            )}
            {row.mode === "contact" && row.contactId && !row.resolved && (() => {
              const addr = chainWallets[row.contactWalletIdx]?.address;
              if (addr) {
                // auto-set resolved on render if not yet set
                setTimeout(() => setRow(row.key, { resolved: addr }), 0);
              }
              return null;
            })()}
          </div>
        );
      })}
      <button
        type="button"
        className="h-9 w-full rounded-md border border-dashed border-border bg-card px-3 text-sm text-foreground hover:bg-primary hover:text-primary-foreground"
        onClick={addRow}
        disabled={disabled}
      >
        Add participant
      </button>
    </div>
  );
}

// ── RecoveryFiltersDropdown ───────────────────────────────────────────────────

type RecoveryFiltersDropdownProps = {
  sortMode: RecoverySortMode;
  setSortMode: (v: RecoverySortMode) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
};

function RecoveryFiltersDropdown({
  sortMode,
  setSortMode,
  statusFilter,
  setStatusFilter,
}: RecoveryFiltersDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 320,
  });

  const close = () => setOpen(false);

  const updatePos = React.useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(320, window.innerWidth - margin * 2);
    const top = r.bottom + 8;
    const preferredLeft = r.right - width;
    const left = Math.min(Math.max(margin, preferredLeft), window.innerWidth - width - margin);
    setPos({ top, left, width });
  }, []);

  const toggle = () => {
    const next = !open;
    if (next) updatePos();
    setOpen(next);
  };

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="h-11 sm:h-9 whitespace-nowrap rounded-md border border-border bg-card px-3 text-sm text-foreground"
        onClick={toggle}
      >
        &nbsp;Sort / Filter&nbsp;
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            onClick={close}
            style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.35)" }}
          />
          <div
            className="rounded-xl border border-border bg-card shadow-lg"
            style={{ position: "fixed", zIndex: 9999, top: pos.top, left: pos.left, width: pos.width, padding: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-sm font-semibold material-gold-text">Sort</div>
            <select
              className="h-11 sm:h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as RecoverySortMode)}
            >
              <option value="nameAsc">Name (A → Z)</option>
              <option value="nameDesc">Name (Z → A)</option>
              <option value="chainIdAsc">Chain ID (Low → High)</option>
              <option value="chainIdDesc">Chain ID (High → Low)</option>
              <option value="thresholdAsc">Threshold (Low → High)</option>
              <option value="thresholdDesc">Threshold (High → Low)</option>
              <option value="createdDesc">Newest first</option>
              <option value="createdAsc">Oldest first</option>
            </select>

            <div className="my-3 border-t border-border" />

            <div className="mb-2 text-sm font-semibold material-gold-text">Status</div>
            <select
              className="h-11 sm:h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>

            <div className="mt-3 flex justify-between">
              <button
                type="button"
                className="h-11 sm:h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
                onClick={() => { setSortMode("nameAsc"); setStatusFilter(""); }}
              >
                Clear
              </button>
              <button
                type="button"
                className="h-11 sm:h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                onClick={close}
              >
                Done
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ── CreateRecoveryModal ───────────────────────────────────────────────────────

type CreateRecoveryModalProps = {
  folios: Folio[];
  contacts: Contact[];
  chainMap: Map<number, string>;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    paymaster: string;
    recoverableAddress: string | null;
    participants: string[];
    threshold: number;
    chainId: number;
    status: boolean;
  }) => Promise<void>;
};

function CreateRecoveryModal({
  folios,
  contacts,
  chainMap,
  onClose,
  onSubmit,
}: CreateRecoveryModalProps) {
  const [selectedFolioId, setSelectedFolioId] = React.useState<string>(folios[0]?.id ?? "");
  const [threshold, setThreshold] = React.useState(1);
  const [participantRows, setParticipantRows] = React.useState<PRow[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedFolio = folios.find(f => f.id === selectedFolioId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFolio) {
      setError("Please select a folio account.");
      return;
    }

    const resolvedParticipants: string[] = [];
    for (const row of participantRows) {
      const addr =
        row.mode === "contact"
          ? (contacts.find(c => c.id === row.contactId)?.wallets?.[row.contactWalletIdx]?.address ?? null)
          : row.resolved;

      if (!addr || !EVM_ADDRESS_REGEX.test(addr)) {
        setError("One or more participants have an unresolved or invalid address. Please fix before submitting.");
        return;
      }
      if (resolvedParticipants.includes(addr)) {
        setError(`Duplicate participant address: ${addr}`);
        return;
      }
      resolvedParticipants.push(addr);
    }

    if (threshold < 1 || threshold > Math.max(1, resolvedParticipants.length)) {
      setError(`Threshold must be between 1 and ${Math.max(1, resolvedParticipants.length)}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: selectedFolio.address,
        paymaster: selectedFolio.paymaster,
        recoverableAddress: null, // placeholder — address comes from on-chain deployment
        participants: resolvedParticipants,
        threshold,
        chainId: selectedFolio.chainId,
        status: false,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as any,
        padding: 16,
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 32,
          marginBottom: 32,
          width: "min(480px, calc(100dvw - 32px))",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          background: "#fff",
          color: "#111",
        }}
      >
        <h2 className="mb-3 text-base font-semibold material-gold-text">Create Recoverable</h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md border border-red-300 px-3 py-2 text-xs text-red-600">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">Folio account</label>
            {folios.length === 0 ? (
              <p className="text-xs text-muted">No folio accounts found. Create one in Portfolio first.</p>
            ) : (
              <select
                className="w-full rounded-md border px-2 py-1 text-sm"
                value={selectedFolioId}
                onChange={(e) => setSelectedFolioId(e.target.value)}
                disabled={submitting}
              >
                {folios.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {shortenAddress(f.address)} ({chainMap.get(f.chainId) ?? "Unknown"} {f.chainId})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedFolio && (
            <div className="rounded-md border border-border bg-card px-3 py-2 text-xs space-y-0.5">
              <div><span className="text-muted">Chain:</span> {chainMap.get(selectedFolio.chainId) ?? "Unknown"} ({selectedFolio.chainId})</div>
              <div><span className="text-muted">Folio address:</span> <span className="font-mono">{selectedFolio.address}</span></div>
              <div><span className="text-muted">Paymaster:</span> <span className="font-mono">{shortenAddress(selectedFolio.paymaster)}</span></div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">Threshold</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, participantRows.length)}
              className="w-full rounded-md border px-2 py-1 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))}
              disabled={submitting}
            />
            <p className="text-xs text-muted">
              Number of participants required to approve recovery ({participantRows.length} participant{participantRows.length !== 1 ? "s" : ""} added).
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Participants</label>
            <ParticipantRows
              rows={participantRows}
              contacts={contacts}
              chainId={selectedFolio?.chainId ?? 0}
              onChange={setParticipantRows}
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-md border px-4 py-3 text-sm sm:px-3 sm:py-1 sm:text-xs"
              onClick={onClose}
              disabled={submitting}
            >
              &nbsp;Cancel&nbsp;
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-3 text-sm sm:px-3 sm:py-1 sm:text-xs font-medium text-primary-foreground disabled:opacity-50"
              disabled={submitting || folios.length === 0}
            >
              &nbsp;{submitting ? "Creating…" : "Create recoverable"}&nbsp;
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── EditRecoveryModal ─────────────────────────────────────────────────────────

type EditRecoveryModalProps = {
  recovery: Recovery;
  contacts: Contact[];
  contactMap: Map<string, string>;
  folioName: string | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Omit<Recovery, "id" | "createdAt" | "paymaster" | "chainId" | "recoverableAddress" | "name">>) => Promise<void>;
};

type EditConfirm =
  | { type: "threshold"; value: number }
  | { type: "status"; value: boolean }
  | { type: "addParticipant"; address: string }
  | { type: "removeParticipant"; address: string };

function EditRecoveryModal({
  recovery,
  contacts,
  contactMap,
  folioName,
  onClose,
  onUpdate,
}: EditRecoveryModalProps) {
  const [threshold, setThreshold] = React.useState(recovery.threshold);
  const [status, setStatus] = React.useState(recovery.status);
  const [participants, setParticipants] = React.useState<string[]>(recovery.participants);

  const [addRow, setAddRow] = React.useState<PRow>(emptyRow());
  const [confirm, setConfirm] = React.useState<EditConfirm | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function doUpdate(
    patch: Partial<Omit<Recovery, "id" | "createdAt" | "paymaster" | "chainId" | "recoverableAddress" | "name">>,
    onSuccess?: () => void
  ) {
    setSubmitting(true);
    setError(null);
    try {
      // TODO: submit on-chain transaction here and await confirmation
      await onUpdate(patch);
      onSuccess?.();
      setConfirm(null);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAction() {
    if (!confirm) return;
    if (confirm.type === "threshold") {
      await doUpdate({ threshold: confirm.value }, () => setThreshold(confirm.value));
    } else if (confirm.type === "status") {
      await doUpdate({ status: confirm.value }, () => setStatus(confirm.value));
    } else if (confirm.type === "removeParticipant") {
      const next = participants.filter(p => p !== confirm.address);
      const nextThreshold = Math.min(threshold, Math.max(1, next.length));
      await doUpdate(
        { participants: next, threshold: nextThreshold },
        () => { setParticipants(next); setThreshold(nextThreshold); }
      );
    } else if (confirm.type === "addParticipant") {
      const next = [...participants, confirm.address];
      await doUpdate({ participants: next }, () => { setParticipants(next); clearAddRow(); });
    }
  }

  function clearAddRow() {
    setAddRow(emptyRow());
  }

  function handleAddSubmit() {
    const row = addRow;
    const chainWallets = (contacts.find(c => c.id === row.contactId)?.wallets ?? [])
      .filter(w => w.chainId === recovery.chainId)
      .filter(w => !participants.includes(w.address));
    const addr =
      row.mode === "contact"
        ? (chainWallets[row.contactWalletIdx]?.address ?? null)
        : row.resolved;

    if (!addr || !EVM_ADDRESS_REGEX.test(addr)) {
      setError("The participant address is not valid or could not be resolved.");
      return;
    }
    if (participants.includes(addr)) {
      setError("This address is already a participant.");
      return;
    }
    setError(null);
    setConfirm({ type: "addParticipant", address: addr });
  }

  const confirmLabel = confirm
    ? confirm.type === "threshold"
      ? `Change threshold from ${recovery.threshold} to ${confirm.value}?`
      : confirm.type === "status"
        ? `${confirm.value ? "Enable" : "Disable"} this recoverable?`
        : confirm.type === "addParticipant"
          ? `Add participant ${shortenAddress(confirm.address)}?`
          : `Remove participant ${shortenAddress(confirm.address)}?`
    : "";

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !confirm) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as any,
        padding: 16,
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 32,
          marginBottom: 32,
          width: "min(520px, calc(100dvw - 32px))",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          background: "#fff",
          color: "#111",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold material-gold-text">
            Edit Recovery — {folioName ?? shortenAddress(recovery.name)}
          </h2>
          <button
            type="button"
            className="text-sm text-muted hover:text-foreground"
            onClick={onClose}
            disabled={submitting}
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-300 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {/* Confirmation overlay */}
        {confirm && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 space-y-3">
            <p className="text-sm font-medium text-amber-900">{confirmLabel}</p>
            <p className="text-xs text-amber-700">
              This will submit an on-chain transaction. The record will be updated once confirmed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-xs"
                onClick={() => { setConfirm(null); setError(null); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
                onClick={confirmAction}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* ── Section A: Threshold ── */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-sm font-medium">Threshold</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={Math.max(1, participants.length)}
                className="w-24 rounded-md border px-2 py-1 text-sm"
                value={threshold}
                onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))}
                disabled={submitting || !!confirm}
              />
              <span className="text-xs text-muted">of {participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
              <button
                type="button"
                className="ml-auto rounded-md border border-border bg-card px-3 py-1 text-xs hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                onClick={() => {
                  if (threshold === recovery.threshold) return;
                  setConfirm({ type: "threshold", value: threshold });
                }}
                disabled={submitting || !!confirm || threshold === recovery.threshold || threshold > participants.length}
              >
                Update threshold
              </button>
            </div>
            {threshold > participants.length && (
              <p className="text-xs text-red-600">Threshold cannot exceed the number of participants ({participants.length}).</p>
            )}
            {threshold !== recovery.threshold && !confirm && threshold <= participants.length && (
              <p className="text-xs text-amber-700">Unsaved: currently {recovery.threshold} on record.</p>
            )}
          </div>

          {/* ── Section B: Status ── */}
          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  disabled={submitting || !!confirm}
                  className="rounded"
                />
                <span className="text-sm">{status ? "Enabled" : "Disabled"}</span>
              </label>
              <button
                type="button"
                className="ml-auto rounded-md border border-border bg-card px-3 py-1 text-xs hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                onClick={() => {
                  if (status === recovery.status) return;
                  setConfirm({ type: "status", value: status });
                }}
                disabled={submitting || !!confirm || status === recovery.status}
              >
                Update status
              </button>
            </div>
            {status !== recovery.status && !confirm && (
              <p className="text-xs text-amber-700">
                Unsaved: currently {recovery.status ? "enabled" : "disabled"} on record.
              </p>
            )}
          </div>

          {/* ── Section C: Participants ── */}
          <div className="rounded-md border border-border p-3 space-y-3">
            <div className="text-sm font-medium">Participants</div>

            {participants.length === 0 ? (
              <p className="text-xs text-muted">No participants yet.</p>
            ) : (
              <ul className="space-y-1">
                {participants.map((addr) => {
                  const label = contactMap.get(addr.toLowerCase());
                  return (
                    <li key={addr} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                      <span className="flex-1 text-xs font-mono">
                        {label && <span className="font-sans font-medium mr-1">{label}</span>}
                        {shortenAddress(addr)}
                      </span>
                      <button
                        type="button"
                        className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                        onClick={() => {
                          if (participants.length - 1 < threshold) {
                            setError(`Cannot remove: would leave ${participants.length - 1} participant(s), below threshold of ${threshold}. Lower the threshold first.`);
                            return;
                          }
                          setConfirm({ type: "removeParticipant", address: addr });
                        }}
                        disabled={submitting || !!confirm}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-xs font-medium text-muted">Add participant</div>
              <ParticipantRows
                rows={[addRow]}
                contacts={contacts}
                chainId={recovery.chainId}
                existingAddresses={participants}
                onChange={(rows) => setAddRow(rows[0] ?? emptyRow())}
                disabled={submitting || !!confirm}
                showRemove={false}
              />
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
                onClick={handleAddSubmit}
                disabled={submitting || !!confirm}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-md border px-4 py-3 text-sm sm:px-3 sm:py-1 sm:text-xs"
            onClick={onClose}
            disabled={submitting}
          >
            &nbsp;Close&nbsp;
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Placeholder modals ────────────────────────────────────────────────────────

function PlaceholderModal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, calc(100vw - 32px))",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          background: "#fff",
          color: "#111",
        }}
      >
        <h2 className="mb-2 text-base font-semibold material-gold-text">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        {children}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-md border px-4 py-3 text-sm sm:px-3 sm:py-1 sm:text-xs"
            onClick={onClose}
          >
            &nbsp;Close&nbsp;
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export function RecoveryPage() {
  // ── Filter / sort state ──────────────────────────────────────────────────
  const [query, setQuery] = React.useState("");
  const [chainIdFilter, setChainIdFilter] = React.useState<number>(0);
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [sortMode, setSortMode] = React.useState<RecoverySortMode>("nameAsc");

  // ── Modal state ──────────────────────────────────────────────────────────
  const [recoveryToDelete, setRecoveryToDelete] = React.useState<Recovery | null>(null);
  const [editingRecovery, setEditingRecovery] = React.useState<Recovery | null>(null);
  const [qrRecovery, setQrRecovery] = React.useState<Recovery | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isRecoverOpen, setIsRecoverOpen] = React.useState(false);
  const [isAttestationOpen, setIsAttestationOpen] = React.useState(false);
  const [isFetchOpen, setIsFetchOpen] = React.useState(false);

  // ── Data hooks ───────────────────────────────────────────────────────────
  const {
    recoveries,
    loading,
    error,
    addRecovery,
    updateRecovery,
    deleteRecovery,
  } = useRecoveryList({ query, chainId: chainIdFilter, sortMode, status: statusFilter });

  const { folios } = useFolios();
  const { domains } = useDomains();
  const { contacts } = useContactsList({ sortMode: "nameAsc" });

  // ── Derived maps ─────────────────────────────────────────────────────────
  const chainMap = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const d of domains) {
      if (!map.has(d.chainId)) map.set(d.chainId, d.name);
    }
    return map;
  }, [domains]);

  const folioAddressMap = React.useMemo(
    () => new Map(folios.map(f => [`${f.address.toLowerCase()}:${f.chainId}`, f])),
    [folios]
  );

  const contactMap = React.useMemo(() => buildContactMap(contacts), [contacts]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function getDisplayName(r: Recovery): string {
    return folioAddressMap.get(`${r.name.toLowerCase()}:${r.chainId}`)?.name ?? shortenAddress(r.name);
  }

  function getChainName(r: Recovery): string {
    return chainMap.get(r.chainId) ?? `Chain ${r.chainId}`;
  }

  // ── Click outside to close action menus ──────────────────────────────────
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("details")) return;
      document.querySelectorAll("details[open]").forEach(d => d.removeAttribute("open"));
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Export handlers ──────────────────────────────────────────────────────
  function exportSingleItem(r: Recovery) {
    const folio = folioAddressMap.get(`${r.name.toLowerCase()}:${r.chainId}`);
    const folioName = folio?.name ?? null;
    const chainName = getChainName(r);
    const folioLabel = (folioName ?? "unknown").replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();
    const chainLabel = chainName.replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();
    const text = buildRecoveryExportText(r, folioName, chainName, contactMap);
    downloadTextFile(`recovery-${folioLabel}-${chainLabel}.txt`, text);
  }

  function exportAllItems() {
    if (recoveries.length === 0) return;
    const blocks = recoveries.map((r) => {
      const folioName = folioAddressMap.get(`${r.name.toLowerCase()}:${r.chainId}`)?.name ?? null;
      const chainName = getChainName(r);
      return buildRecoveryExportText(r, folioName, chainName, contactMap);
    });
    downloadTextFile("recovery-export.txt", blocks.join("\n\n---\n\n"));
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="p-4">Loading recovery data…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-4 p-4">
      <h1 className="shrink-0 text-2xl leading-tight font-semibold text-foreground material-charcoal-text material-gold-text">
        Recoverables
      </h1>

      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-2">
        <select
          className="h-11 sm:h-9 w-[140px] rounded-md border border-border bg-card px-2 text-sm text-foreground"
          value={chainIdFilter}
          onChange={(e) => setChainIdFilter(Number(e.target.value))}
        >
          <option value={0}>Show all</option>
          {[...chainMap.entries()].map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <input
          className="h-11 sm:h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted sm:max-w-md"
          placeholder="Search by folio address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <RecoveryFiltersDropdown
            sortMode={sortMode}
            setSortMode={setSortMode}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          &nbsp;
          <button
            className="h-11 sm:h-9 rounded-md border border-border bg-card px-3 text-sm"
            onClick={() => setIsCreateOpen(true)}
          >
            &nbsp;Create recoverable&nbsp;
          </button>

          <button
            className="h-11 sm:h-9 rounded-md border border-border bg-card px-3 text-sm disabled:opacity-50"
            onClick={exportAllItems}
            disabled={recoveries.length === 0}
          >
            &nbsp;Export recoverable details&nbsp;
          </button>

          <button
            className="h-11 sm:h-9 rounded-md border border-border bg-card px-3 text-sm"
            onClick={() => setIsRecoverOpen(true)}
          >
            &nbsp;Recover account&nbsp;
          </button>

          <button
            className="h-11 sm:h-9 rounded-md border border-border bg-card px-3 text-sm"
            onClick={() => setIsFetchOpen(true)}
          >
            &nbsp;Fetch recoverable details&nbsp;
          </button>

          <button
            className="h-11 sm:h-9 rounded-md border border-border bg-card px-3 text-sm"
            onClick={() => setIsAttestationOpen(true)}
          >
            &nbsp;Create attestation&nbsp;
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {recoveries.length === 0 ? (
        <div className="text-sm text-muted">
          No recovery items found. Click &quot;Create recoverable&quot; to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {recoveries.map((r) => {
            const displayName = getDisplayName(r);
            const chainName = getChainName(r);

            return (
              <li key={r.id} className="w-full">
                <div className="w-full rounded-lg border border-border bg-card px-4 py-3">
                  <div className="grid gap-3 sm:gap-x-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)_auto] sm:items-center">

                    {/* Col 1: Account name */}
                    <div className="min-w-0">
                      <div className="truncate text-base font-medium sm:text-lg material-gold-text">
                        {displayName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground font-mono">
                        {shortenAddress(r.name)}
                      </div>
                    </div>

                    {/* Col 2: Domain */}
                    <div className="min-w-0">
                      <div className="text-xs text-muted">Domain</div>
                      <div className="truncate text-sm">{chainName} ({r.chainId})</div>
                    </div>

                    {/* Col 3: Recoverable address */}
                    <div className="min-w-0">
                      <div className="text-xs text-muted">Recoverable Contract Address</div>
                      <div className="truncate text-sm font-mono">
                        {r.recoverableAddress ? shortenAddress(r.recoverableAddress) : "—"}
                      </div>
                    </div>

                    {/* Col 4: Status */}
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status ? "Enabled" : "Disabled"}
                      </span>
                      <div className="mt-0.5 text-xs text-muted">{r.threshold}/{r.participants.length} threshold</div>
                    </div>

                    {/* Col 5: Actions */}
                    <div className="justify-self-start sm:justify-self-end">
                      <details className="relative inline-block">
                        <summary className="cursor-pointer list-none rounded-md border border-border bg-background px-3 py-2.5 text-sm sm:px-2 sm:py-1 sm:text-xs">
                          Actions
                        </summary>
                        <div className="absolute right-0 mt-1 w-40 rounded-md border border-border bg-background shadow-lg z-50">
                          <button
                            className="block w-full px-4 py-3 text-left text-sm sm:px-3 sm:py-2 sm:text-xs hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => {
                              (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                              setEditingRecovery(r);
                            }}
                          >
                            Edit
                          </button>
                          <div className="my-1 border-t border-border" />
                          <button
                            className="block w-full px-4 py-3 text-left text-sm text-red-600 sm:px-3 sm:py-2 sm:text-xs hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => {
                              (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                              setRecoveryToDelete(r);
                            }}
                          >
                            Delete
                          </button>
                          <div className="my-1 border-t border-border" />
                          <button
                            className="block w-full px-4 py-3 text-left text-sm sm:px-3 sm:py-2 sm:text-xs hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => {
                              (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                              setQrRecovery(r);
                            }}
                          >
                            Share
                          </button>
                          <div className="my-1 border-t border-border" />
                          <button
                            className="block w-full px-4 py-3 text-left text-sm sm:px-3 sm:py-2 sm:text-xs hover:bg-primary hover:text-primary-foreground"
                            onClick={(e) => {
                              (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute("open");
                              exportSingleItem(r);
                            }}
                          >
                            Export
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Delete confirmation modal ── */}
      {recoveryToDelete && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRecoveryToDelete(null); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch" as any,
            padding: 16,
            minHeight: "100dvh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(448px, calc(100dvw - 32px))",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              background: "#fff",
              color: "#111",
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
            }}
          >
            <h2 className="text-base font-semibold material-gold-text">Delete recovery?</h2>
            <p className="mt-2 text-sm text-muted">
              This will remove the recovery configuration for{" "}
              <strong>{getDisplayName(recoveryToDelete)}</strong> from your local list.
              This does <strong>not</strong> affect the on-chain recoverable contract — you will need
              to disable it separately.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-md border px-4 py-3 text-sm sm:px-3 sm:py-1"
                onClick={() => setRecoveryToDelete(null)}
              >
                &nbsp;Cancel&nbsp;
              </button>
              &nbsp;
              <button
                className="rounded-md bg-primary px-4 py-3 text-sm sm:px-3 sm:py-1 text-primary-foreground"
                onClick={() => {
                  deleteRecovery(recoveryToDelete.id);
                  setRecoveryToDelete(null);
                }}
              >
                &nbsp;Yes, delete&nbsp;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      {isCreateOpen && (
        <CreateRecoveryModal
          folios={folios}
          contacts={contacts}
          chainMap={chainMap}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={async (input) => {
            await addRecovery(input);
          }}
        />
      )}

      {/* ── Edit modal ── */}
      {editingRecovery && (
        <EditRecoveryModal
          recovery={editingRecovery}
          contacts={contacts}
          contactMap={contactMap}
          folioName={folioAddressMap.get(`${editingRecovery.name.toLowerCase()}:${editingRecovery.chainId}`)?.name ?? null}
          onClose={() => setEditingRecovery(null)}
          onUpdate={async (patch) => {
            await updateRecovery(editingRecovery.id, patch);
          }}
        />
      )}

      {/* ── QR / Share modal ── */}
      {qrRecovery && (
        <ShareQrModal
          payload={buildRecoveryShare(qrRecovery)}
          title={`Share Recovery — ${getDisplayName(qrRecovery)}`}
          onClose={() => setQrRecovery(null)}
        />
      )}

      {/* ── Recover account modal (placeholder) ── */}
      {isRecoverOpen && (
        <PlaceholderModal
          title="Recover Account"
          description="Choose a recovery action below. Full implementation coming soon."
          onClose={() => setIsRecoverOpen(false)}
        >
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-card px-4 py-3 text-sm text-left disabled:opacity-50"
              disabled
            >
              Initiate recovery — coming soon
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-card px-4 py-3 text-sm text-left disabled:opacity-50"
              disabled
            >
              Migrate account — coming soon
            </button>
          </div>
        </PlaceholderModal>
      )}

      {/* ── Fetch recoverable details modal (placeholder) ── */}
      {isFetchOpen && (
        <PlaceholderModal
          title="Fetch Recoverable Details"
          description="This will read the current status, threshold, and participants from the on-chain recoverable contract and sync them into your local store. Coming soon."
          onClose={() => setIsFetchOpen(false)}
        />
      )}

      {/* ── Create attestation modal (placeholder) ── */}
      {isAttestationOpen && (
        <PlaceholderModal
          title="Create Attestation"
          description="This will build the raw transaction to attest to a recovery request. Coming soon."
          onClose={() => setIsAttestationOpen(false)}
        />
      )}
    </div>
  );
}
