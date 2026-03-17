import { get, set, del } from "idb-keyval";
import { createFalconWorkerClient } from "@/crypto/falconInterface";
import { predictQuantumAccountAddress } from "@/lib/predictQuantumAccountAddress";
import { stringToHex, bytesToHex, Hex } from "viem";

export type FalconLevel = 512 | 1024;

export type FalconKeypair = {
  level: FalconLevel;
  pk: Uint8Array;
  sk: Uint8Array;
};

// --- Key Storage ---

// Legacy key — stored raw AES bytes (insecure). Kept as a string literal for
// migration detection only; no longer read or written for crypto purposes.
const LEGACY_WRAPPING_KEY_ID = "cointrol:wrappingKey:v1";

// v2: PBKDF2-derived wrapping key (never stored). Only the salt is persisted.
const WRAPPING_SALT_ID = "cointrol:wrappingSalt:v2";

// Firebase UID set by initKeyStore — required before any crypto operation.
let _uid: string | null = null;

/**
 * Must be called once when the user logs in (from AuthContext.onAuthStateChanged).
 * Wipes legacy stored wrapping key and re-derived all Falcon keys on first call.
 */
export async function initKeyStore(uid: string): Promise<void> {
  // Set _uid first so keyId() works inside the cleanup blocks below.
  _uid = uid;

  // One-time migration: if the insecure stored wrapping key exists, wipe everything
  // and let the normal keypair-generation flow start fresh.
  const legacy = await get(LEGACY_WRAPPING_KEY_ID);
  if (legacy !== undefined) {
    await Promise.all([
      del(LEGACY_WRAPPING_KEY_ID),
      del(keyId(512, "pk")),
      del(keyId(512, "sk")),
      del(keyId(1024, "pk")),
      del(keyId(1024, "sk")),
    ]);
  }

  // One-time migration: wipe old non-namespaced Falcon keypair keys (stored before
  // user-namespacing was introduced). They cannot be decrypted by any user since the
  // wrapping key is UID-derived, so deleting them is always safe.
  const OLD_PK_512 = "cointrol:falcon:512:pk:v1";
  const oldPk = await get(OLD_PK_512);
  if (oldPk !== undefined) {
    await Promise.all([
      del(OLD_PK_512),
      del("cointrol:falcon:512:sk:v1"),
      del("cointrol:falcon:1024:pk:v1"),
      del("cointrol:falcon:1024:sk:v1"),
    ]);
  }
}

/** Call on sign-out to prevent key access after the session ends. */
export function clearKeyStore(): void {
  _uid = null;
}

type CipherRecord = {
  alg: "falcon";
  level: FalconLevel;
  cipherText: ArrayBuffer;
  iv: ArrayBuffer;        // 12 bytes for AES-GCM
  createdAt: number;
};

function keyId(level: FalconLevel, kind: "pk" | "sk") {
  if (!_uid) throw new Error("keyStore not initialised — call initKeyStore(uid) first");
  return `cointrol:falcon:${level}:${kind}:v1:${_uid}`;
}

async function loadOrCreateWrappingKey(): Promise<CryptoKey> {
  if (!_uid) throw new Error("keyStore not initialised — call initKeyStore(uid) first");

  // Load or create a persistent random salt (not secret; protects against cross-user reuse).
  // Stored as Uint8Array; older installs may have stored a raw ArrayBuffer — normalise on read.
  // Use .slice() / new Uint8Array(buf) to guarantee Uint8Array<ArrayBuffer> (not ArrayBufferLike)
  // so that crypto.subtle.deriveKey accepts it without a TypeScript error.
  const saltRaw = await get<ArrayBuffer | Uint8Array>(WRAPPING_SALT_ID);
  let salt: Uint8Array<ArrayBuffer>;
  if (!saltRaw || (saltRaw as { byteLength: number }).byteLength === 0) {
    salt = crypto.getRandomValues(new Uint8Array(32));
    await set(WRAPPING_SALT_ID, salt);
  } else if (saltRaw instanceof Uint8Array) {
    salt = saltRaw.slice(); // .slice() → Uint8Array<ArrayBuffer>
  } else {
    salt = new Uint8Array(saltRaw as ArrayBuffer);
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(_uid),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 300_000 },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable — key bytes can never leave the browser crypto engine
    ["encrypt", "decrypt"]
  );
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(u8.byteLength);
  new Uint8Array(buf).set(u8);
  return buf;
}

