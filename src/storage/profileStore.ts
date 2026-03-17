import { get, set } from "idb-keyval";
import { getCurrentUser } from "./currentUser";

function displayNameKey() { return `cointrol:profile:displayName:v1:${getCurrentUser()}`; }

type DisplayNameListener = (name: string) => void;
const listeners = new Set<DisplayNameListener>();

function notify(name: string) {
  for (const l of listeners) l(name);
}

export function subscribeToDisplayName(listener: DisplayNameListener): () => void {
  listeners.add(listener);
  // fire immediately with current value
  void getDisplayName().then(n => listener(n));
  return () => listeners.delete(listener);
}

export async function getDisplayName(): Promise<string> {
  const v = await get<string | undefined>(displayNameKey());
  return (v ?? "").trim();
}

export async function setDisplayName(name: string): Promise<void> {
  const trimmed = name.trim();
  await set(displayNameKey(), trimmed);
  notify(trimmed);
}
