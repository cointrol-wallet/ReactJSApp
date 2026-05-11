// shareImporters.ts
import type { SharePayload } from "./sharePayload";
import { addContact, getAllContacts, updateContact } from "@/storage/contactStore";
import { addContract, getAllContracts } from "@/storage/contractStore";
import { addCoin, getAllCoins } from "@/storage/coinStore";
import type { Contact, Wallet } from "@/storage/contactStore";
import type { Folio } from "@/storage/folioStore";

type ImportDeps = {
  folios?: Folio[];
  updateFolio?: (
    id: string,
    patch: Partial<Omit<Folio, "id" | "createdAt" | "address" | "chainId" | "name">>
  ) => Promise<Folio[]>;
};

export type ContactMatchInfo = {
  existing: Contact;
  mergedWallets: Wallet[];
  walletRelationship: "overlap" | "none";
  matchReason: "name" | "address";
};

export type ContactImportReview = {
  mode: "review";
  incoming: { name: string; surname?: string; wallets: Wallet[] };
  matches: ContactMatchInfo[];
};

function normAddr(a: string) {
  return a.toLowerCase();
}

function computeWalletRelationship(
  existing: Wallet[],
  incoming: Wallet[]
): "overlap" | "none" {
  if (incoming.length === 0) return "overlap";
  const existingKeys = new Set(
    existing.map((w) => `${w.chainId}:${normAddr(w.address)}`)
  );
  return incoming.some((w) =>
    existingKeys.has(`${w.chainId}:${normAddr(w.address)}`)
  )
    ? "overlap"
    : "none";
}

function smartMergeWallets(existing: Wallet[], incoming: Wallet[]): Wallet[] {
  const map = new Map<string, Wallet>();
  for (const w of existing) map.set(`${w.chainId}:${normAddr(w.address)}`, w);
  for (const w of incoming) {
    const key = `${w.chainId}:${normAddr(w.address)}`;
    const prev = map.get(key);
    // Prefer incoming if it adds a name the existing entry lacks
    map.set(key, prev && !prev.name && w.name ? w : (prev ?? w));
  }
  return [...map.values()];
}

function buildMatchInfo(
  existing: Contact,
  incoming: Wallet[],
  reason: "name" | "address"
): ContactMatchInfo {
  const existingWallets = existing.wallets ?? [];
  const relationship = computeWalletRelationship(existingWallets, incoming);
  const mergedWallets =
    relationship === "overlap"
      ? smartMergeWallets(existingWallets, incoming)
      : [...existingWallets, ...incoming];
  return {
    existing,
    mergedWallets,
    walletRelationship: relationship,
    matchReason: reason,
  };
}

async function reviewContactImport(
  payload: Extract<SharePayload, { t: "contact" | "profile" }>
): Promise<ContactImportReview> {
  const contacts = await getAllContacts();

  const incomingName = payload.data.name.trim().toLowerCase();
  const incomingSurname =
    (payload.data as any).surname?.trim().toLowerCase() ?? "";
  const incomingWallets: Wallet[] = payload.data.wallets ?? [];

  // Pass 1: name+surname matches
  const nameMatched = contacts.filter((c) => {
    const n = c.name.trim().toLowerCase();
    const s = (c.surname ?? "").trim().toLowerCase();
    return n === incomingName && s === incomingSurname;
  });
  const nameMatchedIds = new Set(nameMatched.map((c) => c.id));

  // Pass 2: wallet address matches on contacts NOT already in nameMatched
  const incomingAddressKeys = new Set(
    incomingWallets.map((w) => `${w.chainId}:${normAddr(w.address)}`)
  );
  const addressMatched = incomingWallets.length
    ? contacts.filter((c) => {
        if (nameMatchedIds.has(c.id)) return false;
        return (c.wallets ?? []).some((w) =>
          incomingAddressKeys.has(`${w.chainId}:${normAddr(w.address)}`)
        );
      })
    : [];

  const matches: ContactMatchInfo[] = [
    ...nameMatched.map((c) => buildMatchInfo(c, incomingWallets, "name")),
    ...addressMatched.map((c) => buildMatchInfo(c, incomingWallets, "address")),
  ];

  const incomingName_display = payload.data.name;
  const incomingSurname_display =
    payload.t === "contact" ? (payload.data as any).surname ?? undefined : undefined;

  return {
    mode: "review",
    incoming: {
      name: incomingName_display,
      surname: incomingSurname_display,
      wallets: incomingWallets,
    },
    matches,
  };
}

