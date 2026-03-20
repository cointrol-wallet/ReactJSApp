import {
  Hex,
  Address,
  keccak256,
  concatHex,
  pad,
} from "viem";

/**
 * Precompute the CREATE2 address for a QuantumAccount.
 *
 * With the new factory-only initialize() pattern, the initCode is just
 * the raw creation bytecode (no constructor args appended), so the
 * predicted address depends only on factory + salt + creationCode.
 *
 * The creationCode comes from the FalconDomain record.
 */
export function predictQuantumAccountAddress(params: {
  factory: Address;
  salt: Hex; // 32-byte hex
  creationCode: Hex; // contract creation bytecode from FalconDomain
}): Address {
  const { factory, salt, creationCode } = params;

  const initCodeHash = keccak256(creationCode);

  const salt32 = pad(salt, { size: 32 });

  const data = concatHex([
    "0xff",
    factory,
    salt32,
    initCodeHash,
  ]);

  const hash = keccak256(data);

  // Take the last 20 bytes → Ethereum address
  const address = ("0x" + hash.slice(26)) as Address;
  return address;
}
