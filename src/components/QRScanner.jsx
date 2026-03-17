import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.warn("Scanner clear failed", err));
        }
      },
      (error) => {}
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.warn("Scanner cleanup failed", err));
      }
    };
  }, []);

  return (
    <div className="qr-scanner-container">
      <div className="scanner-frame">
        <div className="scanner-line"></div>
      </div>
      <div id="qr-reader" />
    </div>
  );
};

export default QRScanner;