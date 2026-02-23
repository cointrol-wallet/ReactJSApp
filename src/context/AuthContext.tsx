import React, { createContext, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged,
  browserLocalPersistence,
  setPersistence, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../firebase";
import { getUUID, setUUID, setTermsAccepted } from "../storage/authStore";
import { bytesToHex } from "viem";

async function ensureDeviceUuid(): Promise<string> {
  const existing = await getUUID();
  if (existing) return existing;
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }
  const salt = await deriveUserSalt(auth.currentUser!.uid);

  const newUuid = bytesToHex(salt);

  await setUUID(newUuid);
  return newUuid;
}

async function deriveUserSalt(uid: string): Promise<Uint8Array> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(uid),
    "HKDF",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("Cointrol QuantumAccount v1"),
      info: enc.encode("Account Generation Salt"),
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}


type AuthContextValue = {
  firebaseUser: User | null;
  uuid: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  completeFirstLogin: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [uuid, setUuidState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      console.log("[Auth] state changed:", user?.uid ?? null);
      setFirebaseUser(user);
      if (user) {
        const id = await ensureDeviceUuid();
        setUuidState(id);
      } else {
        setUuidState(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUuidState(null);
  };

  const completeFirstLogin = async (): Promise<string> => {
    const id = await ensureDeviceUuid();
    // mark terms accepted (safe to call repeatedly)
    await setTermsAccepted();
    setUuidState(id);
    return id;
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, uuid, loading, signOut, completeFirstLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
