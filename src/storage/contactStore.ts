import { get, set } from "idb-keyval";
import { addAddress, deleteAddress, updateAddress } from "./addressStore";

// --- Schema versioning -------------------------------------------------------

const CONTACTS_KEY = "cointrol:contacts:v1";
const CONTACTS_SCHEMA_VERSION_KEY = "cointrol:contacts:schemaVersion";
const CURRENT_CONTACTS_SCHEMA_VERSION = 1;

// Contact schema v1
export type Contact = {
  id: string;  // unique identifier
  name: string;  // first name or company name
  surname?: string;  // optional last name
  tags?: string[];  // optional tags for categorization
  wallets?: Wallet[];  // optional list of associated wallets
  createdAt: number;       // ms since epoch
  updatedAt: number;       // ms since epoch
};

export type Wallet = {
  chainId: number;
  address: string;
}


// --- In-memory subscribers for live updates ---------------------------------

type ContactsListener = (contacts: Contact[]) => void;
const listeners = new Set<ContactsListener>();

function notifyContactsUpdated(contacts: Contact[]) {
  for (const listener of listeners) {
    listener(contacts);
  }
}

export function subscribeToContacts(listener: ContactsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Schema migration scaffolding -------------------------------------------

async function getContactsSchemaVersion(): Promise<number> {
  const v = await get<number | undefined>(CONTACTS_SCHEMA_VERSION_KEY);
  // If nothing stored yet, assume current version (fresh install)
  if (!v) return CURRENT_CONTACTS_SCHEMA_VERSION;
  return v;
}

async function setContactsSchemaVersion(v: number): Promise<void> {
  await set(CONTACTS_SCHEMA_VERSION_KEY, v);
}

/**
 * Run migrations if stored schema version is older than current.
 * Right now it's a no-op because v1 is the first schema.
 * When you introduce v2, add migration steps here.
 */
async function ensureContactsSchemaMigrated(): Promise<void> {
  const storedVersion = await getContactsSchemaVersion();

  if (storedVersion === CURRENT_CONTACTS_SCHEMA_VERSION) {
    return;
  }

  let contacts = await get<Contact[] | undefined>(CONTACTS_KEY);
  if (!contacts) contacts = [];

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

  if (storedVersion < CURRENT_CONTACTS_SCHEMA_VERSION) {
    await setContactsSchemaVersion(CURRENT_CONTACTS_SCHEMA_VERSION);
  }
}

// --- Core load/save helpers --------------------------------------------------

async function loadContactsRaw(): Promise<Contact[]> {
  await ensureContactsSchemaMigrated();
  const contacts = await get<Contact[] | undefined>(CONTACTS_KEY);
  return contacts ?? [];
}

async function saveContactsRaw(contacts: Contact[]): Promise<void> {
  await set(CONTACTS_KEY, contacts);
  notifyContactsUpdated(contacts);
}

// --- Public API --------------------------------------------------------------

export async function getAllContacts(): Promise<Contact[]> {
  return loadContactsRaw();
}

export async function addContact(input: {
  name: string;
  surname?: string | null;
  tags?: string[] | null;
  wallets?: Wallet[]|null;
}): Promise<Contact[]> {
  const now = Date.now();
  const contacts = await loadContactsRaw();

  const newContact: Contact = {
    id: `contact:${crypto.randomUUID?.() ?? `${now}:${contacts.length}`}`,
    name: input.name,
    surname: input.surname || undefined,
    tags: input.tags || undefined,
    wallets: input.wallets || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...contacts, newContact];
  await saveContactsRaw(updated);
  await addAddress({
    id: `address:${newContact.id}`,
    name: newContact.name + (newContact.surname ? ` ${newContact.surname}` : ""),
    isContact: true,
    isVisible: true,
    indexOrder: contacts.length, // add to end of list
  });
  return updated;
}

export async function updateContact(
  id: string,
  patch: Partial<Omit<Contact, "id" | "createdAt">>
): Promise<Contact[]> {
  const contacts = await loadContactsRaw();
  const now = Date.now();
  const updated = contacts.map(c =>
    c.id === id
      ? {
          ...c,
          ...patch,
          updatedAt: now,
        }
      : c
  );

  await saveContactsRaw(updated);
  await updateAddress(`address:${id}`, {
    name: patch.name || contacts.find(c => c.id === id)?.name || "",
  });
  return updated;
}

export async function deleteContact(id: string): Promise<Contact[]> {
  const contacts = await loadContactsRaw();
  const updated = contacts.filter(c => c.id !== id);
  await saveContactsRaw(updated);
  await deleteAddress(`address:${id}`);
  return updated;
}

export async function clearContacts(): Promise<void> {
  await saveContactsRaw([]);
}
