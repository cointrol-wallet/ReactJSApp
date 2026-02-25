import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User, onAuthStateChanged,
  browserSessionPersistence,
  setPersistence, signOut as firebaseSignOut
} from "firebase/auth";
import { auth } from "../firebase";
import { getUUID, setUUID, setTermsAccepted } from "../storage/authStore";
import { initKeyStore, clearKeyStore } from "../storage/keyStore";
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


const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
    setPersistence(auth, browserSessionPersistence).catch(console.error);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      console.log("[Auth] state changed:", user?.uid ?? null);
      setFirebaseUser(user);
      if (user) {
        await initKeyStore(user.uid);
        const id = await ensureDeviceUuid();
        setUuidState(id);
      } else {
        clearKeyStore();
        setUuidState(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const LAST_ACTIVE_KEY = "lastActiveAt";

  useEffect(() => {
    if (!firebaseUser) return;

    let stopped = false;

    const touch = () => {
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      } catch { }
    };

    const shouldSignOut = () => {
      const raw = localStorage.getItem(LAST_ACTIVE_KEY);
      const last = raw ? Number(raw) : Date.now();
      return Date.now() - last >= IDLE_TIMEOUT_MS;
    };

    const signOutNow = async () => {
      if (stopped) return;
      stopped = true;
      console.log("[Auth] idle timeout — signing out");
      clearKeyStore();
      try { localStorage.removeItem(LAST_ACTIVE_KEY); } catch { }
      await firebaseSignOut(auth);
    };

    // Events that count as activity
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    const onActivity = () => touch();

    // Also update on focus/visibility changes (common “I came back” signal)
    const onFocus = () => touch();
    const onVis = () => {
      if (document.visibilityState === "visible") touch();
    };

    // Start
    touch();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    // Periodic check (don’t rely on one giant timeout)
    const interval = window.setInterval(() => {
      if (shouldSignOut()) {
        void signOutNow();
      }
    }, 60_000); // check every 60s

    // If we *already* exceeded idle (e.g., reload), sign out immediately
    if (shouldSignOut()) {
      void signOutNow();
    }

    return () => {
      stopped = true;
      window.clearInterval(interval);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [firebaseUser]);

  const signOut = async () => {
    clearKeyStore();
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
