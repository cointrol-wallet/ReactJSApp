import type { Address } from "@/storage/addressStore";

/**
 * Returns {id, indexOrder} patches for all remaining visible items after one is hidden.
 * Items are sorted by their current indexOrder and re-assigned 0, 1, 2... closing any gap.
 */
export function computeNormalizedOrderAfterHide(
  visibleItems: Address[],
  hiddenId: string
): Array<{ id: string; indexOrder: number }> {
  const remaining = visibleItems
    .filter((a) => a.id !== hiddenId)
    .sort((a, b) => a.indexOrder - b.indexOrder);
  return remaining.map((a, idx) => ({ id: a.id, indexOrder: idx }));
}

/**
 * Returns the indexOrder a new or re-added item should receive to appear last in custom order.
 */
export function computeIndexOrderForAppend(visibleItems: Address[]): number {
  if (visibleItems.length === 0) return 0;
  return Math.max(...visibleItems.map((a) => a.indexOrder)) + 1;
}
