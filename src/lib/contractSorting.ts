import { Contract } from "../storage/contractStore";

export type ContractSortMode = "nameAsc" | "createdDesc" | "nameDesc" | "addressAsc" | "addressDesc" | "createdAsc" | "chainIdAsc" | "chainIdDesc";

export function sortContracts(
  contracts: Contract[],
  mode: ContractSortMode = "createdAsc"
): Contract[] {
  const copy = [...contracts];

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
  } else if (mode === "addressAsc") {
    copy.sort((a, b) =>
      a.address.toLocaleLowerCase().localeCompare(b.address.toLocaleLowerCase())
    );
  } else if (mode === "addressDesc") {
    copy.sort((a, b) =>
      b.address.toLocaleLowerCase().localeCompare(a.address.toLocaleLowerCase())
    );
  }


  return copy;
}