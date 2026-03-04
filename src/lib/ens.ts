import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

// --- In-memory + session cache ----------------------------------------------

const NULL_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL for null (not-found) results

type CacheEntry = { value: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function getCached(key: string): string | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.value === null && Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: string | null): void {
  cache.set(key, {
    value,
    expiresAt: value !== null ? Infinity : Date.now() + NULL_TTL_MS,
  });
}

// --- Public API -------------------------------------------------------------

/**
 * Resolve an ENS name to a hex address on Ethereum mainnet.
 * Returns null if the name is not registered or resolution fails.
 */
export async function resolveEnsAddress(
  name: string,
  mainnetRpcUrl: string
): Promise<Address | null> {
  const cacheKey = `resolve:${name.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached as Address | null;

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(mainnetRpcUrl),
    });
    const address = await client.getEnsAddress({ name });
    const result = address ?? null;
    setCached(cacheKey, result);
    return result;
  } catch {
    setCached(cacheKey, null);
    return null;
  }
}

/**
 * Reverse-lookup an ENS name for a hex address on Ethereum mainnet.
 * Returns null if no name is registered or the lookup fails.
 */
export async function lookupEnsName(
  address: Address,
  mainnetRpcUrl: string
): Promise<string | null> {
  const cacheKey = `lookup:${address.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(mainnetRpcUrl),
    });
    const name = await client.getEnsName({ address });
    const result = name ?? null;
    setCached(cacheKey, result);
    return result;
  } catch {
    setCached(cacheKey, null);
    return null;
  }
}
