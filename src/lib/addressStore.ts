import { get, set } from "idb-keyval";

// --- Schema versioning -------------------------------------------------------

const ADDRESS_KEY = "cointrol:address:v1";
const ADDRESS_SCHEMA_VERSION_KEY = "cointrol:address:schemaVersion";
const CURRENT_ADDRESS_SCHEMA_VERSION = 1;

// Contact schema v1
export type Address = {
  id: string;  // unique identifier of the contact or contract
  isContact: boolean; // true for contacts and false for contracts
  isVisible: boolean; // whether to show in address book
  group?: string[]; // optional group tags for categorization
  indexOrder: number; // ordering index
  createdAt: number;       // ms since epoch
  updatedAt: number;       // ms since epoch
};



// --- In-memory subscribers for live updates ---------------------------------

type addressListener = (address: Address[]) => void;
const listeners = new Set<addressListener>();

function notifyAddresssUpdated(address: Address[]) {
  for (const listener of listeners) {
    listener(address);
  }
}

export function subscribeToAddresss(listener: addressListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Schema migration scaffolding -------------------------------------------

async function getAddresssSchemaVersion(): Promise<number> {
  const v = await get<number | undefined>(ADDRESS_SCHEMA_VERSION_KEY);
  // If nothing stored yet, assume current version (fresh install)
  if (!v) return CURRENT_ADDRESS_SCHEMA_VERSION;
  return v;
}

async function setAddresssSchemaVersion(v: number): Promise<void> {
  await set(ADDRESS_SCHEMA_VERSION_KEY, v);
}

/**
 * Run migrations if stored schema version is older than current.
 * Right now it's a no-op because v1 is the first schema.
 * When you introduce v2, add migration steps here.
 */
async function ensureAddresssSchemaMigrated(): Promise<void> {
  const storedVersion = await getAddresssSchemaVersion();

  if (storedVersion === CURRENT_ADDRESS_SCHEMA_VERSION) {
    return;
  }

  let addresss = await get<Address[] | undefined>(ADDRESS_KEY);
  if (!addresss) addresss = [];

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

  if (storedVersion < CURRENT_ADDRESS_SCHEMA_VERSION) {
    await setAddresssSchemaVersion(CURRENT_ADDRESS_SCHEMA_VERSION);
  }
}

// --- Core load/save helpers --------------------------------------------------

async function loadAddresssRaw(): Promise<Address[]> {
  await ensureAddresssSchemaMigrated();
  const addresss = await get<Address[] | undefined>(ADDRESS_KEY);
  return addresss ?? [];
}

async function saveAddresssRaw(addresss: Address[]): Promise<void> {
  await set(ADDRESS_KEY, addresss);
  notifyAddresssUpdated(addresss);
}

// --- Public API --------------------------------------------------------------

export async function getAllAddresss(): Promise<Address[]> {
  return loadAddresssRaw();
}

export async function addAddress(input: {
  id: string;
  group?: string[] | null;
  isContact: boolean;
  isVisible: boolean;
  indexOrder: number;
}): Promise<Address[]> {
  const now = Date.now();
  const addresss = await loadAddresssRaw();

  const newaddress: Address = {
    id: input.id,
    group: input.group || undefined,
    isContact: input.isContact,
    isVisible: input.isVisible,
    indexOrder: input.indexOrder,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...addresss, newaddress];
  await saveAddresssRaw(updated);
  return updated;
}

export async function updateAddress(
  id: string,
  patch: Partial<Omit<Address, "id" | "createdAt">>
): Promise<Address[]> {
  const addresss = await loadAddresssRaw();
  const now = Date.now();
  const updated = addresss.map(c =>
    c.id === id
      ? {
          ...c,
          ...patch,
          updatedAt: now,
        }
      : c
  );

  await saveAddresssRaw(updated);
  return updated;
}

export async function deleteAddress(id: string): Promise<Address[]> {
  const addresss = await loadAddresssRaw();
  const updated = addresss.filter(c => c.id !== id);
  await saveAddresssRaw(updated);
  return updated;
}

export async function clearAddresss(): Promise<void> {
  await saveAddresssRaw([]);
}
