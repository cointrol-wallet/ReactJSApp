import type { Coin } from "@/storage/coinStore";
import type { Folio, Wallet } from "@/storage/folioStore";
import type { Domain } from "@/storage/domainStore";
import { Address, createPublicClient, http, erc20Abi } from "viem";

export type RefreshBalancesOpts = {
  folios: Folio[];
  coins: Coin[];
  // if you have Domains with rpcUrl, prefer passing rpcUrlByChainId instead of hardcoding
  domains: Domain[];
};

function isNative(coin: Coin) {
  return coin.type === "NATIVE" || coin.address === "0x0";
}

function normalizeAddress(a: string): Address {
  return a as Address;
}

export async function refreshBalancesForFolios(opts: RefreshBalancesOpts): Promise<Map<string, Wallet[]>> {
  const {
    folios,
    coins,
    domains,
  } = opts;

  // Return value: folioId -> new wallet list
  const updated = new Map<string, Wallet[]>();

  // Group coins by chainId for easy lookup
  const coinsByChain = new Map<number, Coin[]>();
  for (const c of coins) {
    const arr = coinsByChain.get(c.chainId) ?? [];
    arr.push(c);
    coinsByChain.set(c.chainId, arr);
  }

  // Group folios by chainId so we can reuse a publicClient per chain
  const foliosByChain = new Map<number, Folio[]>();
  for (const f of folios) {
    const arr = foliosByChain.get(f.chainId) ?? [];
    arr.push(f);
    foliosByChain.set(f.chainId, arr);
  }

  for (const [chainId, chainFolios] of foliosByChain.entries()) {
    const rpcUrl = domains.find(d => d.chainId === chainId)?.rpcUrl;

    // If you don't know this chain, skip gracefully
    if (!rpcUrl) continue;

    const client = createPublicClient({
      transport: http(rpcUrl), // if rpcUrl undefined and chain known, viem will still need transport; supply your default
    });

    const chainCoins = coinsByChain.get(chainId) ?? [];

    for (const folio of chainFolios) {
      const addr = normalizeAddress(folio.address);

      let targets: Coin[];
      const existingIds = new Set((folio.wallet ?? []).map(w => w.coin));
      targets = chainCoins.filter(c => existingIds.has(c.id));
     
      if (targets.length === 0) continue;

      // Fetch balances (sequential is simplest; you can batch later)
      const newWallets: Wallet[] = [];
      for (const coin of targets) {
        try {
          if (isNative(coin)) {
            const bal = await client.getBalance({ address: addr });
            newWallets.push({ coin: coin.id, balance: bal });
          } else if (coin.type === "ERC20") {
            const bal = await client.readContract({
              address: normalizeAddress(coin.address),
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [addr],
            });
            newWallets.push({ coin: coin.id, balance: bal as bigint });
          } else {
            // ERC1155 etc. — depends on tokenId; you don't have tokenId in Coin,
            // so skip for now.
            const existing = (folio.wallet ?? []).find(w => w.coin === coin.id);
            if (existing) newWallets.push(existing);
          }
        } catch {
          // Keep previous balance if the RPC call fails
          const existing = (folio.wallet ?? []).find(w => w.coin === coin.id);
          if (existing) newWallets.push(existing);
        }
      }

      updated.set(folio.id, newWallets);
    }
  }

  return updated;
}