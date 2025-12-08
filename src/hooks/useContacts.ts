// src/hooks/useContacts.ts
import * as React from "react";
import {
  Contact,
  getAllContacts,
  addContact as storeAddContact,
  updateContact as storeUpdateContact,
  deleteContact as storeDeleteContact,
  clearContacts as storeClearContacts,
  subscribeToContacts,
} from "../lib/contactStore";

type UseContactsResult = {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  addContact: typeof storeAddContact;
  updateContact: typeof storeUpdateContact;
  deleteContact: typeof storeDeleteContact;
  clearContacts: typeof storeClearContacts;
};

export function useContacts(): UseContactsResult {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initial = await getAllContacts();
        if (!cancelled) {
          setContacts(initial);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[Contacts] Failed to load:", e);
        if (!cancelled) {
          setError(e?.message ?? "Failed to load contacts");
          setLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToContacts(next => {
      if (!cancelled) {
        setContacts(next);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    contacts,
    loading,
    error,
    addContact: storeAddContact,
    updateContact: storeUpdateContact,
    deleteContact: storeDeleteContact,
    clearContacts: storeClearContacts,
  };
}
