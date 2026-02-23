// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
// Request email explicitly. For this to work your Meta app must:
//   1. Have "Facebook Login" product added
//   2. Include https://cointrol-wallet.firebaseapp.com/__/auth/handler in Valid OAuth Redirect URIs
//   3. Include cointrol-wallet.firebaseapp.com (and paulangusbark.github.io) in App Domains
//   4. Have a Privacy Policy URL set in Basic Settings
//facebookProvider.addScope('email');
export const twitterProvider = new TwitterAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Apple — uncomment to add Apple Sign-In (requires Apple Developer account configured in Firebase console)
// export const appleProvider = new OAuthProvider('apple.com');
// appleProvider.addScope('email');
// appleProvider.addScope('name');
