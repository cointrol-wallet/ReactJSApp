import { get, set } from "idb-keyval";

const UUID_KEY = "cointrol:auth:uuid:v1";
const TERMS_KEY = "cointrol:auth:termsAccepted:v1";

export async function getUUID(): Promise<string | null> {
  return (await get<string | undefined>(UUID_KEY)) ?? null;
}

export async function setUUID(uuid: string): Promise<void> {
  await set(UUID_KEY, uuid);
}

export async function hasAcceptedTerms(): Promise<boolean> {
  return (await get<boolean | undefined>(TERMS_KEY)) === true;
}

export async function setTermsAccepted(): Promise<void> {
  await set(TERMS_KEY, true);
}

export async function isFirstTimeUser(): Promise<boolean> {
  const [uuid, terms] = await Promise.all([getUUID(), hasAcceptedTerms()]);
  return !uuid && !terms;
}
