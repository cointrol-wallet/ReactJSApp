import { createPublicClient, http, keccak256, toHex } from "viem";
import { quantumAccountAbi } from "./abiTypes";

export type RecoverableOnChainEntry = {
  recoverableAddress: `0x${string}`;
  isActive: boolean;
};

export async function fetchRecoverableDetails(opts: {
  accountAddress: `0x${string}`;
  rpcUrl: string;
  entryPoint: `0x${string}`;
  keypairLevel: 512 | 1024;
}): Promise<RecoverableOnChainEntry[]> {
  const { accountAddress, rpcUrl, entryPoint, keypairLevel } = opts;
  const publicClient = createPublicClient({ transport: http(rpcUrl) });

  const addresses = await publicClient.readContract({
    address: accountAddress,
    abi: quantumAccountAbi,
    functionName: "getRecoverables",
    account: entryPoint,
  }) as `0x${string}`[];

  if (!addresses || addresses.length === 0) return [];

  // Storage layout: RecoverablesList[] starts at slot 35 (512) or 67 (1024).
  // Each element occupies 2 words:
  //   word 0: address paymaster (right-aligned)
  //   word 1: address recoverable (right-aligned, bytes 12-31) + bool isActive (byte 11)
  const arraySlot = keypairLevel === 512 ? 35n : 67n;
  const base = BigInt(keccak256(toHex(arraySlot, { size: 32 })));

  const results: RecoverableOnChainEntry[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const word1 = await publicClient.getStorageAt({
      address: accountAddress,
      slot: toHex(base + BigInt(i) * 2n + 1n, { size: 32 }),
    });
    // byte 11 (0-indexed from left) in the 32-byte hex word holds isActive
    // "0x" + 22 zero hex chars = position 24-25 in the string
    const isActive = word1 ? word1.slice(24, 26) !== "00" : false;
    results.push({ recoverableAddress: addresses[i], isActive });
  }

  return results;
}
