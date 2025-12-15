import type { Abi, AbiParameter } from "viem";

export type AbiFunctionFragment = Extract<Abi[number], { type: "function" }>;

export function extractAbi(abiJson: unknown): Abi | null {
  // Supports either:
  // - [ ... ]                (plain ABI array)
  // - { abi: [ ... ] }       (Etherscan-like)
  if (!abiJson) return null;

  if (Array.isArray(abiJson)) {
    return abiJson as Abi;
  }

  if (typeof abiJson === "object" && abiJson !== null && Array.isArray((abiJson as any).abi)) {
    return (abiJson as any).abi as Abi;
  }

  return null;
}

export function getFunctions(abi: Abi | null | undefined): AbiFunctionFragment[] {
  if (!abi) return [];
  return abi.filter((item): item is AbiFunctionFragment => item.type === "function");
}

export function getInputName(input: AbiParameter, index: number) {
  return input.name && input.name.length > 0 ? input.name : `arg${index}`;
}
