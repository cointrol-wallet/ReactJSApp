import { get, set } from "idb-keyval";

// --- Legacy keys (kept for migration) ---------------------------------------

const UUID_KEY = "cointrol:auth:uuid:v1";
const TERMS_KEY = "cointrol:auth:termsAccepted:v1";

export async function getUUID(): Promise<string | null> {
  return (await get<string | undefined>(UUID_KEY)) ?? null;
}

export async function setUUID(uuid: string): Promise<void> {
  await set(UUID_KEY, uuid);
}

export async function hasAcceptedTerms(): Promise<boolean> {
  return (await get<boolean | undefined>(TERMS_KEY)) === true;
}

export async function setTermsAccepted(): Promise<void> {
  await set(TERMS_KEY, true);
}

export async function isFirstTimeUser(): Promise<boolean> {
  const [uuid, terms] = await Promise.all([getUUID(), hasAcceptedTerms()]);
  return !uuid && !terms;
}

// --- Registered users registry ----------------------------------------------

const REGISTERED_USERS_KEY = "cointrol:auth:registeredUsers:v1";
const MIGRATION_FLAG_KEY = "cointrol:auth:migrated:v1";

export type RegisteredUser = {
  uid: string;           // Firebase UID
  uuid: string;          // HKDF-derived wallet salt (hex)
  termsAcceptedAt: number; // unix ms
};

export async function getAllRegisteredUsers(): Promise<RegisteredUser[]> {
  return (await get<RegisteredUser[] | undefined>(REGISTERED_USERS_KEY)) ?? [];
}

export async function getRegisteredUser(uid: string): Promise<RegisteredUser | null> {
  const users = await getAllRegisteredUsers();
  return users.find(u => u.uid === uid) ?? null;
}

export async function isRegistered(uid: string): Promise<boolean> {
  return (await getRegisteredUser(uid)) !== null;
}

export async function registerUser(uid: string, uuid: string): Promise<void> {
  const users = await getAllRegisteredUsers();
  if (users.some(u => u.uid === uid)) return; // idempotent
  users.push({ uid, uuid, termsAcceptedAt: Date.now() });
  await set(REGISTERED_USERS_KEY, users);
}

// --- Salt derivation (moved from AuthContext) --------------------------------

export async function deriveUserSalt(uid: string): Promise<Uint8Array> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(uid),
    "HKDF",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("Cointrol QuantumAccount v1"),
      info: enc.encode("Account Generation Salt"),
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

// --- One-time migration for existing single-user installs -------------------

// Old non-namespaced data keys that need copying to uid-namespaced keys.
const MIGRATION_STORE_KEYS = [
  "cointrol:contacts:v1",
  "cointrol:contracts:v1",
  "cointrol:address:v1",
  "cointrol:domains:v1",
  "cointrol:coins:v1",
  "cointrol:builtin-coin-tags:v1",
  "cointrol:folios:v1",
  "cointrol:txns:v1",
  "cointrol:profile:displayName:v1",
];

export async function migrateIfNeeded(uid: string): Promise<void> {
  // Skip if already migrated or if this user is already registered
  if (await isRegistered(uid)) return;

  const [oldUuid, oldTerms] = await Promise.all([getUUID(), hasAcceptedTerms()]);

  // Only migrate if the device has original single-user data
  if (!oldUuid || !oldTerms) return;

  // Register the original user with their existing uuid
  await registerUser(uid, oldUuid);

  // Copy each old (non-namespaced) key to the new namespaced key,
  // but only if the new key is empty (don't overwrite on partial migration)
  for (const baseKey of MIGRATION_STORE_KEYS) {
    const newKey = `${baseKey}:${uid}`;
    const [oldData, newData] = await Promise.all([get(baseKey), get(newKey)]);
    if (oldData !== undefined && newData === undefined) {
      await set(newKey, oldData);
    }
  }

  await set(MIGRATION_FLAG_KEY, true);
}
