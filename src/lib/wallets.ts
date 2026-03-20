import { PaymasterAPI, BundlerAPI, GenericResponse, PackedUserOperation, calculateUserOpHash, defaultAccountGasLimits } from "./submitTransaction";
import { getGasProfile } from "./gasConfig";
import { isKeyStoreInitialised, getPublicKey, getSecretKey, listKeypairs } from "../storage/keyStore";
import { createFalconWorkerClient } from "@/crypto/falconInterface";
import { createAccountToBytes } from "./bytesEncoder";
import {
  bytesToHex,
  hexToBytes,
  Address,
  Hex,
  encodeAbiParameters,
  encodeFunctionData,
  toHex,
  concatHex,
  padHex,
  createPublicClient,
  http,
} from "viem";
import { Domain } from "../storage/domainStore";
import { Folio } from "../storage/folioStore";
import { entryPointAbi } from "./abiTypes";

// ADMIN_KEY from QuantumAccount.sol: used in nonce top-192-bits for admin ops
const ADMIN_KEY = 0x0ad9140ad914n;

export async function initWallet(): Promise<void> {
  if (!isKeyStoreInitialised()) throw new Error("keyStore not initialised — call initKeyStore(uid) first");
}

export async function createQuantumAccount({
  sender,
  domain,
  salt,
  keypairId,
}: {
  sender: Address;
  domain: Domain;
  salt: Hex;
  keypairId: string;
}): Promise<boolean> {
  const keypairs = await listKeypairs();
  const meta = keypairs.find(k => k.id === keypairId);
  if (!meta) throw new Error(`Keypair ${keypairId} not found`);
  if (meta.level === "ECC") throw new Error("ECC keys not yet implemented");

  const publicKey = await getPublicKey(keypairId);
  if (!publicKey) throw new Error("No public key available");

  const rawMessage = createAccountToBytes({
    sender,
    domain: domain.name,
    publicKey: bytesToHex(publicKey),
    salt,
  });

  const falcon = createFalconWorkerClient();
  const sk = await getSecretKey(keypairId);
  if (!sk) throw new Error("No secret key available");
  const signature = await falcon.sign(meta.level, rawMessage, sk);
  sk.fill(0);
  falcon.terminate();

  const res = await PaymasterAPI.createNewAccount(
    sender,
    domain.name,
    bytesToHex(publicKey),
    salt,
    bytesToHex(signature),
  );

  return !!res.success;
}

export async function updatePublicKeyOnChain({
  folio,
  domain,
  newKeypairId,
}: {
  folio: Folio;
  domain: Domain;
  newKeypairId: string;
}): Promise<{ txHash: `0x${string}`; userOpHash: `0x${string}` }> {
  const newPK = await getPublicKey(newKeypairId);
  if (!newPK) throw new Error(`New keypair ${newKeypairId} not found`);

  // Get old keypair info for signing
  const keypairs = await listKeypairs();
  const oldMeta = keypairs.find(k => k.id === folio.keypairId);
  if (!oldMeta) throw new Error(`Current keypair ${folio.keypairId} not found`);
  if (oldMeta.level === "ECC") throw new Error("ECC keys not yet implemented");
  const gasProfile = getGasProfile(oldMeta.level);

  const oldSK = await getSecretKey(folio.keypairId);
  if (!oldSK) throw new Error("Old secret key not available");

  // Build callData for updatePublicKey(bytes)
  const callData = encodeFunctionData({
    abi: [{
      name: "updatePublicKey",
      type: "function",
      inputs: [{ name: "_publicKeyBytes", type: "bytes" }],
      outputs: [],
      stateMutability: "nonpayable",
    }],
    functionName: "updatePublicKey",
    args: [bytesToHex(newPK)],
  });

  // Fetch admin nonce: key = ADMIN_KEY in the top 192 bits
  const publicClient = createPublicClient({ transport: http(domain.rpcUrl) });
  const adminNonce = await publicClient.readContract({
    address: domain.entryPoint as `0x${string}`,
    abi: entryPointAbi,
    functionName: "getNonce",
    args: [folio.address as `0x${string}`, ADMIN_KEY],
  }) as bigint;

  const feeData = await publicClient.estimateFeesPerGas().catch(() => null);
  const maxFeePerGas = (feeData?.maxFeePerGas ?? 4_000_000_000n) * 12n / 10n;
  const maxPriorityFeePerGas = (feeData?.maxPriorityFeePerGas ?? 2_000_000n) * 12n / 10n;

  const accountGasLimits = defaultAccountGasLimits(
    gasProfile.verificationGasLimit,
    gasProfile.keyRotationCallGasLimit,
  );
  const gasFees = (() => {
    const packed = (maxPriorityFeePerGas << 128n) | maxFeePerGas;
    return `0x${packed.toString(16).padStart(64, "0")}` as `0x${string}`;
  })();

  const userOpBase: Omit<PackedUserOperation, "signature"> = {
    sender: folio.address as Address,
    nonce: toHex(adminNonce),
    initCode: "0x",
    callData,
    accountGasLimits,
    preVerificationGas: toHex(200_000),
    gasFees,
    paymasterAndData: "0x",
  };

  const userOpHash = calculateUserOpHash(userOpBase, domain.entryPoint as `0x${string}`, folio.chainId);

  const falcon = createFalconWorkerClient();
  const signature = await falcon.sign(oldMeta.level, hexToBytes(userOpHash), oldSK);
  oldSK.fill(0);
  falcon.terminate();

  const userOp: PackedUserOperation = { ...userOpBase, signature: bytesToHex(signature) };

  const res = await BundlerAPI.submit(userOp, domain.name) as any;
  if (!res.success) throw new Error(res.result ?? "Bundler rejected the key rotation");

  const txRes = await BundlerAPI.getTxReceipt(folio.address as `0x${string}`, res.userOpHash ?? userOpHash);

  return { txHash: txRes.txHash, userOpHash: userOpHash as `0x${string}` };
}

export async function notifyBundlerPublicKeyUpdate({
  folio,
  domain,
  newKeypairId,
}: {
  folio: Folio;
  domain: Domain;
  newKeypairId: string;
}): Promise<GenericResponse> {
  const newPK = await getPublicKey(newKeypairId);
  if (!newPK) throw new Error(`New keypair ${newKeypairId} not found`);

  const oldPK = await getPublicKey(folio.keypairId);
  if (!oldPK) throw new Error(`Old keypair ${folio.keypairId} not found`);

  // Sign the new key bytes with the old secret key so bundler can verify authority
  const keypairs = await listKeypairs();
  const oldMeta = keypairs.find(k => k.id === folio.keypairId);
  if (!oldMeta || oldMeta.level === "ECC") throw new Error("Old keypair not found or ECC");

  const oldSK = await getSecretKey(folio.keypairId);
  if (!oldSK) throw new Error("Old secret key not available");

  // Build the same canonical message the bundler will verify against:
  // concat(senderBytes, domainBytes, oldKeyBytes, newKeyBytes)
  const encoder = new TextEncoder();
  const verifyMsg = new Uint8Array([
    ...hexToBytes(folio.address as `0x${string}`),
    ...encoder.encode(domain.name),
    ...oldPK,
    ...newPK,
  ]);

  const falcon = createFalconWorkerClient();
  const signature = await falcon.sign(oldMeta.level, verifyMsg, oldSK);
  oldSK.fill(0);
  falcon.terminate();

  return BundlerAPI.updatePublicKey(
    folio.address as Address,
    domain.name,
    bytesToHex(oldPK),
    bytesToHex(newPK),
    bytesToHex(signature),
  );
}
