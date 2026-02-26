import type { Contact } from "@/storage/contactStore";
import type { Contract } from "@/storage/contractStore";
import type { Folio } from "@/storage/folioStore";
import type { Coin } from "@/storage/coinStore";
import type { SharePayload } from "./sharePayload";
import { encodeSharePayload } from "./sharePayload";

function uniqWallets(wallets: { chainId: number; address: string }[]) {
  const m = new Map<string, { chainId: number; address: string }>();
  for (const w of wallets) {
    const key = `${w.chainId}:${w.address.toLowerCase()}`;
    if (!m.has(key)) m.set(key, { chainId: w.chainId, address: w.address });
  }
  return [...m.values()];
}

/**
 * Contact: include addresses for all chains
 */
export function buildContactShare(contact: Contact): SharePayload {
  return {
    v: 1,
    t: "contact",
    data: {
      name: contact.name,
      surname: contact.surname,
      wallets: contact.wallets ? uniqWallets(contact.wallets) : undefined,
    },
    meta: { createdAt: Date.now(), source: "Cointrol" },
  };
}

// Safe character limit for QR codes (version 40, ECC level L ≈ 2953 bytes binary)
const QR_CHAR_LIMIT = 2800;

/**
 * Contract: include ABI/metadata but omit if the encoded payload would exceed
 * QR code capacity. Uses actual encoded length for an accurate check.
 */
export function buildContractShare(contract: Contract): SharePayload {
  const baseData = {
    name: contract.name,
    address: contract.address,
    chainId: contract.chainId,
  };

  const makeMeta = () => ({ createdAt: Date.now(), source: "Cointrol" });

  // Try with full metadata (including ABI)
  if (contract.metadata) {
    const withMeta: SharePayload = {
      v: 1,
      t: "contract",
      data: { ...baseData, metadata: contract.metadata },
      meta: makeMeta(),
    };
    if (encodeSharePayload(withMeta).length <= QR_CHAR_LIMIT) {
      return withMeta;
    }

    // ABI is too large — strip it (handle both "ABI" and "abi" key conventions)
    const { ABI, abi, ...restMeta } = contract.metadata as any;
    const hasAbi = ABI !== undefined || abi !== undefined;
    const hasOtherMeta = Object.keys(restMeta).length > 0;

    if (hasOtherMeta) {
      const withoutAbi: SharePayload = {
        v: 1,
        t: "contract",
        data: { ...baseData, metadata: restMeta, abiOmitted: hasAbi || undefined },
        meta: makeMeta(),
      };
      if (encodeSharePayload(withoutAbi).length <= QR_CHAR_LIMIT) {
        return withoutAbi;
      }
    }
  }

  // Fallback: no metadata at all
  const hasAbi = !!(
    (contract.metadata as any)?.ABI || (contract.metadata as any)?.abi
  );
  return {
    v: 1,
    t: "contract",
    data: { ...baseData, abiOmitted: hasAbi || undefined },
    meta: makeMeta(),
  };
}

/**
 * Profile: share *all accounts for all chains* and *one name*.
 * We map folios -> wallets[] (chainId + address). This imports as Contact.
 */
export function buildProfileShareFromFolios(
  displayName: string,
  folios: Folio[],
  tags?: string[]
): SharePayload {
  const wallets = uniqWallets(
    folios.map(f => ({ chainId: f.chainId, address: f.address }))
  );

  return {
    v: 1,
    t: "profile",
    data: {
      name: displayName,
      wallets,
    },
    meta: { createdAt: Date.now(), source: "Cointrol" },
  };
}

/**
 * Coin: share full details
 */

export function buildCoinShare(coin: Coin): SharePayload {
  return {
    v: 1,
    t: "coin",
    data: {
      name: coin.name,
      symbol: coin.symbol,
      decimals: coin.decimals,
      chainId: coin.chainId,
      address: coin.address,
      type: coin.type,
    },
    meta: { createdAt: Date.now(), source: "Cointrol" },
  };
}