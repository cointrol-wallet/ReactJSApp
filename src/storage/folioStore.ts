import { get, set } from "idb-keyval";
import { getCurrentUser } from "./currentUser";

// --- Schema versioning -------------------------------------------------------

function folioKey() { return `cointrol:folios:v1:${getCurrentUser()}`; }
const FOLIO_SCHEMA_VERSION_KEY = "cointrol:folios:schemaVersion";
const CURRENT_FOLIO_SCHEMA_VERSION = 2;

// Contact schema v1
export type Wallet = {
  coin: string;  // id from coin listener
  balance: bigint;  // balance in wei
};

export type Folio = {
  id: string;        // unique identifier
  address: string;   // wallet address
  name: string;      // label for the folio
  chainId: number;   // blockchain network ID
  paymaster: string; // paymaster address
  type: number;      // small number for bitchecking
  bundler: string;   // bundler address
  keypairId: string; // ID of the keypair in the key pool assigned to this account
  wallet?: Wallet[]; // optional list of associated wallets
  createdAt: number; // ms since epoch
  updatedAt: number; // ms since epoch
}

export type Paymaster = {
  address: string;   // paymaster address
  name: string;      // label for the paymaster
  chainId: number;   // blockchain network ID
  type: number;      // small number for bitchecking
  bundler: string;   // bundler address
  createdAt: number; // ms since epoch
  updatedAt: number; // ms since epoch
}

export type PortfolioStore = {
  folioId: string; // folio id
  coinId: string; // coin id from coin listener
  walletId: number; // wallet identifier in folio
}

// --- In-memory subscribers for live updates ---------------------------------

type folioListener = (folio: Folio[]) => void;
const listeners = new Set<folioListener>();

function notifyFoliosUpdated(folio: Folio[]) {
  for (const listener of listeners) {
    listener(folio);
  }
}

export function subscribeToFolios(listener: folioListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Schema migration scaffolding -------------------------------------------

async function getFoliosSchemaVersion(): Promise<number> {
  const v = await get<number | undefined>(FOLIO_SCHEMA_VERSION_KEY);
  // If nothing stored yet, assume current version (fresh install)
  if (!v) return CURRENT_FOLIO_SCHEMA_VERSION;
  return v;
}

async function setFoliosSchemaVersion(v: number): Promise<void> {
  await set(FOLIO_SCHEMA_VERSION_KEY, v);
}

/**
 * Run migrations if stored schema version is older than current.
 * Right now it's a no-op because v1 is the first schema.
 * When you introduce v2, add migration steps here.
 */
async function ensureFoliosSchemaMigrated(): Promise<void> {
  const storedVersion = await getFoliosSchemaVersion();

  if (storedVersion === CURRENT_FOLIO_SCHEMA_VERSION) {
    return;
  }

  let folios = await get<Folio[] | undefined>(folioKey());
  if (!folios) folios = [];

  if (storedVersion < 2) {
    // v1 → v2: add keypairId field (default to empty string for existing folios).
    const migrated = folios.map((f: any) => ({
      ...f,
      keypairId: f.keypairId ?? "",
    }));
    await set(folioKey(), migrated);
    await setFoliosSchemaVersion(2);
  }
}

// --- Core load/save helpers --------------------------------------------------

async function loadFoliosRaw(): Promise<Folio[]> {
  await ensureFoliosSchemaMigrated();
  const folios = await get<Folio[] | undefined>(folioKey());
  return folios ?? [];
}

async function saveFoliosRaw(folios: Folio[]): Promise<void> {
  await set(folioKey(), folios);
  notifyFoliosUpdated(folios);
}

// --- Public API --------------------------------------------------------------

export async function getAllFolios(): Promise<Folio[]> {
  return loadFoliosRaw();
}

export async function addFolio(input: {
  address: string;   // wallet address
  chainId: number;   // blockchain network ID
  name: string;      // label for the folio
  paymaster: string; // paymaster address
  type: number;      // small number for bitchecking
  bundler: string;   // bundler address
  keypairId: string; // ID of the keypair assigned to this account
  wallet?: Wallet[]; // optional list of associated wallets
  createdAt: number; // ms since epoch
  updatedAt: number; // ms since epoch
}): Promise<Folio[]> {
  const now = Date.now();
  const folios = await loadFoliosRaw();

  const newFolio: Folio = {
    id: `folio:${crypto.randomUUID?.() ?? `${now}:${folios.length}`}`,
    chainId: input.chainId,
    name: input.name,
    address: input.address,
    paymaster: input.paymaster,
    type: input.type,
    bundler: input.bundler,
    keypairId: input.keypairId,
    wallet: input.wallet || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...folios, newFolio];
  await saveFoliosRaw(updated);
  return updated;
}

export async function updateFolio(
  id: string,
  patch: Partial<Omit<Folio, "id" | "createdAt">>
): Promise<Folio[]> {
  const folios = await loadFoliosRaw();
  const now = Date.now();
  const updated = folios.map(c =>
    c.id === id
      ? {
          ...c,
          ...patch,
          updatedAt: now,
        }
      : c
  );

  await saveFoliosRaw(updated);
  return updated;
}

export async function deleteFolio(id: string): Promise<Folio[]> {
  const folios = await loadFoliosRaw();
  const updated = folios.filter(c => c.id !== id);
  await saveFoliosRaw(updated);
  return updated;
}

export async function clearFolios(): Promise<void> {
  await saveFoliosRaw([]);
}
