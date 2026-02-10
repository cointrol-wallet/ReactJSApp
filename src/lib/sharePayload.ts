import { z } from "zod";
import type { Contact } from "@/storage/contactStore";
import type { Contract } from "@/storage/contractStore";
import type { Folio } from "@/storage/folioStore";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

export const SHARE_PREFIX = "cointrol://share/v1/";

const zHexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

const zWallet = z.object({
  chainId: z.number().int().positive(),
  address: zHexAddress,
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
    tags: z.array(z.string()).optional(),
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
    tags: z.array(z.string()).optional(),
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
    tags: z.array(z.string()).optional(),
    wallets: z.array(zWallet).min(1), // folios mapped to wallets (all chains)
  }),
  meta: zShareMeta,
});

export const zSharePayload = z.union([zContactShare, zContractShare, zProfileShare]);
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
