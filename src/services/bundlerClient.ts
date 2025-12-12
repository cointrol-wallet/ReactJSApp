
import {
  concat,
  Address,
  numberToHex,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
} from "viem";

export interface UserOperation {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  accountGasLimits: Hex;
  preVerificationGas: bigint;
  gasFees: Hex
  paymasterAndData: Hex;
  signature: Hex;
}

export interface PackedUserOperation extends UserOperation{
  domain: string;
  simulateOnly: boolean;
}

export type BytesLike = Uint8Array | string;
export type Hex = `0x${string}`;

export interface CreateNewAccountUnsigned {
  sender: string;           // address
  domain: string;           // human-readable name
  publicKey: Hex;           // 0x-prefixed hex bytes
  salt: Hex;                // nonce used to deterministically derive an address
}

export interface CreateNewAccount extends CreateNewAccountUnsigned {
  signature: Hex;           // 0x-prefixed hex bytes
}

// --- helpers ---

/* function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${hex}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
} */

// --- encoders ---


export function createAccountToBytes(
  newAccount: CreateNewAccountUnsigned
): Uint8Array {
  const encoder = new TextEncoder();
  
    const senderBytes = encoder.encode(newAccount.sender); 
    const domainBytes = encoder.encode(newAccount.domain);
    const saltBytes = encoder.encode(newAccount.salt);
    const pubKeyBytes = encoder.encode(newAccount.publicKey);
  
    const packed = concat([
      senderBytes,
      domainBytes,
      pubKeyBytes,
      saltBytes
    ]);

  return packed;
}

export const calculateUserOpHash = (
  userop: UserOperation,
  entryPoint: Address,
  chainId: number,
) => {
  const packed = encodeAbiParameters(
    parseAbiParameters(
      "address, uint256, bytes32, bytes32, bytes32, uint256, bytes32, bytes32",
    ),
    [
      userop.sender,
      userop.nonce,
      keccak256(userop.initCode),
      keccak256(userop.callData),
      userop.accountGasLimits,
      userop.preVerificationGas,
      userop.gasFees,
      keccak256(userop.paymasterAndData),
    ],
  );

  const enc = encodeAbiParameters(
    parseAbiParameters("bytes32, address, uint256"),
    [keccak256(packed), entryPoint, BigInt(chainId)],
  );

  return keccak256(enc);
};

// --- Interactions with bundler and paymaster ---

// TODO - function to update public keys

export async function sendCreateAccountToPaymaster(
  account: CreateNewAccount
) {
  const res = await fetch(`http://localhost:8081/createfree`, { 
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(account),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paymaster /create error: ${res.status} ${text}`);
  }

  return res.json(); 
}

export async function sendUserOpToBundler(
  userOp: PackedUserOperation
) {
  const res = await fetch(`http://localhost:8080/submit`, { 
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userOp),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bundler /submit error: ${res.status} ${text}`);
  }

  return res.json(); 
}

export async function getDomainList(){
  const res = await fetch(`http://localhost:8080/domain`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
    if (!res.ok) {
    const text = await res.text();
    throw new Error(`Domain error: ${res.status} ${text}`);
  }

  return res.json(); 
}

export async function getDomainDetails(
  id: number
){
  const res = await fetch(`http://localhost:8080/domain/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
    if (!res.ok) {
    const text = await res.text();
    throw new Error(`Domain error: ${res.status} ${text}`);
  }

  return res.json(); 
}