function fromArrayBuffer(buf: ArrayBuffer): Uint8Array {
  return new Uint8Array(buf);
}

async function encryptBytes(level: FalconLevel, bytes: Uint8Array): Promise<CipherRecord> {
  const wrappingKey = await loadOrCreateWrappingKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipherText = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    toArrayBuffer(bytes)
  );

  return {
    alg: "falcon",
    level,
    cipherText,
    iv: toArrayBuffer(iv),
    createdAt: Date.now(),
  };
}

async function decryptBytes(rec: CipherRecord): Promise<Uint8Array> {
  const wrappingKey = await loadOrCreateWrappingKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(rec.iv) },
    wrappingKey,
    rec.cipherText
  );
  return fromArrayBuffer(plain);
}

export async function getFalconPublicKey(level: FalconLevel): Promise<Uint8Array | null> {
  const rec = await get<CipherRecord>(keyId(level, "pk"));
  if (!rec) return null;
  return decryptBytes(rec);
}

export async function getFalconSecretKey(level: FalconLevel): Promise<Uint8Array | null> {
  const rec = await get<CipherRecord>(keyId(level, "sk"));
  if (!rec) return null;
  return decryptBytes(rec);
}

export async function falconKeypairExists(level: FalconLevel): Promise<boolean> {
  const [pkRec, skRec] = await Promise.all([
    get<CipherRecord>(keyId(level, "pk")),
    get<CipherRecord>(keyId(level, "sk")),
  ]);
  return !!pkRec && !!skRec;
}

/**
 * Generate a fresh Falcon private key with ntruGen(1024),
 * encrypt it, store it, and return it.
 * also store public key
 */
export async function generateAndStoreFalconKeypair(level: FalconLevel): Promise<{ pk: Uint8Array; sk: Uint8Array }> {
  const falcon = createFalconWorkerClient();

  // Generate using liboqs inside the worker
  const { pk, sk } = await falcon.generateKeypair(level);

  // Encrypt sequentially so the first call creates the salt before the second
  // reads it. Parallel calls race on first-ever keygen: both see no salt, both
  // generate a different salt, and only one survives — causing a decrypt failure.
  const pkRec = await encryptBytes(level, pk);
  const skRec = await encryptBytes(level, sk);

  await Promise.all([
    set(keyId(level, "pk"), pkRec),
    set(keyId(level, "sk"), skRec),
  ]);
  falcon.terminate();

  return { pk, sk };
}

const ensureInFlight = new Map<FalconLevel, Promise<boolean>>();

export async function ensureFalconKeypair(level: FalconLevel): Promise<boolean> {
  const existing = ensureInFlight.get(level);
  if (existing) return existing;

  const p = (async () => {
    // Fast path
    if (await falconKeypairExists(level)) return true;

    // Generate/store
    const { pk, sk } = await generateAndStoreFalconKeypair(level);

    // Defensive: verify persisted state (not just returned buffers)
    const ok = pk.length > 0 && sk.length > 0;
    if (!ok) return false;

    // Re-check storage to confirm it stuck (helps if store partially failed)
    return await falconKeypairExists(level);
  })().catch((e) => {
    // allow retry after real failure
    ensureInFlight.delete(level);
    throw e;
  });

  ensureInFlight.set(level, p);
  return p.finally(() => {
    // Once complete, remove lock so future calls can just fast-path on exists()
    ensureInFlight.delete(level);
  });
}



/**
 * 
 * @returns the Falcon private key for signing
 */
export async function getSecretKey(level: FalconLevel): Promise<Uint8Array> {
  const sk = await getFalconSecretKey(level);
  if (!sk) throw new Error(`Falcon-${level} secret key not found`);
  return sk;
}


export async function getAddress(
  salt: string,
  level: FalconLevel,
  domain: { entryPoint: string; factory: string; falcon: string }
): Promise<string> {
  const pk = await getFalconPublicKey(level);
  if (!pk) {
    throw new Error("Falcon public key not found");
  }
  const address = predictQuantumAccountAddress({
    entryPoint: domain.entryPoint as Hex,
    factory:    domain.factory as Hex,
    falcon:     domain.falcon as Hex,
    publicKeyBytes: bytesToHex(pk),
    salt: salt.startsWith("0x") ? salt as Hex : stringToHex(salt),
  });
  return address;
}