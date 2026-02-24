import { get, set } from "idb-keyval";
import { addAddress, deleteAddress, updateAddress } from "./addressStore";

// --- Schema versioning -------------------------------------------------------

const CONTRACTS_KEY = "cointrol:contracts:v1";
const CONTRACTS_SCHEMA_VERSION_KEY = "cointrol:contracts:schemaVersion";
const CURRENT_CONTRACTS_SCHEMA_VERSION = 1;

// Contact schema v1
export type Contract = {
  id: string;  // unique identifier
  name: string;  // first name or company name
  address: string;  // optional last name
  chainId: number;
  metadata?: Record<string, any>;  // will be used to store ABIs, etc.
  tags?: string[];  // optional tags for categorization
  createdAt: number;       // ms since epoch
  updatedAt: number;       // ms since epoch
};



// --- In-memory subscribers for live updates ---------------------------------

type ContractsListener = (contracts: Contract[]) => void;
const listeners = new Set<ContractsListener>();

function notifyContractsUpdated(contracts: Contract[]) {
  for (const listener of listeners) {
    listener(contracts);
  }
}

export function subscribeToContracts(listener: ContractsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Schema migration scaffolding -------------------------------------------

async function getContractsSchemaVersion(): Promise<number> {
  const v = await get<number | undefined>(CONTRACTS_SCHEMA_VERSION_KEY);
  // If nothing stored yet, assume current version (fresh install)
  if (!v) return CURRENT_CONTRACTS_SCHEMA_VERSION;
  return v;
}

async function setContractsSchemaVersion(v: number): Promise<void> {
  await set(CONTRACTS_SCHEMA_VERSION_KEY, v);
}

/**
 * Run migrations if stored schema version is older than current.
 * Right now it's a no-op because v1 is the first schema.
 * When you introduce v2, add migration steps here.
 */
async function ensureContractsSchemaMigrated(): Promise<void> {
  const storedVersion = await getContractsSchemaVersion();

  if (storedVersion === CURRENT_CONTRACTS_SCHEMA_VERSION) {
    return;
  }

  let contracts = await get<Contract[] | undefined>(CONTRACTS_KEY);
  if (!contracts) contracts = [];

  // Example future migration (v1 → v2):
  //
  // if (storedVersion < 2) {
  //   const migrated = contacts.map(c => ({
  //     ...c,
  //     tags: [], // new field with default
  //   }));
  //   await set(CONTACTS_KEY, migrated);
  //   await setContactsSchemaVersion(2);
  // }
  //
  // For now we just bump the version if needed.

  if (storedVersion < CURRENT_CONTRACTS_SCHEMA_VERSION) {
    await setContractsSchemaVersion(CURRENT_CONTRACTS_SCHEMA_VERSION);
  }
}

// --- Core load/save helpers --------------------------------------------------

async function loadContractsRaw(): Promise<Contract[]> {
  await ensureContractsSchemaMigrated();
  const contracts = await get<Contract[] | undefined>(CONTRACTS_KEY);
  return contracts ?? [];
}

async function saveContractsRaw(contracts: Contract[]): Promise<void> {
  await set(CONTRACTS_KEY, contracts);
  notifyContractsUpdated(contracts);
}

// --- Public API --------------------------------------------------------------

export async function getAllContracts(): Promise<Contract[]> {
  return loadContractsRaw();
}

export async function addContract(input: {
  name: string;
  address: string;
  chainId: number;
  metadata?: Record<string, any>;
  tags?: string[] | null;
}): Promise<Contract[]> {
  const now = Date.now();
  const contracts = await loadContractsRaw();

  const newContract: Contract = {
    id: `contract:${crypto.randomUUID?.() ?? `${now}:${contracts.length}`}`,
    name: input.name,
    address: input.address,
    chainId: input.chainId,
    tags: input.tags || undefined,
    metadata: input.metadata || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...contracts, newContract];
  await saveContractsRaw(updated);
  await addAddress({
    id: `address:${newContract.id}`,
    name: newContract.name,
    isContact: false,
    isVisible: true,
    indexOrder: contracts.length, // add to end of list
  });
  return updated;
}

export async function updateContract(
  id: string,
  patch: Partial<Omit<Contract, "id" | "createdAt">>
): Promise<Contract[]> {
  const contracts = await loadContractsRaw();
  const now = Date.now();
  const updated = contracts.map(c =>
    c.id === id
      ? {
          ...c,
          ...patch,
          updatedAt: now,
        }
      : c
  );

  await saveContractsRaw(updated);
  await updateAddress(`address:${id}`, {
    name: patch.name || contracts.find(c => c.id === id)?.name || "",
  });
  return updated;
}


export async function deleteContract(id: string): Promise<Contract[]> {
  const contracts = await loadContractsRaw();
  const updated = contracts.filter(c => c.id !== id);
  await saveContractsRaw(updated);
  deleteAddress(`address:${id}`);
  return updated;
}

export async function clearContracts(): Promise<void> {
  await saveContractsRaw([]);
}
