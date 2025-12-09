import * as React from "react";
import { useContactsList } from "../hooks/useContactList";
import { Contact, Wallet } from "@/storage/contactStore";

export function Contacts() {
  const [query, setQuery] = React.useState("");
  const [sortMode, setSortMode] = React.useState<"nameAsc" | "createdDesc" | "nameDesc" | "surnameAsc" | "surnameDesc" | "createdAsc">(
    "nameAsc"
  );
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagMode, setTagSearchMode] = React.useState("any");
  const [tagSearch, setTagSearch] = React.useState<string>("");

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);

  // Form state for modal
  const [formName, setFormName] = React.useState("");
  const [formSurname, setFormSurname] = React.useState("");
  const [formTags, setFormTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [formWallets, setFormWallets] = React.useState<Wallet[]>([]);

  const {
    contacts,
    loading,
    error,
    addContact,
    deleteContact,
    updateContact,
  } = useContactsList({ query, sortMode, tags, tagMode });

  // --- Modal helpers ---------------------------------------------------------

  function resetForm() {
    setFormName("");
    setFormSurname("");
    setFormTags([]);
    setTagInput("");
    setFormWallets([]);
  }

  function openAddModal() {
    setEditingContact(null);
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(contact: Contact) {
    setEditingContact(contact);
    setFormName(contact.name ?? "");
    setFormSurname(contact.surname ?? "");
    setFormTags(contact.tags ?? []);
    setTagInput("");
    setFormWallets((contact as any).wallets ?? []); // adjust if your type differs
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingContact(null);
    resetForm();
  }

  function handleAddTagFromInput() {
    const raw = tagInput.trim();
    if (!raw) return;

    const newTags = raw
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    setFormTags(prev => {
      const lowerPrev = new Set(prev.map(t => t.toLowerCase()));
      const merged = [...prev];
      for (const t of newTags) {
        if (!lowerPrev.has(t.toLowerCase())) merged.push(t);
      }
      return merged;
    });

    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setFormTags(prev => prev.filter(t => t !== tag));
  }

  function handleWalletChange(index: number, field: keyof Wallet, value: string) {
    setFormWallets(prev => {
      const next = [...prev];
      const w = { ...next[index] };
      if (field === "chainId") {
        w.chainId = Number(value) || 0;
      } else {
        w.address = value;
      }
      next[index] = w;
      return next;
    });
  }

  function handleAddWalletRow() {
    setFormWallets(prev => [...prev, { chainId: 0, address: "" }]);
  }

  function handleRemoveWalletRow(index: number) {
    setFormWallets(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = formName.trim();
    if (!trimmedName) return; // you can show a validation message if you like

    const payload: any = {
      name: trimmedName,
      surname: formSurname.trim() || undefined,
      tags: formTags.length > 0 ? formTags : undefined,
      wallets: formWallets.filter(w => w.address.trim()), // only keep non-empty addresses
    };

    if (editingContact) {
      await updateContact(editingContact.id, payload);
    } else {
      await addContact(payload);
    }

    closeModal();
  }

  if (loading) return <div className="p-4">Loading contacts…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">Contacts</h1>

        <div className="flex flex-1 gap-2 sm:justify-end">
          <input
            className="w-full max-w-xs rounded-md border px-2 py-1 text-sm"
            placeholder="Search by name or address…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />

          <select
            className="rounded-md border px-2 py-1 text-sm"
            value={sortMode}
            onChange={e => setSortMode(e.target.value as any)}
          >
            <option value="nameAsc">Name (A → Z)</option>
            <option value="nameDesc">Name (Z → A)</option>
            <option value="surnameAsc">Surname (A → Z)</option>
            <option value="surnameDesc">Surname (Z → A)</option>
            <option value="createdDesc">Newest first</option>
            <option value="createdAsc">Oldest first</option>
          </select>
          <input
            className="..."
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
            className="rounded-md border px-2 py-1 text-xs"
            value={tagMode}
            onChange={e => setTagSearchMode(e.target.value as "any" | "all")}
          >
            <option value="any">Match any</option>
            <option value="all">Match all</option>
          </select>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No contacts yet. Add one from the transfer screen or here.
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map(c => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                </div>
                <div className="text-xs text-neutral-500">{c.surname}</div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  className="text-red-600 underline"
                  onClick={() => deleteContact(c.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
