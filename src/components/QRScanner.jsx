import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initScanner = async () => {
      // Small delay to ensure DOM element with id="qr-reader" is rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted) return;

      const element = document.getElementById("qr-reader");
      if (!element) {
        console.warn("Scanner element 'qr-reader' not found in DOM.");
        return;
      }

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (mounted && !isScanningRef.current) {
              isScanningRef.current = true;
              onScan(decodedText);
            }
          },
          () => {
            // Frame ignored
          }
        );
        if (mounted) setIsCameraActive(true);
      } catch (err) {
        if (mounted) {
          console.error("Scanner initialization failed:", err);
          const errorMsg = err?.message || String(err);
          if (errorMsg.includes("NotFoundError")) {
            setError("Camera hardware not found. You can still scan from an image file below.");
          } else if (errorMsg.includes("NotAllowedError")) {
            setError("Camera permission denied. Please allow access or upload an image instead.");
          } else {
            setError("Could not start camera. Please use the 'Upload Image' option below.");
          }
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          scanner.stop()
            .catch(err => console.warn("Scanner stop during cleanup:", err));
        }
      }
    };
  }, [onScan]);

  const handleFileScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!scannerRef.current) {
      // If camera failed, we might need a temporary instance for file scanning
      const tempScanner = new Html5Qrcode("qr-reader", { verbose: false });
      try {
        const decodedText = await tempScanner.scanFile(file, true);
        onScan(decodedText);
      } catch (err) {
        console.error("File scan error:", err);
        alert("Could not find a valid QR code in this image.");
      }
      return;
    }

    try {
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      console.error("File scan error:", err);
      alert("Could not find a valid QR code in this image.");
    }
  };

  return (
    <div className="qr-scanner-outer-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="qr-scanner-container" style={{ position: 'relative', minHeight: '300px', background: '#000', borderRadius: '1rem', overflow: 'hidden' }}>
        {error && !isCameraActive ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            padding: '2rem',
            textAlign: 'center',
            zIndex: 20,
            background: 'rgba(0,0,0,0.9)'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.75rem' }}>Camera Unavailable</div>
            <div style={{ fontSize: '0.9rem', lineHeight: '1.4', color: '#9ca3af' }}>{error}</div>
          </div>
        ) : (
          <>
            <div className="scanner-frame">
              <div className="scanner-line"></div>
            </div>
            <div id="qr-reader" style={{ width: '100%', border: 'none' }} />
          </>
        )}
      </div>

      <div className="scanner-manual-input" style={{ textAlign: 'center' }}>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileScan} 
          style={{ display: 'none' }} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn-scan-image"
          style={{
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Scan from Image File
        </button>
      </div>
    </div>
  );
};

export default QRScanner;