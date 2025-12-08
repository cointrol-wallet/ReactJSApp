import { Contact } from "../storage/contactStore";

export type ContactSortMode = "nameAsc" | "createdDesc" | "nameDesc" | "surnameAsc" | "surnameDesc" | "createdAsc";

export function sortContacts(
  contacts: Contact[],
  mode: ContactSortMode = "createdAsc"
): Contact[] {
  const copy = [...contacts];

  if (mode === "nameAsc") {
    copy.sort((a, b) =>
      a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase())
    );
  } else if (mode === "createdDesc") {
    copy.sort((a, b) => b.createdAt - a.createdAt);
  } else if (mode === "nameDesc") {
    copy.sort((a, b) =>
      b.name.toLocaleLowerCase().localeCompare(a.name.toLocaleLowerCase())
    );
  } else if (mode === "surnameDesc") {
    copy.sort((a, b) => {
      const aS = a.surname?.toLowerCase() ?? "";
      const bS = b.surname?.toLowerCase() ?? "";
      return bS.localeCompare(aS);
    });
  } else if (mode === "surnameAsc") {
    copy.sort((a, b) => {
      const aS = a.surname?.toLowerCase() ?? "";
      const bS = b.surname?.toLowerCase() ?? "";
      return aS.localeCompare(bS);
    });
  } else if (mode === "createdAsc") {
    copy.sort((a, b) => a.createdAt - b.createdAt);
  }


  return copy;
}
