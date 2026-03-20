import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
  const html5QrCodeRef = useRef(null);
  const isRunningRef = useRef(false);
  const isStartingRef = useRef(false); // 🔥 NEW

  useEffect(() => {
    if (isStartingRef.current || isRunningRef.current) return;

    isStartingRef.current = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );

        isRunningRef.current = true;
      } catch (err) {
        console.warn("Scanner start aborted:", err.message);
      } finally {
        isStartingRef.current = false;
      }
    };

    startScanner();

    return () => {
      const stopScanner = async () => {
        try {
          if (html5QrCodeRef.current && isRunningRef.current) {
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
            isRunningRef.current = false;
          }
        } catch (err) {
          // ✅ IGNORE THIS ERROR
          console.warn("Stop skipped:", err.message);
        }
      };

      stopScanner();
    };
  }, [onScan]);

  return <div id="qr-reader" style={{ width: "100%" }} />;
};

export default QRScanner;