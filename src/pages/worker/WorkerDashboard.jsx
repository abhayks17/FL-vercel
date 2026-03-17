import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PackageSearch, Send, QrCode, RefreshCcw } from 'lucide-react';
import Layout from '../../components/Layout';
import { getItemTypes, getItems, getItemByTag, takeStock } from '../../services/api';
import QRScanner from "../../components/QRScanner";
import './WorkerDashboard.css';

const WorkerDashboard = () => {
  // Inventory State
  const [itemTypes, setItemTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedItemData, setSelectedItemData] = useState(null);
  const [stockQty, setStockQty] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [scannerKey, setScannerKey] = useState(0);

  // Refs for state sync and UI
  const lastScannedItemRef = useRef(null);
  const scannerRef = useRef(null);

  // Fetch Category List on mount
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const types = await getItemTypes();
        setItemTypes(types);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchTypes();
  }, []);

  // Fetch Items when Category changes
  const fetchItems = async () => {
    if (selectedItemType) {
      try {
        const fetchedItems = await getItems(selectedItemType);

        // Ensure the scanned item stays in the list even if it wouldn't normally appear
        const isRecentlyScanned = lastScannedItemRef.current && selectedItem === lastScannedItemRef.current;
        const existsInFetched = fetchedItems.find(i => i._id === selectedItem);

        if (isRecentlyScanned && !existsInFetched && selectedItemData) {
          setItems([selectedItemData, ...fetchedItems]);
        } else {
          setItems(fetchedItems);
        }

        // Auto-clear selection if it becomes invalid and wasn't just scanned
        if (selectedItem && !isRecentlyScanned && !fetchedItems.find(i => i._id === selectedItem)) {
          setSelectedItem('');
        }

        // Cleanup ref after sync
        setTimeout(() => { lastScannedItemRef.current = null; }, 1000);

      } catch (err) {
        console.error("Failed to fetch items", err);
      }
    } else {
      setItems([]);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedItemType]);

  // Update Item Data when selection changes
  useEffect(() => {
    const item = items.find(i => i._id === selectedItem);
    setSelectedItemData(item || null);
  }, [selectedItem, items]);

  const handleScan = async (scannedTag) => {
    const tagId = scannedTag?.trim();
    if (!tagId) return;

    console.log("Worker Scanning Tag:", tagId);

    try {
      const item = await getItemByTag(tagId);

      lastScannedItemRef.current = item._id;

      // Update states
      const typeId = item.itemType?._id || item.itemType;
      setSelectedItemType(typeId);

      setItems(prev => {
        const exists = prev.find(i => i._id === item._id);
        return exists ? prev : [item, ...prev];
      });

      setSelectedItem(item._id);
      setSelectedItemData(item);
      setStockQty(''); // Let worker enter what they took

      // Focus quantity
      setTimeout(() => {
        const qtyInput = document.querySelector('input[placeholder="Quantity taken"]');
        if (qtyInput) qtyInput.focus();
      }, 250);

    } catch (err) {
      console.error("Scan error:", err.response?.data?.error || err.message);
      setMessage({ text: 'Item not found. Please check with an admin.', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    }
  };

  const resetScan = () => {
    setSelectedItem('');
    setSelectedItemData(null);
    setStockQty('');
    setMessage({ text: '', type: '' });
    lastScannedItemRef.current = null;
    setScannerKey(prev => prev + 1);

    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !stockQty) return;

    setLoading(true);
    try {
      const tagId = items.find(i => i._id === selectedItem)?.TagId;
      await takeStock({
        tagId,
        quantity: parseInt(stockQty)
      });

      setMessage({ text: 'Stock removed successfully!', type: 'success' });
      setStockQty('');
      fetchItems(); // Refresh counts

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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div className="form-group">
              <label className="input-label">2. Confirm Category</label>
              <select
                className="input-field"
                value={selectedItemType}
                onChange={(e) => setSelectedItemType(e.target.value)}
                required
              >
                <option value="">-- Choose Category --</option>
                {itemTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">3. Confirm Specific Item</label>
              <select
                className="input-field"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                disabled={!selectedItemType}
                required
              >
                <option value="">-- Choose Item --</option>
                {items.map(i => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.TagId}) - Available: {i.totalQuantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">4. Quantity Taken</label>
              <input
                type="number"
                className="input-field"
                placeholder="Quantity taken"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                required
                min="1"
              />
            </div>

            {selectedItemData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  background: 'rgba(34, 211, 238, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px dashed var(--border-glass)',
                  marginTop: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Stock</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{selectedItemData.totalQuantity} units</div>
                  </div>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="btn-primary btn-scan-another"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    <RefreshCcw size={16} />
                    Scan Another
                  </button>
                </div>
              </motion.div>
            )}

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
                disabled={loading || !selectedItem}
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
