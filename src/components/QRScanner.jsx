import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const QRScanner = ({ onScan }) => {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);
  const busyRef = useRef(false);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  // Centralized Lifecycle Management
  useEffect(() => {
    let mounted = true;
    
    const startScanner = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      setError(null);

      // Ensure DOM element is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      if (!mounted || !isCameraEnabled) {
        busyRef.current = false;
        return;
      }

      try {
        // Create new instance if needed
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-reader");
        }

        const scanner = scannerRef.current;
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
          () => {} // Frame ignored
        );

        if (mounted) setIsCameraActive(true);
      } catch (err) {
        if (mounted) {
          console.error("Scanner start error:", err);
          setError("Failed to access camera. Please check permissions or try image upload.");
          setIsCameraActive(false);
        }
      } finally {
        busyRef.current = false;
      }
    };

    const stopScanner = async () => {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        if (scannerRef.current) {
          const scanner = scannerRef.current;
          if (scanner.isScanning) {
            await scanner.stop();
          }
          // Always clear to be safe and release tracks
          await scanner.clear();
          scannerRef.current = null;
        }
      } catch (err) {
        console.warn("Scanner stop error:", err);
      } finally {
        if (mounted) setIsCameraActive(false);
        busyRef.current = false;
      }
    };

    if (isCameraEnabled) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      mounted = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        } else {
          try { scanner.clear(); } catch(e) {}
        }
      }
    };
  }, [isCameraEnabled, onScan]);

  const handleFileScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset flag for new scan result
    isScanningRef.current = false;

    // Use a fresh instance for file scanning to avoid DOM conflicts
    const tempScanner = new Html5Qrcode("qr-reader", { verbose: false });
    try {
      const decodedText = await tempScanner.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      console.error("File scan failed:", err);
      alert("No QR code found. Please ensure the image is clear and well-lit.");
    } finally {
      try { tempScanner.clear(); } catch(e) {}
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
        {(!isCameraActive || error) && (
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
                <div style={{ 
                  width: '48px', height: '48px', 
                  borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 1l22 22M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06a4 4 0 11-5.56-5.56" />
                  </svg>
                </div>
                <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.4rem', color: '#fff' }}>Camera is Off</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Turn on to start live scanning</p>
              </div>
            ) : error ? (
              <div style={{ color: '#ef4444' }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Scanner Error</p>
                <p style={{ fontSize: '0.85rem' }}>{error}</p>
              </div>
            ) : (
              <div style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.6 }}>Initializing camera...</div>
            )}
          </div>
        )}

        {/* Library Rendering Target */}
        <div id="qr-reader" style={{ 
          width: '100%', 
          border: 'none',
          display: isCameraActive ? 'block' : 'none' 
        }} />
      </div>

      {/* Manual Controls */}
      <div className="scanner-controls" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCameraEnabled(!isCameraEnabled)}
          style={{
            background: isCameraEnabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: isCameraEnabled ? '#ef4444' : '#22c55e',
            border: `1px solid ${isCameraEnabled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
            padding: '0.85rem',
            borderRadius: '1rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem'
          }}
        >
          {isCameraEnabled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          )}
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
            padding: '0.85rem',
            borderRadius: '1rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
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