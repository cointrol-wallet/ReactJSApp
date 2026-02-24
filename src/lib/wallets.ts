import { PaymasterAPI, GenericResponse } from "./submitTransaction";
import { getAddress, getFalconPublicKey, getSecretKey } from "../storage/keyStore";
import { createFalconWorkerClient } from "@/crypto/falconInterface";
import { createAccountToBytes } from "./bytesEncoder";
import { stringToHex, bytesToHex, Address } from "viem";
import { FalconLevel, ensureFalconKeypair } from "../storage/keyStore";

export async function initWallet(): Promise<string> {

  const falconLevel: FalconLevel = 512; // example for now, will replace with user choice later

  try {
    const ok = await ensureFalconKeypair(falconLevel);
    if (!ok) {
      throw new Error("Failed to ensure Falcon keypair");
    }
  } catch (e: any) {
    console.error("[Wallet] ensureFalconKeypair failed", e?.name, e?.message, e);
    throw e;
  }
  const addr = await getAddress(`default`, falconLevel); 

  if (!addr) {
    throw new Error("Public key not available after ensureFalconKeypair");
  }

  return addr;
}

type WalletsProps = {
  sender: Address;      // your EOA that pays for / owns the QA
  domain: string;       // whatever you’re using on the backend ("cointrol.app" etc.)
  salt: string;         // random salt for QA creation
};

export async function createQuantumAccount({
  sender,
  domain,
  salt,
}: WalletsProps): Promise<boolean> {
  const falconLevel: FalconLevel = 512; // example for now, will replace with user choice later
  const publicKey = await getFalconPublicKey(falconLevel); // example for now, will replace with user choice later
  if (!publicKey) throw new Error("No Falcon public key available");

  const rawMessage = createAccountToBytes({
    sender,
    domain,
    publicKey: bytesToHex(publicKey),
    salt: stringToHex(salt),
  });

  const falcon = createFalconWorkerClient();
  const sk = await getSecretKey(falconLevel);
  const signature = await falcon.sign(falconLevel, rawMessage, sk); // example for now, will replace with user choice later
  sk.fill(0); // zero out secret key from memory as soon as possible
  falcon.terminate(); // terminate worker to clear its copy of the SK
  // console.log("[createQuantumAccount] rawMessage length:", rawMessage.length);
  // console.log("[createQuantumAccount] signature length (bytes):", signature.length);
  // console.log("[createQuantumAccount] publicKey length (bytes):", publicKey.length);

  const res = await PaymasterAPI.createNewAccount(
    sender,
    domain,
    bytesToHex(publicKey),
    stringToHex(salt),
    bytesToHex(signature),
  );

  return !!res.success;
}
