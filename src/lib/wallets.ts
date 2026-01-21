import { useState } from "react";
import { PaymasterAPI, GenericResponse } from "./submitTransaction";
import { getAddress, getFalconPublicKey } from "../storage/keyStore";
import { sign } from "../crypto/falcon";
import { createAccountToBytes } from "./bytesEncoder";
import { stringToHex, bytesToHex, Address } from "viem";
import { ensureFalconPrivateKey } from "../storage/keyStore";

export async function initWallet(): Promise<string> {

  await ensureFalconPrivateKey();
  const addr = await getAddress(`default`); // example for now, will replace with uuid from auth

  if (!addr) {
    throw new Error("Public key not available after ensureFalconPrivateKey");
  }

  return addr;
}

type WalletsProps = {
  sender: Address;      // your EOA that pays for / owns the QA
  domain: string;       // whatever you’re using on the backend ("cointrol.app" etc.)
  salt: string;         // random salt for QA creation
};

export function Wallets({
  sender,
  domain,
  salt,
}: WalletsProps): boolean{

  var success = false;

  const handleCreateQuantumAccount = async () => {
    try {
      const publicKey = await getFalconPublicKey();
      if (!publicKey) throw new Error("No Falcon public key available");
      const rawMessage = createAccountToBytes({
        sender: sender, 
        domain: domain, 
        publicKey: bytesToHex(publicKey), 
        salt: stringToHex(salt),
      });
      const signature = await sign(rawMessage, domain);
      const res = await PaymasterAPI.createNewAccount(
        sender,
        domain,
        bytesToHex(publicKey),
        stringToHex(salt),
        signature
      );

      /* if (!res.success) {
        throw new Error(String(res.result ?? "Paymaster returned success=false"));
      } */

      success = res.success
      // TODO: if res.result contains the new QA address, stash it in global state / context
    } catch (e: any) {
      return Promise.reject(e?.message ?? "Unknown error during QuantumAccount creation");
    }
  }
  return success;
}