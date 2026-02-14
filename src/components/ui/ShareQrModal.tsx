import * as React from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { encodeSharePayload } from "@/lib/sharePayload";
import type { SharePayload } from "@/lib/sharePayload";

export function ShareQrModal({
  payload,
  onClose,
}: {
  payload: SharePayload;
  onClose: () => void;
}) {
  const value = encodeSharePayload(payload);

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
          border border-neutral-200
          bg-[#fffdf7]
          text-neutral-900
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
        <div className="text-lg font-semibold mb-3 text-center">Share profile</div>
        <div className="mt-4 flex justify-end gap-2"></div><br/>

        {/* QR box */}
        <div className="mt-2 flex justify-center">
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <QRCode value={value} size={240} />
          </div>
        </div>


        {/* Actions */}
        <div className="mt-4 flex justify-end">

          <button
            type="button"
            className="rounded bg-black px-3 py-2 text-white"
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
