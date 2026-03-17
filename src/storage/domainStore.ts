import { get, set } from "idb-keyval";
import { getCurrentUser } from "./currentUser";

// --- Schema versioning -------------------------------------------------------

function domainKey() { return `cointrol:domains:v1:${getCurrentUser()}`; }
function domainSchemaVersionKey() { return `cointrol:domains:schemaVersion:${getCurrentUser()}`; }
const CURRENT_DOMAIN_SCHEMA_VERSION = 2;

// Domain schema v2

export type AccountType = "falcon512" | "falcon1024" | "ecc";

export type Domain = {
  name: string;           // label for the domain
  chainId: number;        // blockchain network ID
  entryPoint: string;     // entrypoint contract address
  factory: string;        // QuantumAccountFactory contract address
  falcon: string;         // Falcon verifier contract address (empty string for ecc)
  accountType: AccountType; // cryptographic scheme used by accounts on this domain
  paymaster: string;      // paymaster address
  bundler: string;        // bundler address
  rpcUrl: string;         // rpc url used locally by app
  transactionUrl: string; // etherscan url for tx (or equivalent)
  createdAt: number;      // ms since epoch
  updatedAt: number;      // ms since epoch
}

const BUILTIN_DOMAINS: Domain[] = [{
  name: "ETHEREUM SEPOLIA",
  chainId: 11155111,
  entryPoint:   "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
  factory:      "0xb0b80A0B15b5fD7b3895b5B5A66aFD5529DfdAE6",
  falcon:       "0x01A272c06df74c3331f1E56f357D7A38f28B7346",
  accountType:  "falcon512",
  paymaster:    "0x018D7d0526c366678976927EA2E9Fb65f8512115",
  bundler:      "0xD50a29DB30231F9D3cD42a6162329D1f4EEfeFED",
  rpcUrl:       "https://ethereum-sepolia-rpc.publicnode.com",
  transactionUrl: "https://sepolia.etherscan.io/tx/",
  createdAt: 0,
  updatedAt: 0,
}];

// --- In-memory subscribers for live updates ---------------------------------

type domainListener = (domain: Domain[]) => void;
const listeners = new Set<domainListener>();

function notifyDomainsUpdated(domain: Domain[]) {
  const allDomains = [...domain, ...BUILTIN_DOMAINS];
  for (const listener of listeners) {
    listener(allDomains);
  }
}

export function subscribeToDomains(listener: domainListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Schema migration scaffolding -------------------------------------------

async function getDomainsSchemaVersion(): Promise<number> {
  const v = await get<number | undefined>(domainSchemaVersionKey());
  // Default to v1 (not current) so that all migrations run on first load,
  // including for existing installs where the version key was never written.
  if (!v) return 1;
  return v;
}

async function setDomainsSchemaVersion(v: number): Promise<void> {
  await set(domainSchemaVersionKey(), v);
}

async function ensureDomainSchemaMigrated(): Promise<void> {
  const storedVersion = await getDomainsSchemaVersion();

  if (storedVersion === CURRENT_DOMAIN_SCHEMA_VERSION) {
    return;
  }

  let domains = await get<any[] | undefined>(domainKey());
  if (!domains) domains = [];

  if (storedVersion < 2) {
    // v1 → v2: add factory, falcon, accountType fields to existing user-added domains.
    // factory and falcon default to "" (unknown — must be set via updateDomain before
    // account creation can proceed on those domains). accountType defaults to "falcon512"
    // since that is the only scheme deployed prior to this migration.
    const migrated = domains.map((d: any) => ({
      ...d,
      factory:     d.factory     ?? "",
      falcon:      d.falcon      ?? "",
      accountType: d.accountType ?? "falcon512" as AccountType,
    }));
    await set(domainKey(), migrated);
    await setDomainsSchemaVersion(2);
  }
}

// --- Core load/save helpers --------------------------------------------------

async function loadDomainsRaw(): Promise<Domain[]> {
  await ensureDomainSchemaMigrated();
  const domains = await get<Domain[] | undefined>(domainKey());
  return domains ?? [];
}

async function saveDomainsRaw(domains: Domain[]): Promise<void> {
  await set(domainKey(), domains);
  notifyDomainsUpdated(domains);
}

// --- Public API --------------------------------------------------------------

export async function getAllDomains(): Promise<Domain[]> {
  const domains = await loadDomainsRaw();
  return [...domains, ...BUILTIN_DOMAINS];
}

export async function addDomain(input: {
  name: string;
  chainId: number;
  entryPoint: string;
  factory: string;          // required — account creation cannot proceed without it
  falcon?: string;          // optional — defaults to "" (e.g. for ecc domains)
  accountType: AccountType;
  paymaster: string;
  bundler: string;
  rpcUrl: string;
  transactionUrl: string;
}): Promise<Domain[]> {
  const now = Date.now();
  const domains = await loadDomainsRaw();

  const newDomain: Domain = {
    chainId:      input.chainId,
    name:         input.name,
    entryPoint:   input.entryPoint,
    factory:      input.factory,
    falcon:       input.falcon ?? "",
    accountType:  input.accountType,
    paymaster:    input.paymaster,
    bundler:      input.bundler,
    rpcUrl:       input.rpcUrl,
    transactionUrl: input.transactionUrl,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...domains, newDomain];
  await saveDomainsRaw(updated);
  return updated;
}

export async function updateDomain(
  name: string,
  patch: Partial<Omit<Domain, "name" | "chainId" | "entryPoint" | "createdAt">>
): Promise<Domain[]> {
  const domains = await loadDomainsRaw();
  const now = Date.now();
  const updated = domains.map(c =>
    c.name === name
      ? {
          ...c,
          ...patch,
          updatedAt: now,
        }
      : c
  );

  await saveDomainsRaw(updated);
  return updated;
}

export async function deleteDomain(name: string): Promise<Domain[]> {
  const folios = await loadDomainsRaw();
  const updated = folios.filter(c => c.name !== name);
  await saveDomainsRaw(updated);
  return updated;
}

export async function clearDomains(): Promise<void> {
  await saveDomainsRaw([]);
}
