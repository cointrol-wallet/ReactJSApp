// shareImporters.ts
import type { SharePayload } from "./sharePayload";
import { addContact, getAllContacts } from "@/storage/contactStore";
import { addContract, getAllContracts } from "@/storage/contractStore";
import { addCoin, getAllCoins } from "@/storage/coinStore";
import type { Folio, Wallet } from "@/storage/folioStore";

type ImportDeps = {
  folios?: Folio[];
  updateFolio?: (
    id: string,
    patch: Partial<Omit<Folio, "id" | "createdAt">>
  ) => Promise<Folio[]>;
};

function normAddr(a: string) {
  return a.toLowerCase();
}

async function upsertContactByName(
  payload: Extract<SharePayload, { t: "contact" | "profile" }>
) {
  const contacts = await getAllContacts();

  const incomingName = payload.data.name.trim().toLowerCase();
  const incomingSurname = (payload.data as any).surname?.trim().toLowerCase() ?? "";

  const existing = contacts.find((c) => {
    const n = c.name.trim().toLowerCase();
    const s = (c.surname ?? "").trim().toLowerCase();
    return n === incomingName && s === incomingSurname;
  });

  const wallets = payload.data.wallets ?? [];
  if (!existing) {
    await addContact({
      name: payload.data.name,
      surname: (payload.t === "contact" ? (payload.data as any).surname : undefined) ?? null,
      wallets: wallets.length ? wallets : null,
    });
    return { mode: "created" as const };
  }

  const mergedWallets = [...(existing.wallets ?? []), ...wallets];

  const uniq = new Map<string, { chainId: number; address: string }>();
  for (const w of mergedWallets) {
    uniq.set(`${w.chainId}:${normAddr(w.address)}`, w);
  }

  return { mode: "matched" as const, existingId: existing.id, mergedWallets: [...uniq.values()] };
}

async function upsertContractByChainAndAddress(payload: Extract<SharePayload, { t: "contract" }>) {
  const contracts = await getAllContracts();
  const addr = normAddr(payload.data.address);

  const existing = contracts.find(
    (c) => c.chainId === payload.data.chainId && normAddr(c.address) === addr
  );

  if (existing) return { mode: "matched" as const, existingId: existing.id };

  await addContract({
    name: payload.data.name,
    address: payload.data.address,
    chainId: payload.data.chainId,
    metadata: payload.data.metadata,
  });

  return { mode: "created" as const, abiOmitted: payload.data.abiOmitted === true };
}

async function upsertCoinByChainAndAddress(
  payload: Extract<SharePayload, { t: "coin" }>,
  deps?: ImportDeps
) {
  const coins = await getAllCoins();
  const addr = normAddr(payload.data.address);

  const existing = coins.find(
    (c) => c.chainId === payload.data.chainId && normAddr(c.address) === addr
  );
  if (existing) return { mode: "matched" as const, existingId: existing.id };

  const updatedCoins = await addCoin({
    name: payload.data.name,
    symbol: payload.data.symbol,
    decimals: payload.data.decimals,
    chainId: payload.data.chainId,
    address: payload.data.address,
    type: payload.data.type,
  });

  const newCoin = updatedCoins[updatedCoins.length - 1];

  if (deps?.folios && deps?.updateFolio) {
    for (const folio of deps.folios) {
      if (folio.chainId === Number(payload.data.chainId)) {
        const existingWallet: Wallet[] = folio.wallet ?? [];
        await deps.updateFolio(folio.id, {
          wallet: [...existingWallet, { coin: newCoin.id, balance: 0n }],
        });
      }
    }
  }

  return { mode: "created" as const };
}

export async function importSharePayload(payload: SharePayload, deps?: ImportDeps) {
  if (payload.t === "contact" || payload.t === "profile") return upsertContactByName(payload);
  if (payload.t === "contract") return upsertContractByChainAndAddress(payload);
  if (payload.t === "coin") return upsertCoinByChainAndAddress(payload, deps);
  throw new Error("Unsupported payload type");
}
