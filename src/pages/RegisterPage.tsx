import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  signInWithPopup,
  type AuthProvider,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  facebookProvider,
  twitterProvider,
  githubProvider,
  appleProvider,
  microsoftProvider,
} from "../firebase";
import { useAuth } from "../context/AuthContext";
import { isRegistered, registerUser, deriveUserSalt } from "../storage/authStore";
import { initKeyStore } from "../storage/keyStore";
import { setCurrentUser } from "../storage/currentUser";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import logo from "../assets/logo.png";
import { SocialButtons } from "@/components/ui/SocialButtons";
import { bytesToHex } from "viem";

export function RegisterPage() {
  const { firebaseUser, completeRegistration } = useAuth();
  const navigate = useNavigate();

  const [termsChecked, setTermsChecked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const inAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|MicroMessenger|Snapchat|WhatsApp|TikTok|WebView|wv\b/i
    .test(navigator.userAgent);

  // Already signed in — go straight to dashboard
  useEffect(() => {
    if (firebaseUser) navigate("/dashboard", { replace: true });
  }, [firebaseUser, navigate]);

  const providerMap = {
    google: googleProvider,
    apple: appleProvider,
    microsoft: microsoftProvider,
    github: githubProvider,
    x: twitterProvider,
    facebook: facebookProvider,
  } as const;

  const signIn = async (provider: AuthProvider) => {
    if (signingIn) return;
    setSigningIn(true);

    // Signal to AuthContext.onAuthStateChanged that registration is in progress,
    // so it does not reject the (momentarily unregistered) Firebase user.
    sessionStorage.setItem("cointrol:registering", "1");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // If already registered on this device, just navigate to dashboard
      if (await isRegistered(user.uid)) {
        toast.success("Account already exists. Signing you in.");
        sessionStorage.removeItem("cointrol:registering");
        // onAuthStateChanged will complete the login flow via the normal path
        // (it will re-fire now that the user is registered)
        return;
      }

      // New registration
      const salt = await deriveUserSalt(user.uid);
      const uuid = bytesToHex(salt);

      await registerUser(user.uid, uuid);
      setCurrentUser(user.uid);
      await initKeyStore(user.uid);

      sessionStorage.removeItem("cointrol:registering");
      completeRegistration(user, uuid);
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      sessionStorage.removeItem("cointrol:registering");
      const code: string = e?.code ?? "";
      console.error("[Register] signInWithPopup error:", code, e);
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        if (code === "auth/account-exists-with-different-credential") {
          toast.error("An account with this email already exists using a different sign-in method. Please try another provider.");
        } else {
          toast.error(e?.message ?? "Sign-in failed. Please try again.");
        }
      }
      setSigningIn(false);
    }
  };

  const buttonsDisabled = signingIn || !termsChecked;

  if (inAppBrowser) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center">
            <img src={logo} alt="Cointrol Wallet" style={{ height: 56, width: "auto" }} />
          </div>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-xl">Open in your browser</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 text-center">
              <p className="text-sm text-muted-foreground">
                Sign-in requires a secure browser and won't work inside this app.
                Tap below to open Cointrol Wallet in Chrome or Safari.
              </p>
              <button
                type="button"
                onClick={() => window.open("https://wallet.cointrol.co", "_blank")}
                className="w-full h-12 rounded-xl bg-foreground text-background text-[15px] font-medium
                  hover:opacity-90 active:scale-[0.99] transition"
              >
                Open in Browser
              </button>
              <p className="text-xs text-muted-foreground">
                If the button doesn't work, copy this address into your browser:
                <br />
                <span className="font-mono select-all">wallet.cointrol.co</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="Cointrol Wallet" style={{ height: 56, width: "auto" }} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-xl">Create your account</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {/* T&C acceptance — always required for registration */}
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                Before creating your wallet, please review and accept our{" "}
                <Link
                  to="/legal/terms"
                  className="underline underline-offset-2 text-foreground"
                >
                  Terms &amp; Conditions
                </Link>
                .
              </p>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={(e) => setTermsChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-foreground cursor-pointer"
                />
                <span className="text-sm leading-snug">
                  I have read and agree to the Terms &amp; Conditions
                </span>
              </label>
            </div>

            {/* Sign-in buttons */}
            <div className="space-y-4 pt-2">
              <SocialButtons
                disabled={buttonsDisabled}
                onSignIn={(p) => signIn(providerMap[p])}
              />
            </div>

            <p className="text-center text-xs text-muted-foreground pt-1">
              A unique wallet identifier will be generated for your device.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="underline underline-offset-2 text-foreground">
            Sign in →
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/legal/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>&nbsp;
          <Link to="/legal/terms" className="underline underline-offset-2">
            Terms &amp; Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}
