import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  // Initialize/Update Live Camera
  useEffect(() => {
    let mounted = true;
    
    const initScanner = async () => {
      // Clear previous error if we're trying to start
      if (isCameraEnabled) setError(null);
      
      // Small delay to ensure DOM element exists
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (!mounted || !isCameraEnabled) return;

      const element = document.getElementById("qr-reader");
      if (!element) return;

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
          () => {} // Ignored
        );
        if (mounted) setIsCameraActive(true);
      } catch (err) {
        if (mounted) {
          console.error("Scanner failed:", err);
          const errorMsg = err?.message || String(err);
          if (errorMsg.includes("NotFoundError")) {
            setError("Camera not found. Use image upload below.");
          } else if (errorMsg.includes("NotAllowedError")) {
            setError("Camera permission denied.");
          } else {
            setError("Camera failed to start.");
          }
          setIsCameraActive(false);
        }
      }
    };

    if (isCameraEnabled) {
      initScanner();
    } else {
      // Stop scanning if disabled
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop()
          .then(() => {
            if (mounted) setIsCameraActive(false);
          })
          .catch(err => console.warn("Cleanup stop:", err));
      }
    }

    return () => {
      mounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan, isCameraEnabled]);

  const handleFileScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset scanner state for fresh scan
    isScanningRef.current = false;

    // Create a temporary scanner for file if the live one isn't active/matching
    const fileScanner = new Html5Qrcode("qr-reader", { verbose: false });
    
    try {
      const decodedText = await fileScanner.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      console.error("File scan failed:", err);
      alert("No QR code found in this image. Try another.");
    } finally {
      // Clean up the temporary scanner instance if it was just for file
      try { fileScanner.clear(); } catch(e) {}
    }
  };

  const toggleCamera = () => {
    setIsCameraEnabled(!isCameraEnabled);
    if (isCameraEnabled && scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop()
        .then(() => setIsCameraActive(false))
        .catch(err => console.warn("Toggle stop failed:", err));
    }
  };

  return (
    <div className="qr-scanner-outer-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Target Container */}
      <div className="qr-scanner-container" style={{ 
        position: 'relative', 
        minHeight: '300px', 
        background: '#0a0a0a', 
        borderRadius: '1.25rem', 
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        
        {/* Corner Frame Overlay */}
        <div className="scanner-frame">
          <div className="scanner-corners">
            <div className="corner corner-top-left"></div>
            <div className="corner corner-top-right"></div>
            <div className="corner corner-bottom-left"></div>
            <div className="corner corner-bottom-right"></div>
          </div>
          {isCameraActive && !error && <div className="scanner-line"></div>}
        </div>

        {/* Messaging / Error States */}
        {(!isCameraEnabled || error) && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            zIndex: 15,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)'
          }}>
            {!isCameraEnabled ? (
              <div style={{ color: '#9ca3af' }}>
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>Camera is Off</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Use Image Upload or Turn Camera On</p>
              </div>
            ) : error ? (
              <div style={{ color: '#ef4444' }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Scanner Error</p>
                <p style={{ fontSize: '0.9rem' }}>{error}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Library Rendering Target */}
        <div id="qr-reader" style={{ 
          width: '100%', 
          border: 'none',
          visibility: isCameraActive ? 'visible' : 'hidden' 
        }} />
      </div>

      {/* Manual Controls */}
      <div className="scanner-controls" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* Toggle Button */}
        <button 
          onClick={toggleCamera}
          style={{
            background: isCameraEnabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: isCameraEnabled ? '#ef4444' : '#22c55e',
            border: `1px solid ${isCameraEnabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
            padding: '0.75rem',
            borderRadius: '0.75rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
        </button>

        {/* File Input */}
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
            background: '#fff',
            color: '#000',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Upload QR Image
        </button>
      </div>
    </div>
  );
};

export default QRScanner;