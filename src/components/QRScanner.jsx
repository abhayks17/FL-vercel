import React, { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {}
    );

    return () => scanner.clear().catch(() => {});
  }, []);

  return (
    <div className="qr-scanner-container">
      <div id="qr-reader" />
    </div>
  );
};

export default QRScanner;