export async function applyAddNewContact(incoming: {
  name: string;
  surname?: string;
  wallets: Wallet[];
}): Promise<void> {
  await addContact({
    name: incoming.name,
    surname: incoming.surname ?? null,
    wallets: incoming.wallets.length ? incoming.wallets : null,
  });
}

export async function applyContactUpdate(
  existingId: string,
  mergedWallets: Wallet[]
): Promise<void> {
  await updateContact(existingId, { wallets: mergedWallets });
}

export type ContractImportReview = {
  mode: "review";
  incoming: {
    name: string;
    address: string;
    chainId: number;
    metadata?: Record<string, any>;
  };
  existingId: string | null;
};

export type CoinImportReview = {
  mode: "review";
  incoming: {
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
    address: string;
    type: string;
  };
  existingId: string | null;
};

async function reviewContractImport(payload: Extract<SharePayload, { t: "contract" }>): Promise<ContractImportReview> {
  const contracts = await getAllContracts();
  const addr = normAddr(payload.data.address);
  const existing = contracts.find(
    (c) => c.chainId === payload.data.chainId && normAddr(c.address) === addr
  );
  return {
    mode: "review",
    incoming: {
      name: payload.data.name,
      address: payload.data.address,
      chainId: payload.data.chainId,
      metadata: payload.data.metadata,
    },
    existingId: existing?.id ?? null,
  };
}

async function reviewCoinImport(payload: Extract<SharePayload, { t: "coin" }>): Promise<CoinImportReview> {
  const coins = await getAllCoins();
  const addr = normAddr(payload.data.address);
  const existing = coins.find(
    (c) => c.chainId === payload.data.chainId && normAddr(c.address) === addr
  );
  return {
    mode: "review",
    incoming: {
      name: payload.data.name,
      symbol: payload.data.symbol,
      decimals: payload.data.decimals,
      chainId: payload.data.chainId,
      address: payload.data.address,
      type: payload.data.type,
    },
    existingId: existing?.id ?? null,
  };
}

export async function applyAddContract(incoming: ContractImportReview["incoming"]): Promise<void> {
  await addContract({
    name: incoming.name,
    address: incoming.address,
    chainId: incoming.chainId,
    metadata: incoming.metadata,
  });
}

export async function applyAddCoin(
  incoming: CoinImportReview["incoming"],
  deps?: ImportDeps
): Promise<void> {
  const updatedCoins = await addCoin({
    name: incoming.name,
    symbol: incoming.symbol,
    decimals: incoming.decimals,
    chainId: incoming.chainId,
    address: incoming.address,
    type: incoming.type,
  });

  const newCoin = updatedCoins[updatedCoins.length - 1];

  if (deps?.folios && deps?.updateFolio) {
    for (const folio of deps.folios) {
      if (folio.chainId === Number(incoming.chainId)) {
        const existingWallet = folio.wallet ?? [];
        await deps.updateFolio(folio.id, {
          wallet: [...existingWallet, { coin: newCoin.id, balance: 0n }],
        });
      }
    }
  }
}

export async function importSharePayload(payload: SharePayload) {
  if (payload.t === "contact" || payload.t === "profile") return reviewContactImport(payload);
  if (payload.t === "contract") return reviewContractImport(payload);
  if (payload.t === "coin") return reviewCoinImport(payload);
  // Recovery and txrequest payloads are returned as prefill data for the caller
  // to handle — they do not write to any store directly.
  if (payload.t === "recovery") return { mode: "prefill" as const, data: payload.data };
  if (payload.t === "txrequest") return { mode: "prefill" as const, data: payload.data };
  throw new Error("Unsupported payload type");
}
