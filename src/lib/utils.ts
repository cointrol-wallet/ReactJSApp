import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns true when two folio names are similar but not identical.
 * Covers case variants ("Main" / "main") and simple singular/plural pairs
 * ("wallet" / "wallets"), including combinations ("wallet" / "Wallets").
 * Returns false for exact matches (those are handled by the per-chain duplicate check).
 */
export function isSimilarFolioName(a: string, b: string): boolean {
  const na = a.trim();
  const nb = b.trim();
  if (na === nb) return false;           // exact match — not "similar", handled elsewhere
  const la = na.toLowerCase();
  const lb = nb.toLowerCase();
  if (la === lb) return true;            // case variant
  if (la === lb + "s" || lb === la + "s") return true;  // singular / plural
  return false;
}
