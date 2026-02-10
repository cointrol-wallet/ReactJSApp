import type { Contact } from "@/storage/contactStore";
import type { Contract } from "@/storage/contractStore";
import type { Folio } from "@/storage/folioStore";
import type { SharePayload } from "./sharePayload";

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
      tags: contact.tags,
      wallets: contact.wallets ? uniqWallets(contact.wallets) : undefined,
    },
    meta: { createdAt: Date.now(), source: "Cointrol" },
  };
}

/**
 * Contract: include ABI/metadata but omit if above max bytes
 *
 * maxMetadataBytes is for the JSON stringified metadata field.
 * You can tune this depending on QR reliability.
 */
export function buildContractShare(
  contract: Contract,
  opts: { maxMetadataBytes?: number } = {}
): SharePayload {
  const maxMetadataBytes = opts.maxMetadataBytes ?? 20_000;

  let metadata = contract.metadata;
  let abiOmitted = false;

  if (metadata) {
    const metaJson = JSON.stringify(metadata);
    // byte-ish estimate (UTF-16 is not 1:1, but close enough for a guard)
    if (metaJson.length > maxMetadataBytes) {
      // If ABI is the main bloat, drop it but keep other metadata.
      // Convention: ABI stored under metadata.abi
      const { abi, ...rest } = metadata as any;
      metadata = rest;
      abiOmitted = true;
    }
  }

  return {
    v: 1,
    t: "contract",
    data: {
      name: contract.name,
      address: contract.address,
      chainId: contract.chainId,
      tags: contract.tags,
      metadata: metadata ?? undefined,
      abiOmitted: abiOmitted || undefined,
    },
    meta: { createdAt: Date.now(), source: "Cointrol" },
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
      tags,
      wallets,
    },
    meta: { createdAt: Date.now(), source: "Cointrol" },
  };
}
