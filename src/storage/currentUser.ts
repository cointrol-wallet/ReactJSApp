let _uid: string | null = null;

export function setCurrentUser(uid: string | null): void {
  _uid = uid;
}

export function getCurrentUser(): string {
  if (_uid === null) throw new Error("No authenticated user — stores must only be accessed after login");
  return _uid;
}
