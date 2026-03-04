import * as React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

export function WelcomePopup({
  onGetStarted,
  onDismiss,
}: {
  onGetStarted: () => void;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-background text-foreground"
        style={{
          width: "min(520px, calc(100dvw - 32px))",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          borderRadius: 16,
          padding: "24px 24px 20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 id="welcome-title" className="text-xl font-semibold leading-snug">
            Welcome to Cointrol
          </h2>
          <button
            onClick={onDismiss}
            aria-label="Close welcome dialog"
            className="text-muted-foreground hover:text-foreground shrink-0"
            style={{ fontSize: 18, lineHeight: 1, marginTop: 3 }}
          >
            ✕
          </button>
        </div>

        {/* Intro */}
        <p className="text-sm text-muted-foreground mb-5">
          Your wallet is set up and ready. This is a test environment running on Sepolia — nothing here has real value.
          Your account has been credited with <strong>100 FAKE coins</strong> to explore with.
          Start by creating your first account (called a <strong>folio</strong>) below.
        </p>

        {/* Steps */}
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                1
              </span>
              Tap <strong>Create account</strong> on the Portfolio screen
            </p>
            <img
              src="/onboarding/welcome-step1.png"
              alt="Portfolio screen with the Create account button highlighted"
              className="w-full rounded-lg border border-border"
              style={{ display: "block" }}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              The <strong>Create account</strong> button is in the toolbar at the top of the portfolio. Each account is a smart-contract wallet on the blockchain.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                2
              </span>
              Give it a name and confirm
            </p>
            <img
              src="/onboarding/welcome-step2.png"
              alt="Create Account dialog with a name entered and the Create account button"
              className="w-full rounded-lg border border-border"
              style={{ display: "block" }}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter any name (e.g. <em>"My Wallet"</em>) and tap <strong>Create account</strong>. This may take a few moments while the account is set up on the blockchain.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
          <Link
            to="/user-guide"
            onClick={onDismiss}
            className="text-sm text-primary hover:underline"
          >
            Read the full user guide →
          </Link>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onDismiss}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Dismiss
            </button>
            <button
              onClick={onGetStarted}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Create my first account
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
