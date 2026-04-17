import { Recovery } from "../storage/recoveryStore";

export type RecoverySortMode = "nameAsc" | "createdDesc" | "nameDesc" | "chainIdAsc" | "chainIdDesc" | "createdAsc" | "thresholdAsc" | "thresholdDesc";

export function sortRecovery(
  recoveries: Recovery[],
  mode: RecoverySortMode = "createdAsc"
): Recovery[] {
  const copy = [...recoveries];

  if (mode === "nameAsc") {
    copy.sort((a, b) =>
      a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
    );
  } else if (mode === "createdDesc") {
    copy.sort((a, b) => b.createdAt - a.createdAt);
  } else if (mode === "nameDesc") {
    copy.sort((a, b) =>
      b.name.toLocaleLowerCase().localeCompare(a.name.toLocaleLowerCase())
    );
  } else if (mode === "chainIdDesc") {
    copy.sort((a, b) => b.chainId - a.chainId);
  } else if (mode === "chainIdAsc") {
    copy.sort((a, b) => a.chainId - b.chainId);
  }  else if (mode === "createdAsc") {
    copy.sort((a, b) => a.createdAt - b.createdAt);
  } else if (mode === "thresholdAsc") {
    copy.sort((a, b) => a.threshold - b.threshold);
  } else if (mode === "thresholdDesc") {
    copy.sort((a, b) => b.threshold - a.threshold);
  }


  return copy;
}
