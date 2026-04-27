import * as React from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { QR_CHAR_LIMIT, encodeSharePayload } from "@/lib/sharePayload";
import type { SharePayload } from "@/lib/sharePayload";
import { downloadShareTextFile } from "@/lib/shareTextFormat";
import logo from "@/assets/logo.png";

const QR_SIZE = 240;

export function ShareQrModal({
  payload,
  onClose,
  title,
}: {
  payload: SharePayload;
  onClose: () => void;
  title?: string;
}) {
  const value = encodeSharePayload(payload);
  const tooLarge = value.length > QR_CHAR_LIMIT;
  const qrWrapperRef = React.useRef<HTMLDivElement>(null);
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "error">("idle");

  async function handleCopyQr() {
    const wrapper = qrWrapperRef.current;
    if (!wrapper) return;
    const svgEl = wrapper.querySelector("svg");
    if (!svgEl) return;

    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      const EXPORT = 640, PAD = 30;
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT;
      canvas.height = EXPORT;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, EXPORT, EXPORT);
      ctx.drawImage(img, PAD, PAD, EXPORT - PAD * 2, EXPORT - PAD * 2);
      URL.revokeObjectURL(url);

      const pngBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
      );

      let wroteToClipboard = false;
      if (navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
          wroteToClipboard = true;
        } catch {
          // image clipboard not supported — fall through to download
        }
      }
      if (!wroteToClipboard) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(pngBlob);
        a.download = "cointrol-qr.png";
        a.click();
      }

      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483646,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="
          rounded-2xl
          border border-border
          bg-background
          text-foreground
          shadow-2xl
        "
        style={{
          position: "fixed",
          zIndex: 2147483647,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(420px, calc(100vw - 32px))",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold mb-3 text-center material-gold-text">
          {title ?? (`Share ${payload.t}` + ('name' in payload.data ? `: ${payload.data.name}` : ''))}
        </div>

        {/* QR box */}
        <div className="mt-2 flex justify-center">
          {tooLarge ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 max-w-xs text-center">
              QR code too large — download the file and load it on the other device using
              QR scanner → <strong>Load file</strong>.
            </div>
          ) : (
            <div
              ref={qrWrapperRef}
              className="bg-white p-3 rounded-lg border border-border shadow-sm"
              style={{ position: "relative", display: "inline-block" }}
            >
              <QRCode value={value} size={QR_SIZE} level="H" />
              <img
                src={logo}
                alt=""
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 48,
                  height: 48,
                  objectFit: "contain",
                  borderRadius: 6,
                  background: "white",
                  padding: 2,
                }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-card border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
              onClick={handleCopyQr}
              disabled={tooLarge || copyState !== "idle"}
            >
              {copyState === "copied" ? "Copied!" : copyState === "error" ? "Failed" : "Copy QR"}
            </button>

            <button
              type="button"
              className="rounded bg-card border border-border px-3 py-2 text-sm text-foreground"
              onClick={() => downloadShareTextFile(payload)}
            >
              Download file
            </button>
          </div>

          <button
            type="button"
            className="rounded bg-primary px-3 py-2 text-primary-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>

      </div>
    </>,
    document.body
  );
}
