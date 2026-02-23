import React, { createContext, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged,
  getRedirectResult,
  fetchSignInMethodsForEmail,
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

const PROVIDER_LABELS: Record<string, string> = {
  "google.com": "Google",
  "facebook.com": "Facebook",
  "twitter.com": "X (Twitter)",
  "github.com": "GitHub",
  "apple.com": "Apple",
  "password": "email/password",
};

async function buildConflictMessage(e: any): Promise<string> {
  const email: string | undefined = e?.customData?.email ?? e?.email;
  if (email) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        const labels = methods.map((m) => PROVIDER_LABELS[m] ?? m).join(" or ");
        return `An account with this email already exists. Please sign in with ${labels} instead.`;
      }
    } catch {
      // fall through to generic message
    }
  }
  return "An account with this email already exists using a different sign-in method. Please try another provider.";
}

type AuthContextValue = {
  firebaseUser: User | null;
  uuid: string | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
  completeFirstLogin: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [uuid, setUuidState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Make sure auth can persist the session across the redirect
        await setPersistence(auth, browserLocalPersistence);

        // This "finalizes" a redirect sign-in and surfaces any errors
        const res = await getRedirectResult(auth);
        console.log("[Auth] redirect result:", res?.user?.uid ?? null);
        // If a redirect sign-in just completed, persist terms acceptance.
        // The sign-in button is disabled until the T&C box is checked, so
        // any successful redirect result implies the user accepted.
        if (res?.user) {
          await setTermsAccepted();
        }
      } catch (e: any) {
        console.error("[Auth] redirect error:", e?.code ?? e, e);
        if (e?.code === "auth/account-exists-with-different-credential") {
          const msg = await buildConflictMessage(e);
          if (!cancelled) setAuthError(msg);
        }
      }
    })();
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
    <AuthContext.Provider value={{ firebaseUser, uuid, loading, authError, clearAuthError: () => setAuthError(null), signOut, completeFirstLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
