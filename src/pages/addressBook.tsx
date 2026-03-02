import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAddressList } from "../hooks/useAddressList";
import { AddressSortableList } from "../components/ui/addressSortableList"
import { Address } from "@/storage/addressStore";
import { FiltersDropdown } from "@/components/ui/FiltersDropdown";
import { useCoinList } from "@/hooks/useCoinList";
import { useContacts } from "@/hooks/useContacts";
import { useContracts } from "@/hooks/useContracts";

export function AddressBook() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<"nameAsc" | "createdDesc" | "nameDesc" | "createdAsc" | "custom">(
    "nameAsc"
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

  const { coins } = useCoinList({ query: "", sortMode: "nameAsc", standard: "", chainId: 0 });
  const { contacts } = useContacts();
  const { contracts } = useContracts();

  function handleSendCoins(item: Address, coinId: string) {
    navigate('/transactions', { state: { prefill: { mode: 'transfer', addressId: item.id, coinId } } });
  }

  function handleApproveCoins(item: Address, coinId: string) {
    navigate('/transactions', { state: { prefill: { mode: 'transfer', addressId: item.id, coinId, functionName: 'approve' } } });
  }

  function handleUseContract(item: Address, functionName: string) {
    navigate('/transactions', { state: { prefill: { mode: 'contract', addressId: item.id, functionName } } });
  }

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

      <div className="flex flex-col gap-2">
        <input
          className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted sm:max-w-md"
          placeholder="Search by name or address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <FiltersDropdown
            sortOptions={[
              { value: "nameAsc", label: "Name (A \u2192 Z)" },
              { value: "nameDesc", label: "Name (Z \u2192 A)" },
              { value: "createdDesc", label: "Newest first" },
              { value: "createdAsc", label: "Oldest first" },
            ]}
            sortMode={sortMode}
            setSortMode={setSortMode}
            tagSearch={tagSearch}
            setTagSearch={setTagSearch}
            setTags={setTags}
            tagMode={tagMode as "any" | "all"}
            setTagSearchMode={setTagSearchMode}
          />
        </div>
      </div>

      {/*sortMode !== "custom" && (
        <p className="text-xs text-muted">
          Switch to <span className="font-semibold">Custom</span> to drag and
          reorder addresses manually.
        </p>
      )*/}

      <AddressSortableList
        items={visibleAddresses}
        sortMode={sortMode}
        onReorder={handleReorder}
        onHide={handleHide}
        coins={coins}
        contacts={contacts}
        contracts={contracts}
        onSendCoins={handleSendCoins}
        onApproveCoins={handleApproveCoins}
        onUseContract={handleUseContract}
      />


    </div>
  );
}
