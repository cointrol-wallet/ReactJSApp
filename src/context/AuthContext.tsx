import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type User, onAuthStateChanged,
  browserSessionPersistence,
  setPersistence, signOut as firebaseSignOut
} from "firebase/auth";
import { auth } from "../firebase";
import {
  isRegistered,
  getRegisteredUser,
  migrateIfNeeded,
} from "../storage/authStore";
import { initKeyStore, clearKeyStore } from "../storage/keyStore";
import { setCurrentUser } from "../storage/currentUser";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

type AuthContextValue = {
  firebaseUser: User | null;
  uuid: string | null;
  loading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  completeRegistration: (user: User, uuid: string) => void;
  clearAuthError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [uuid, setUuidState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPersistence(auth, browserSessionPersistence).catch(console.error);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      console.log("[Auth] state changed:", user?.uid ?? null);

      if (user) {
        // Run one-time migration for existing single-user installs
        await migrateIfNeeded(user.uid);

        const registered = await isRegistered(user.uid);

        if (!registered) {
          // Check whether RegisterPage is currently handling a new registration.
          // If so, skip the sign-out — RegisterPage will call completeRegistration().
          const registering = sessionStorage.getItem("cointrol:registering") === "1";
          if (registering) {
            // Registration in progress — do nothing here; RegisterPage drives this.
            setLoading(false);
            return;
          }
          // Unregistered user tried to sign in via LoginPage — reject.
          setCurrentUser(null);
          setAuthError("unregistered");
          await firebaseSignOut(auth);
          setLoading(false);
          return;
        }

        // Registered user — set up everything
        setCurrentUser(user.uid);
        await initKeyStore(user.uid);
        const registeredUser = await getRegisteredUser(user.uid);
        setUuidState(registeredUser!.uuid);
        setFirebaseUser(user);
        setAuthError(null);
      } else {
        // Signed out
        setCurrentUser(null);
        clearKeyStore();
        setUuidState(null);
        setFirebaseUser(null);
        // Do NOT clear authError here — if the rejection path above set it to
        // "unregistered", the subsequent firebaseSignOut triggers this else branch
        // and would erase the error before the user can see it.
        // Intentional sign-out via signOut() clears authError explicitly.
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
      setCurrentUser(null);
      try { localStorage.removeItem(LAST_ACTIVE_KEY); } catch { }
      await firebaseSignOut(auth);
    };

    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;
    const onActivity = () => touch();
    const onFocus = () => touch();
    const onVis = () => {
      if (document.visibilityState === "visible") touch();
    };

    touch();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    const interval = window.setInterval(() => {
      if (shouldSignOut()) {
        void signOutNow();
      }
    }, 60_000);

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
    setCurrentUser(null);
    clearKeyStore();
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUuidState(null);
    setAuthError(null);
  };

  // Called by RegisterPage after it completes the full registration flow.
  const completeRegistration = (user: User, newUuid: string) => {
    setCurrentUser(user.uid);
    setFirebaseUser(user);
    setUuidState(newUuid);
    setAuthError(null);
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{
      firebaseUser, uuid, loading, authError,
      signOut, completeRegistration, clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
