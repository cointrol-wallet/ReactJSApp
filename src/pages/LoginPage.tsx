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
  // twitterProvider, // Twitter free tier no longer available
  githubProvider,
  appleProvider,
  microsoftProvider,
} from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import logo from "../assets/logo.png";
import { SocialButtons } from "@/components/ui/SocialButtons";

export function LoginPage() {
  const { firebaseUser, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();

  const [signingIn, setSigningIn] = useState(false);

  const inAppBrowser = /FBAN|FBAV|Instagram|Line|Twitter|MicroMessenger|Snapchat|WhatsApp|TikTok|WebView|wv\b/i
    .test(navigator.userAgent);

  // If already authenticated, go straight to dashboard
  useEffect(() => {
    if (firebaseUser) navigate("/dashboard", { replace: true });
  }, [firebaseUser, navigate]);

  const providerMap = {
    google: googleProvider,
    apple: appleProvider,
    microsoft: microsoftProvider,
    github: githubProvider,
    // x: twitterProvider, // Twitter free tier no longer available
    facebook: facebookProvider,
  } as const;

  const signIn = async (provider: AuthProvider) => {
    if (signingIn) return;
    clearAuthError();
    setSigningIn(true);
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged fires → if registered: firebaseUser updates → navigate("/dashboard")
      // if unregistered: authError is set → error message shown below
    } catch (e: any) {
      const code: string = e?.code ?? "";
      console.error("[Login] signInWithPopup error:", code, e);
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        if (code === "auth/account-exists-with-different-credential") {
          toast.error("An account with this email already exists using a different sign-in method. Please try another provider.");
        } else {
          toast.error(e?.message ?? "Sign-in failed. Please try again.");
        }
      }
    } finally {
      setSigningIn(false);
    }
  };

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
            <CardTitle className="text-center text-xl">Sign in</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {/* Unregistered error */}
            {authError === "unregistered" && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">
                  No account found for this sign-in. Please{" "}
                  <Link
                    to="/register"
                    className="underline underline-offset-2 font-medium"
                    onClick={clearAuthError}
                  >
                    register first
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* Sign-in buttons */}
            <div className="space-y-4 pt-2">
              <SocialButtons
                disabled={signingIn}
                onSignIn={(p) => signIn(providerMap[p])}
              />
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          New to Cointrol Wallet?{" "}
          <Link to="/register" className="underline underline-offset-2 text-foreground">
            Register here →
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
