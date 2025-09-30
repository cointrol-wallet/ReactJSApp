// src/AuthButtons.tsx
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { useEffect, useState } from 'react';

const google = new GoogleAuthProvider();
const facebook = new FacebookAuthProvider();
const apple = new OAuthProvider('apple.com');
// (optional) Apple scopes
apple.addScope('email');
apple.addScope('name');

export default function AuthButtons() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // handle redirect results (useful for Safari / iOS)
    getRedirectResult(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  const popupOrRedirect = async (provider: any) => {
    try {
      // Popups are simpler; fall back to redirect if blocked
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      if (e?.code?.includes('popup-blocked')) {
        await signInWithRedirect(auth, provider);
      } else {
        console.error(e);
        alert(e.message ?? 'Sign-in failed');
      }
    }
  };

  if (user) {
    return (
      <div className="space-y-2">
        <div>Signed in as {user.displayName || user.email}</div>
        <button onClick={() => signOut(auth)}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={() => popupOrRedirect(google)}>Continue with Google</button>
      <button onClick={() => popupOrRedirect(apple)}>Continue with Apple</button>
      <button onClick={() => popupOrRedirect(facebook)}>Continue with Facebook</button>
    </div>
  );
}
