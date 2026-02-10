import { get, set } from "idb-keyval";

const DISPLAY_NAME_KEY = "cointrol:profile:displayName:v1";

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
  const v = await get<string | undefined>(DISPLAY_NAME_KEY);
  return (v ?? "").trim();
}

export async function setDisplayName(name: string): Promise<void> {
  const trimmed = name.trim();
  await set(DISPLAY_NAME_KEY, trimmed);
  notify(trimmed);
}
