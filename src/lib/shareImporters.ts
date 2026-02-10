import type { SharePayload } from "./sharePayload";
import { addContact, getAllContacts } from "@/storage/contactStore";
import { addContract, getAllContracts } from "@/storage/contractStore";

function normAddr(a: string) {
  return a.toLowerCase();
}

/**
 * Merge wallets into an existing contact if same name+surname (simple heuristic).
 * You can swap this for "address match" if you prefer.
 */
async function upsertContactByName(payload: Extract<SharePayload, { t: "contact" | "profile" }>) {
  const contacts = await getAllContacts();

  const incomingName = payload.data.name.trim().toLowerCase();
  const incomingSurname = (payload.data as any).surname?.trim().toLowerCase() ?? "";

  const existing = contacts.find(c => {
    const n = c.name.trim().toLowerCase();
    const s = (c.surname ?? "").trim().toLowerCase();
    return n === incomingName && s === incomingSurname;
  });

  // If you want "always create new", remove the merge logic.
  const wallets = payload.data.wallets ?? [];
  if (!existing) {
    await addContact({
      name: payload.data.name,
      surname: (payload.t === "contact" ? (payload.data as any).surname : undefined) ?? null,
      tags: payload.data.tags ?? null,
      wallets: wallets.length ? wallets : null,
    });
    return { mode: "created" as const };
  }

  const mergedWallets = [
    ...(existing.wallets ?? []),
    ...wallets,
  ];

  // Deduplicate
  const uniq = new Map<string, { chainId: number; address: string }>();
  for (const w of mergedWallets) {
    uniq.set(`${w.chainId}:${normAddr(w.address)}`, w);
  }

  // NOTE: you already have updateContact in storage; import it if you prefer merging
  // For brevity we’ll just create a "new" contact instead if you don't want update here.
  // If you want merge-in-place, use updateContact(existing.id, { wallets: [...uniq.values()] })

  return { mode: "matched" as const, existingId: existing.id, mergedWallets: [...uniq.values()] };
}

async function upsertContractByChainAndAddress(payload: Extract<SharePayload, { t: "contract" }>) {
  const contracts = await getAllContracts();
  const addr = normAddr(payload.data.address);

  const existing = contracts.find(
    c => c.chainId === payload.data.chainId && normAddr(c.address) === addr
  );

  if (existing) {
    // Same comment: you can update instead of creating new
    return { mode: "matched" as const, existingId: existing.id };
  }

  await addContract({
    name: payload.data.name,
    address: payload.data.address,
    chainId: payload.data.chainId,
    tags: payload.data.tags ?? null,
    metadata: payload.data.metadata,
  });

  return { mode: "created" as const, abiOmitted: payload.data.abiOmitted === true };
}

export async function importSharePayload(payload: SharePayload) {
  if (payload.t === "contact" || payload.t === "profile") {
    return upsertContactByName(payload);
  }
  if (payload.t === "contract") {
    return upsertContractByChainAndAddress(payload);
  }
  throw new Error("Unsupported payload type");
}
