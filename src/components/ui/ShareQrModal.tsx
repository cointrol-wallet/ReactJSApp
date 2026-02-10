import QRCode from "react-qr-code";
import { encodeSharePayload } from "@/lib/sharePayload";
import type { SharePayload } from "@/lib/sharePayload";

export function ShareQrModal({ payload }: { payload: SharePayload }) {
  const value = encodeSharePayload(payload);

  return (
    <div className="p-4">
      <div className="bg-white p-3 inline-block rounded">
        <QRCode value={value} size={240} />
      </div>

      <div className="mt-3 flex gap-3">
        <button onClick={() => navigator.clipboard.writeText(value)} className="underline">
          Copy
        </button>
      </div>

      <div className="text-xs text-neutral-500 mt-2 break-all">{value}</div>
    </div>
  );
}
