import React from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export function QrScanner({
  onDecoded,
}: {
  onDecoded: (payload: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    let controls: IScannerControls | null = null;
    let stopped = false;

    const reader = new BrowserMultiFormatReader();

    (async () => {
      const video = videoRef.current;
      if (!video) return;

      controls = await reader.decodeFromVideoDevice(
        undefined,
        video,
        (result, err) => {
          if (stopped) return;

          if (result) {
            stopped = true;
            controls?.stop(); // ✅ correct stop method
            onDecoded(result.getText());
          }
        }
      );
    })();

    return () => {
      stopped = true;
      controls?.stop(); // cleanup on unmount
    };
  }, [onDecoded]);

  return (
    <div className="p-4">
      <video ref={videoRef} className="w-full rounded-lg" />
      <div className="text-xs text-neutral-500 mt-2">
        Point your camera at a QR code.
      </div>
    </div>
  );
}
