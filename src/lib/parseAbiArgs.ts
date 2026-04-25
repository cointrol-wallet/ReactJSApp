// utils/parseAbiArg.ts
import { packedToRaw } from "@/crypto/falconUtils";
import { hexToBytes } from "viem";

export function parseAbiArg(type: string, raw: string): any {
  const value = raw.trim();

  if (type === "string") return value;
  if (type === "address") return value;
  if (type === "bool") return value.toLowerCase() === "true";

  if (type.startsWith("uint") || type.startsWith("int")) {
    // use BigInt for viem/ethers v6
    return BigInt(value || "0");
  }

  if (type.startsWith("bytes") && !type.endsWith("[]")) {
    // Falcon packed key from QR share — convert back to raw uint16 format
    if (value.startsWith("packed:0x")) {
      const bytes = hexToBytes(value.slice(7) as `0x${string}`);
      const level = bytes.length === 897 ? 512 : bytes.length === 1793 ? 1024 : null;
      if (!level) throw new Error("Unrecognised Falcon packed key length");
      return packedToRaw(bytes, level);
    }
    // assume hex string 0x...
    return value;
  }

  if (type.endsWith("[]")) {
    // VERY naive: expect JSON array in the input, e.g. ["0x...", "0x..."] or [1,2,3]
    try {
      return JSON.parse(value || "[]");
    } catch {
      throw new Error(`Invalid array JSON for type ${type}`);
    }
  }

  // fallback
  return value;
}
