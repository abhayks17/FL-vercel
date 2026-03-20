import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PackageSearch, Send, QrCode, RefreshCcw } from 'lucide-react';
import Layout from '../../components/Layout';
import { getItemTypes, getItems, getItemByTag, takeStock } from '../../services/api';
import QRScanner from "../../components/QRScanner";
import './WorkerDashboard.css';

const WorkerDashboard = () => {
  // Inventory State
  const [selectedItemData, setSelectedItemData] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [manualTag, setManualTag] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [scannerKey, setScannerKey] = useState(0);

  // Refs for state sync and UI
  const scannerRef = useRef(null);

  const fetchItemByTag = async (tagId) => {
    if (!tagId) return;

    try {
      const item = await getItemByTag(tagId);

      setSelectedItemData(item);
      setStockQty('');
      setMessage({ text: '', type: '' });
      setManualTag(''); // Clear manual input on success

      setTimeout(() => {
        const qtyInput = document.querySelector('input[placeholder="Quantity taken"]');
        if (qtyInput) qtyInput.focus();
      }, 200);

    } catch (err) {
      setSelectedItemData(null);
      setMessage({ text: 'Item not found', type: 'error' });
    }
  };

  const handleScan = (scannedTag) => {
    const tagId = scannedTag?.trim();
    if (!tagId) return;

    console.log("Scanned:", tagId);
    fetchItemByTag(tagId);
  };

  const resetScan = () => {
    setSelectedItemData(null);
    setStockQty('');
    setManualTag('');
    setMessage({ text: '', type: '' });
    setScannerKey(prev => prev + 1);

    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItemData || !stockQty) return;

    setLoading(true);
    try {
      const tagId = selectedItemData?.TagId;
      await takeStock({
        tagId,
        quantity: parseInt(stockQty)
      });

      setMessage({ text: 'Stock removed successfully!', type: 'success' });
      setStockQty('');
      // Refresh current item data
      fetchItemByTag(tagId);

      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to remove stock', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout role="worker">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '2.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(34, 211, 238, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
              <PackageSearch color="var(--accent-cyan)" size={24} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Item Consumed</h2>
          </div>

          {/* Scanner Section */}
          <div style={{ marginBottom: "2.5rem" }} ref={scannerRef}>
            <h4 style={{ marginBottom: "1rem", color: 'var(--text-secondary)' }}>1. Scan Component QR</h4>
            <QRScanner key={scannerKey} onScan={handleScan} />
          </div>

          <div className="form-group" style={{ marginBottom: '2.5rem' }}>
            <label className="input-label">OR Enter Tag ID</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter Tag ID manually"
                value={manualTag}
                onChange={(e) => setManualTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchItemByTag(manualTag.trim());
                  }
                }}
              />
              <button 
                type="button"
                onClick={() => fetchItemByTag(manualTag.trim())}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--accent-cyan)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.4rem',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Fetch
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {selectedItemData && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(34, 211, 238, 0.03)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--border-glass)',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Item Name</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{selectedItemData.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tag ID</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>{selectedItemData.TagId}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</div>
                    <div style={{ fontSize: '1rem' }}>{selectedItemData.itemType?.name || 'Uncategorized'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available Stock</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{selectedItemData.totalQuantity} <span style={{fontSize: '0.9rem', fontWeight: '400'}}>{selectedItemData.uom || 'units'}</span></div>
                  </div>
                </div>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(0,0,0,0.05)' }}
                  >
                    <RefreshCcw size={16} />
                    Reset Scan
                  </button>
                </div>
              </motion.div>
            )}

            <div className="form-group">
              <label className="input-label">Quantity Consumed</label>
              <input
                type="number"
                className="input-field"
                placeholder="Quantity taken"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                required
                min="1"
                disabled={!selectedItemData}
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              {message.text && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`message-box ${message.type === 'success' ? 'msg-success' : 'msg-error'}`}
                  style={{ marginBottom: '1rem' }}
                >
                  {message.text}
                </motion.div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !selectedItemData}
                style={{ width: '100%', padding: '1rem', justifyContent: 'center', fontSize: '1.1rem' }}
              >
                {loading ? 'Processing...' : 'Confirm Consumption'}
                {!loading && <Send size={20} />}
              </button>
            </div>

          </form>
        </motion.div>

      </div>
    </Layout>
  );
};

export default WorkerDashboard;
