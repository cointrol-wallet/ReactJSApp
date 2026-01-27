import * as React from "react";
import { useAddressList } from "../hooks/useAddressList";
import { AddressSortableList } from "../components/ui/addressSortableList"
import { Address } from "@/storage/addressStore";

export function AddressBook() {
  const [query, setQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<"nameAsc" | "createdDesc" | "nameDesc" | "createdAsc" | "custom">(
    "custom"
  );
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagMode, setTagSearchMode] = React.useState("any");
  const [tagSearch, setTagSearch] = React.useState<string>("");

  const {
    address,
    loading,
    error,
    addAddress,
    deleteAddress,
    updateAddress,
  } = useAddressList({ query, sortMode, tags, tagMode });

  // Only display visible addresses
  const visibleAddresses = React.useMemo(
    () => address.filter((a) => a.isVisible !== false),
    [address]
  );

  async function handleReorder(updated: Address[]) {
    // updated is the *visible* list in the new order
    // assign indexOrder based on new position
    await Promise.all(
      updated.map((addr, idx) =>
        updateAddress(addr.id, { indexOrder: idx })
      )
    );
    // useAddressList should re-emit state after updates
  }

  async function handleHide(id: string) {
    await updateAddress(id, { isVisible: false });
    // On next render, visibleAddresses will filter it out
  }

  if (loading) return <div className="p-4">Loading Address…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-4 p-4">
      <h1 className="shrink-0 text-2xl leading-tight font-semibold text-foreground">
        Address Book
      </h1>

      <div className="flex flex-1 min-w-0 flex-nowrap items-center gap-2 sm:justify-end sm:mt-1">
        <input
          className="h-9 min-w-[160px] max-w-[260px] flex-[1_1_220px] rounded-md border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted"
          placeholder="Search by name or address…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <select
          className="h-9 w-[140px] rounded-md border border-border bg-card px-2 text-sm text-foreground"
          value={sortMode}
          onChange={e => setSortMode(e.target.value as any)}
        >
          <option value="custom">Template</option>
          <option value="nameAsc">Name (A → Z)</option>
          <option value="nameDesc">Name (Z → A)</option>
          <option value="createdDesc">Newest first</option>
          <option value="createdAsc">Oldest first</option>
        </select>
        <input
          className="h-9 min-w-[180px] max-w-[300px] flex-[1_1_240px] rounded-md border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted"
          placeholder="Filter by tags (comma-separated)…"
          value={tagSearch}
          onChange={e => {
            const raw = e.target.value;
            setTagSearch(raw);

            const tokens = raw
              .split(",")
              .map(t => t.trim())
              .filter(Boolean);

            setTags(tokens);
          }}
        />
        <select
          className="h-9 w-[110px] rounded-md border border-border bg-card px-2 text-sm text-foreground"
          value={tagMode}
          onChange={e => setTagSearchMode(e.target.value as "any" | "all")}
        >
          <option value="any">Match any</option>
          <option value="all">Match all</option>
        </select>
      </div>

      {sortMode !== "custom" && (
        <p className="text-xs text-muted">
          Switch to <span className="font-semibold">Custom</span> to drag and
          reorder addresses manually.
        </p>
      )}

      <AddressSortableList
        items={visibleAddresses}
        sortMode={sortMode}
        onReorder={handleReorder}
        onHide={handleHide}
      />


    </div>
  );
}
