import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Github, Facebook, Twitter } from "lucide-react";
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
  // appleProvider, // Uncomment to add Apple Sign-In (also uncomment the button below)
} from "../firebase";
import { useAuth } from "../context/AuthContext";
import { isFirstTimeUser, setTermsAccepted } from "../storage/authStore";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import logo from "../assets/logo.png";
import { SocialButtons } from "@/components/ui/SocialButtons";

export function LoginPage() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();

  const [firstTime, setFirstTime] = useState<boolean | null>(null);
  const [termsChecked, setTermsChecked] = useState(
    () => sessionStorage.getItem("cointrol:terms-pending") === "true"
  );
  const [signingIn, setSigningIn] = useState(false);

  // Determine first-time vs returning on mount
  useEffect(() => {
    isFirstTimeUser().then(setFirstTime);
  }, []);

  // If already authenticated (e.g. after a redirect or returning session), go straight to dashboard
  useEffect(() => {
    if (firebaseUser) navigate("/dashboard", { replace: true });
  }, [firebaseUser, navigate]);

  const providerMap = {
  google: googleProvider,
  //apple: appleProvider,
  github: githubProvider,
  x: twitterProvider,
  facebook: facebookProvider,
} as const;

  const signIn = async (provider: AuthProvider) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signInWithPopup(auth, provider);
      await setTermsAccepted();
      sessionStorage.removeItem("cointrol:terms-pending");
      // onAuthStateChanged fires → firebaseUser updates → navigate("/dashboard")
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
      setSigningIn(false);
    }
  };

  const buttonsDisabled = signingIn || (firstTime === true && !termsChecked);

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="Cointrol Wallet" style={{ height: 56, width: "auto" }} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-xl">Sign in to Cointrol Wallet</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-2">
            {/* Loading state while we check IndexedDB */}
            {firstTime === null ? (
              <div className="text-center text-sm text-muted-foreground py-4">Loading…</div>
            ) : (
              <>
                {/* First-time T&C acceptance */}
                {firstTime && (
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
                        onChange={(e) => {
                          const val = e.target.checked;
                          sessionStorage.setItem("cointrol:terms-pending", val ? "true" : "false");
                          setTermsChecked(val);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-foreground cursor-pointer"
                      />
                      <span className="text-sm leading-snug">
                        I have read and agree to the Terms &amp; Conditions
                      </span>
                    </label>
                  </div>
                )}

                {/* Sign-in buttons */}
                <div className="space-y-4 pt-2">
                  <SocialButtons
                    disabled={buttonsDisabled}
                    onSignIn={(p) => signIn(providerMap[p])}
                  />
                </div>

                {firstTime && (
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    First time? A unique wallet identifier will be generated for your device.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
