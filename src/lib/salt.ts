import { keccak256, stringToHex } from "viem";

/**
 * Derive a deterministic 32-byte CREATE2 salt from a user's Firebase UID and
 * folio name. The same uid + folioName always produces the same salt on any
 * device, enabling cross-device address recovery without storing a random nonce.
 *
 * Two folios with the same name for the same user will produce the same salt
 * (and therefore the same address), so callers must enforce name uniqueness.
 */
export function deriveFolioSalt(uid: string, folioName: string): `0x${string}` {
  return keccak256(stringToHex(`${uid}:${folioName}`));
}
