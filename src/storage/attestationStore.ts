import { get, set } from "idb-keyval";
import { getCurrentUser } from "./currentUser";

// --- Schema versioning -------------------------------------------------------

function attestationKey() { return `cointrol:attestations:v1:${getCurrentUser()}`; }
const ATTESTATION_SCHEMA_VERSION_KEY = "cointrol:attestations:schemaVersion";
const CURRENT_ATTESTATION_SCHEMA_VERSION = 1;

// Attestation schema v1
export type AttestationRecord = {
  id: string;                    // crypto.randomUUID()
  chainId: number;
  accountAddress: string;        // the QuantumAccount being recovered
  recoverableAddress: string;    // Recoverable contract address
  keypairId: string;             // ID of the key in keyStore
  keyHash: `0x${string}`;       // keccak256(pkBytes) = the _newKey arg for recoverWallet
  falconLevel: 512 | 1024;
  paymaster?: string;            // present if launched from a listed Recovery item
  createdAt: number;
};

// --- In-memory subscribers for live updates ---------------------------------

type AttestationListener = (records: AttestationRecord[]) => void;
const listeners = new Set<AttestationListener>();

function notifyAttestationUpdated(records: AttestationRecord[]) {
  for (const listener of listeners) {
    listener(records);
  }
}

export function subscribeToAttestations(listener: AttestationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Schema migration scaffolding -------------------------------------------

async function getAttestationSchemaVersion(): Promise<number> {
  const v = await get<number | undefined>(ATTESTATION_SCHEMA_VERSION_KEY);
  if (!v) return CURRENT_ATTESTATION_SCHEMA_VERSION;
  return v;
}

async function setAttestationSchemaVersion(v: number): Promise<void> {
  await set(ATTESTATION_SCHEMA_VERSION_KEY, v);
}

async function ensureAttestationSchemaMigrated(): Promise<void> {
  const storedVersion = await getAttestationSchemaVersion();

  if (storedVersion === CURRENT_ATTESTATION_SCHEMA_VERSION) {
    return;
  }

  // Example future migration (v1 → v2):
  //
  // if (storedVersion < 2) {
  //   const records = await get<AttestationRecord[] | undefined>(attestationKey());
  //   const migrated = (records ?? []).map(r => ({ ...r, newField: defaultValue }));
  //   await set(attestationKey(), migrated);
  //   await setAttestationSchemaVersion(2);
  // }

  if (storedVersion < CURRENT_ATTESTATION_SCHEMA_VERSION) {
    await setAttestationSchemaVersion(CURRENT_ATTESTATION_SCHEMA_VERSION);
  }
}

// --- Core load/save helpers --------------------------------------------------

async function loadAttestationsRaw(): Promise<AttestationRecord[]> {
  await ensureAttestationSchemaMigrated();
  const records = await get<AttestationRecord[] | undefined>(attestationKey());
  return records ?? [];
}

async function saveAttestationsRaw(records: AttestationRecord[]): Promise<void> {
  await set(attestationKey(), records);
  notifyAttestationUpdated(records);
}

// --- Public API --------------------------------------------------------------

export async function getAllAttestations(): Promise<AttestationRecord[]> {
  return loadAttestationsRaw();
}

export async function addAttestation(input: {
  chainId: number;
  accountAddress: string;
  recoverableAddress: string;
  keypairId: string;
  keyHash: `0x${string}`;
  falconLevel: 512 | 1024;
  paymaster?: string;
}): Promise<AttestationRecord[]> {
  const now = Date.now();
  const records = await loadAttestationsRaw();

  const newRecord: AttestationRecord = {
    id: crypto.randomUUID(),
    chainId: input.chainId,
    accountAddress: input.accountAddress,
    recoverableAddress: input.recoverableAddress,
    keypairId: input.keypairId,
    keyHash: input.keyHash,
    falconLevel: input.falconLevel,
    paymaster: input.paymaster,
    createdAt: now,
  };

  const updated = [...records, newRecord];
  await saveAttestationsRaw(updated);
  return updated;
}

export async function deleteAttestation(id: string): Promise<AttestationRecord[]> {
  const records = await loadAttestationsRaw();
  const updated = records.filter(r => r.id !== id);
  await saveAttestationsRaw(updated);
  return updated;
}

export async function clearAttestations(): Promise<void> {
  await saveAttestationsRaw([]);
}
