import { z } from "zod";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

export const SHARE_PREFIX = "cointrol://share/v1/";

// Safe character limit for QR codes (version 40, ECC level L ≈ 2953 bytes binary)
export const QR_CHAR_LIMIT = 2800;

const zHexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

const zWallet = z.object({
  chainId: z.number().int().positive(),
  address: zHexAddress,
  name: z.string().optional(),
});

const zShareMeta = z
  .object({
    createdAt: z.number().int().optional(),
    source: z.string().optional(), // e.g. "Cointrol"
    note: z.string().optional(),
  })
  .optional();

// ---- Payload variants --------------------------------------------------------

export const zContactShare = z.object({
  v: z.literal(1),
  t: z.literal("contact"),
  data: z.object({
    name: z.string().min(1),
    surname: z.string().optional(),
    wallets: z.array(zWallet).optional(), // include all chains
  }),
  meta: zShareMeta,
});

export const zContractShare = z.object({
  v: z.literal(1),
  t: z.literal("contract"),
  data: z.object({
    name: z.string().min(1),
    address: zHexAddress,
    chainId: z.number().int().positive(),
    metadata: z.record(z.string(), z.any()).optional(), // may include ABI
    // optional flags to help importer UX
    abiOmitted: z.boolean().optional(),
  }),
  meta: zShareMeta,
});

export const zProfileShare = z.object({
  v: z.literal(1),
  t: z.literal("profile"),
  data: z.object({
    name: z.string().min(1), // one name only
    wallets: z.array(zWallet).min(1), // folios mapped to wallets (all chains)
  }),
  meta: zShareMeta,
});

export const zCoinShare = z.object({
  v: z.literal(1),
  t: z.literal("coin"),
  data: z.object({
    name: z.string().min(1),
    symbol: z.string().min(1),
    decimals: z.number().int().nonnegative(),
    chainId: z.number().int().positive(),
    address: zHexAddress,
    type: z.string().min(1), // token type (e.g., NATIVE, ERC20, ERC1155)
  }),
  meta: zShareMeta,
});

export const zRecoveryShare = z.object({
  v: z.literal(1),
  t: z.literal("recovery"),
  data: z.object({
    name: z.string().min(1),            // folio address (stable ID)
    chainId: z.number().int().positive(),
    recoverableAddress: z.string(),     // may be empty string before deployment
    paymaster: z.string(),
    threshold: z.number().int().min(1),
    status: z.boolean(),
    participants: z.array(z.string()),  // 0x addresses
  }),
  meta: zShareMeta,
});

export const zTxRequestShare = z.object({
  v: z.literal(1),
  t: z.literal("txrequest"),
  data: z.object({
    type: z.enum(["transfer", "contract"]),
    chainId: z.number().int().positive(),
    sender: z.string().optional(),          // folio or contact address
    // Transfer mode fields
    coinAddress: z.string().optional(),     // coin contract address
    coinSymbol: z.string().optional(),      // for display
    coinDecimals: z.number().int().optional(),
    // Contract mode fields
    contractAddress: z.string().optional(),
    contractName: z.string().optional(),    // for display
    // Shared
    functionName: z.string().optional(),
    args: z.record(z.string(), z.string()).optional(), // param name → value
    payableValue: z.string().optional(),
  }),
  meta: zShareMeta,
});

export const zSharePayload = z.union([
  zContactShare,
  zContractShare,
  zProfileShare,
  zCoinShare,
  zRecoveryShare,
  zTxRequestShare,
]);
export type SharePayload = z.infer<typeof zSharePayload>;

// ---- Encoding/decoding ------------------------------------------------------

export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const packed = compressToEncodedURIComponent(json);
  return `${SHARE_PREFIX}${packed}`;
}

export function decodeSharePayload(text: string): SharePayload {
  const packed = text.startsWith(SHARE_PREFIX) ? text.slice(SHARE_PREFIX.length) : text;

  const json = decompressFromEncodedURIComponent(packed);
  if (!json) throw new Error("Invalid or unsupported QR payload");

  // size guard (post-decompression)
  if (json.length > 200_000) throw new Error("Payload too large");

  const parsed = JSON.parse(json);
  return zSharePayload.parse(parsed);
}
