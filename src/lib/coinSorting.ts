import { Coin } from "../storage/coinStore";

export type CoinSortMode = "nameAsc" | "createdDesc" | "nameDesc" | "symbolAsc" | "symbolDesc" | "createdAsc" | "chainIdAsc" | "chainIdDesc";

export function sortCoins(
  coins: Coin[],
  mode: CoinSortMode = "createdAsc"
): Coin[] {
  const copy = [...coins];

  if (mode === "nameAsc") {
    copy.sort((a, b) =>
      a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
    );
  } else if (mode === "nameDesc") {
    copy.sort((a, b) =>
      b.name.toLocaleLowerCase().localeCompare(a.name.toLocaleLowerCase())
    );
  } else if (mode === "createdAsc") {
    copy.sort((a, b) => a.createdAt - b.createdAt);
  } else if (mode === "createdDesc") {
    copy.sort((a, b) => b.createdAt - a.createdAt);
  } else if (mode === "chainIdAsc") {
    copy.sort((a, b) => a.chainId - b.chainId);
  } else if (mode === "chainIdDesc") {
    copy.sort((a, b) => b.chainId - a.chainId);
  } else if (mode === "symbolAsc") {
    copy.sort((a, b) =>
      a.symbol.toLocaleLowerCase().localeCompare(b.symbol.toLocaleLowerCase())
    );
  } else if (mode === "symbolDesc") {
    copy.sort((a, b) =>
      b.symbol.toLocaleLowerCase().localeCompare(a.symbol.toLocaleLowerCase())
    );
  }


  return copy;
}