import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PackagePlus,
  ClipboardList,
  Activity,
  ChevronLeft,
  PlusCircle,
  ChevronRight,
  LayoutGrid,
  X,
  Save,
  FileText,
  Shield,
  Users,
  Download,
  Calendar,
  AlertCircle,
  QrCode,
  Pencil,
  Trash2,
  Box
} from 'lucide-react';
import Layout from '../../components/Layout';
import axios from 'axios';
import { getLogs, createItemType, getItemTypes, getItems, addStock, getItemByTag, downloadReport as fetchReportFile, updateItem, deleteItem } from '../../services/api';
import './AdminDashboard.css';
import QRGenerator from "../../components/QRGenerator";
import QRScanner from "../../components/QRScanner";
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('management');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inventory Management State
  const [itemTypes, setItemTypes] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [manualTagId, setManualTagId] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [isNewItem, setIsNewItem] = useState(false);
  const [selectedItemData, setSelectedItemData] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [manualUom, setManualUom] = useState('Unit');
  const [submitting, setSubmitting] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState({ text: '', type: '' });

  // Add Item Type Modal State
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  // Reports State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [reportsError, setReportsError] = useState('');

  const lastScannedItemRef = useRef(null);
  const scannerRef = useRef(null);
  const [scannerKey, setScannerKey] = useState(0);
  const [allInventory, setAllInventory] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    TagId: '',
    uom: '',
    itemType: '',
    totalQuantity: 0
  });

  const fetchData = async () => {
    if (activeView === 'logs') {
      setLoading(true);
      try {
        const data = await getLogs(page);
        setLogs(data.logs);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error('Logs fetch failed', error);
      } finally {
        setLoading(false);
      }
    } else if (activeView === 'inventory') {
      try {
        const types = await getItemTypes();
        setItemTypes(types);
      } catch (error) {
        console.error('ItemTypes fetch failed', error);
      }
    } else if (activeView === 'management') {
      try {
        const itemsData = await getItems();
        setAllInventory(itemsData);
        const types = await getItemTypes();
        setItemTypes(types);
      } catch (error) {
        console.error('Management fetch failed', error);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeView, page]);

  const resetScan = () => {
    setSelectedItem('');
    setSelectedItemData(null);
    setManualTagId('');
    setManualItemName('');
    setStockQty('');
    setIsNewItem(false);
    setInventoryMessage({ text: '', type: '' });

    lastScannedItemRef.current = null;
    setScannerKey(prev => prev + 1); // Remount scanner

    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  const handleScan = async (scannedTag) => {
    const tagId = scannedTag?.trim();
    if (!tagId) return;

    console.log("Initiating scan for Tag:", tagId);

    try {
      const item = await getItemByTag(tagId);
      console.log("Item identified successfully:", item);

      // 1. Immediately block "new item" mode
      setIsNewItem(false);
      lastScannedItemRef.current = item._id;

      // 2. Align selection states
      const typeId = item.itemType?._id || item.itemType;
      setSelectedItemType(typeId);

      // Ensure current selection is prioritized in the list
      setItems(prev => {
        const alreadyExists = prev.find(i => i._id === item._id);
        return alreadyExists ? prev : [item, ...prev];
      });

      setSelectedItem(item._id);
      setSelectedItemData(item);
      setStockQty('');
      setManualTagId("");

      // 3. User experience: focus quantity
      setTimeout(() => {
        const qtyInput = document.querySelector('input[placeholder="Count"]');
        if (qtyInput) qtyInput.focus();
      }, 250);

    } catch (err) {
      console.warn("Scan failed - switching to new item mode:", err.response?.data?.error || err.message);
      setIsNewItem(true);
      setSelectedItem("NEW");
      setManualTagId(tagId);
      setSelectedItemData(null);
      setStockQty('1');

      setTimeout(() => {
        const nameInput = document.querySelector('input[placeholder="Item Name (e.g. M10 Bolt)"]');
        if (nameInput) nameInput.focus();
      }, 250);
    }
  };

  const downloadQR = (tagId) => {
    const canvas = document.querySelector(".qr-print-area canvas") || document.querySelector(".inventory-grid canvas");
    if (!canvas) return;

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_${tagId}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };
  const fetchItems = async () => {
    if (selectedItemType) {
      try {
        const fetchedItems = await getItems(selectedItemType);
        setItems(fetchedItems);

        if (fetchedItems.length === 0) {
          // Only switch to NEW if we are not currently showing a scanned item
          if (!lastScannedItemRef.current) {
            setSelectedItem('NEW');
            setIsNewItem(true);
          }
        } else {
          // Keep current selection if valid, or if it was just scanned
          const isRecentlyScanned = lastScannedItemRef.current && selectedItem === lastScannedItemRef.current;
          const existsInFetched = fetchedItems.find(i => i._id === selectedItem);

          if (selectedItem !== 'NEW' && !isRecentlyScanned && !existsInFetched) {
            setSelectedItem('');
            setIsNewItem(false);
          }

          // If we just scanned, ensure it's in the items list even if backend filtered it out
          if (isRecentlyScanned && !existsInFetched && selectedItemData) {
            setItems([selectedItemData, ...fetchedItems]);
          }

          // Clear ref after a delay to ensure and allow subsequent syncs
          setTimeout(() => { lastScannedItemRef.current = null; }, 1000);
        }
      } catch (error) {
        console.error('Items fetch failed', error);
      }
    } else {
      setItems([]);
      setSelectedItem('');
      setIsNewItem(false);
      setSelectedItemData(null);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedItemType]);

  useEffect(() => {
    if (selectedItem === 'NEW') {
      setIsNewItem(true);
      setSelectedItemData(null);
    } else {
      setIsNewItem(false);
      const item = items.find(i => i._id === selectedItem);
      setSelectedItemData(item || null);
    }
  }, [selectedItem, items]);

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const tagToSubmit = isNewItem ? manualTagId.trim() : items.find(i => i._id === selectedItem)?.TagId;

    if (!tagToSubmit || !stockQty) {
      setInventoryMessage({ text: 'Please provide Tag ID and quantity', type: 'error' });
      return;
    }

    setSubmitting(true);
    setInventoryMessage({ text: '', type: '' });

    try {
      await addStock({
        tagId: tagToSubmit,
        name: isNewItem ? manualItemName.trim() : items.find(i => i._id === selectedItem)?.name,
        itemTypeId: selectedItemType,
        quantity: parseInt(stockQty),
        uom: isNewItem ? manualUom.trim() : items.find(i => i._id === selectedItem)?.uom
      });
      setInventoryMessage({ text: isNewItem ? 'New item created and stock added!' : 'Stock updated successfully!', type: 'success' });
      setStockQty('');
      setManualTagId('');
      setManualItemName('');

      // Auto-refresh
      await fetchItems();
      if (activeView === 'logs') fetchData();

      setTimeout(() => setInventoryMessage({ text: '', type: '' }), 4000);
    } catch (error) {
      setInventoryMessage({ text: error.response?.data?.error || 'Failed to update stock', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = async (type) => {
    const setErrorState = type === 'daily' ? setLoadingDaily : setLoadingActivity;
    setErrorState(true);
    setReportsError('');

    try {
      const blobData = await fetchReportFile(type, startDate, endDate);

      const url = window.URL.createObjectURL(new Blob([blobData]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${startDate}_to_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      setReportsError(`Failed to generate ${type} report. Please try again.`);
    } finally {
      setErrorState(false);
    }
  };

  const handleCreateItemType = async (e) => {
    e.preventDefault();
    try {
      await createItemType({ name: newTypeName, description: newTypeDesc });
      const types = await getItemTypes();
      setItemTypes(types);
      setShowTypeModal(false);
      setNewTypeName('');
      setNewTypeDesc('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create type');
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      TagId: item.TagId,
      uom: item.uom || 'Unit',
      itemType: item.itemType?._id || item.itemType,
      totalQuantity: item.totalQuantity
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateItem(editingItem._id, editFormData);
      setShowEditModal(false);
      const itemsData = await getItems();
      setAllInventory(itemsData);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteItem(id);
        const itemsData = await getItems();
        setAllInventory(itemsData);
      } catch (error) {
        alert(error.response?.data?.error || 'Failed to delete item');
      }
    }
  };

  const sidebarContent = (
    <>
      <div className="console-label" style={{
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '1rem',
        paddingLeft: '0.5rem'
      }}>Console</div>
      <button
        onClick={() => setActiveView('management')}
        className={`sidebar-btn ${activeView === 'management' ? 'active' : ''}`}
      >
        <LayoutGrid size={18} />
        Management
      </button>
      <button
        onClick={() => setActiveView('inventory')}
        className={`sidebar-btn ${activeView === 'inventory' ? 'active' : ''}`}
      >
        <PackagePlus size={18} />
        Inward Stock
      </button>
      <button
        onClick={() => setActiveView('logs')}
        className={`sidebar-btn ${activeView === 'logs' ? 'active' : ''}`}
      >
        <ClipboardList size={18} />
        Recent Logs
      </button>
      <button
        onClick={() => setActiveView('reports')}
        className={`sidebar-btn ${activeView === 'reports' ? 'active' : ''}`}
      >
        <FileText size={18} />
        Reports
      </button>
    </>
  );

  return (
    <Layout role="admin" sidebarContent={sidebarContent}>
      <div>
        {activeView === 'management' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '2rem' }}>
            <div className="dashboard-header">
              <h2 className="dashboard-title">
                <Box size={24} color="var(--accent-amber)" />
                Inventory Management
              </h2>
            </div>

            <div className="table-container">
              <table className="audit-table management-table">
                <thead>
                  <tr>
                    <th>TOOL ID</th>
                    <th>NAME</th>
                    <th>DEPARTMENT</th>
                    <th>UOM</th>
                    <th>ITEMS LEFT</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {allInventory.map(item => (
                    <tr key={item._id}>
                      <td style={{ fontWeight: '700' }}>{item.TagId}</td>
                      <td style={{ fontWeight: '500' }}>{item.name}</td>
                      <td>{item.itemType?.name || 'N/A'}</td>
                      <td>{item.uom || 'Unit'}</td>
                      <td>
                        <span className={`status-badge ${item.totalQuantity > 10 ? 'status-add' : 'status-low'}`} 
                              style={{ 
                                backgroundColor: item.totalQuantity > 10 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                                color: item.totalQuantity > 10 ? '#22c55e' : '#f97316',
                                borderRadius: '20px',
                                padding: '4px 12px'
                              }}>
                          {item.totalQuantity} units
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => downloadQR(item.TagId)} className="btn-icon-sm" title="Download QR">
                            <QrCode size={16} color="#3b82f6" />
                            <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: '#3b82f6' }}>QR</span>
                          </button>
                          <button onClick={() => handleEditClick(item)} className="btn-icon-sm" title="Edit">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteItem(item._id)} className="btn-icon-sm" title="Delete">
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Hidden QR for download purposes if needed */}
            <div style={{ display: 'none' }} className="qr-print-area">
              {allInventory.map(item => (
                 <QRGenerator key={item._id} tagId={item.TagId} />
              ))}
            </div>
          </motion.div>
        )}

        {activeView === 'logs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '2rem' }}>
            <div className="dashboard-header">
              <h2 className="dashboard-title">
                <Activity size={24} color="var(--accent-amber)" />
                Stock Audit Trail
              </h2>
              <div className="pagination-controls">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-icon">
                  <ChevronLeft size={18} />
                </button>
                <div className="page-info">
                  {page} / {totalPages}
                </div>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-icon">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="table-container">
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>Loading audit logs...</div>
              ) : (
                <table className="audit-table">
                  <thead>
                    <tr>
                      {['User', 'Item', 'Action', 'Qty', 'Time'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log._id}>
                        <td>{log.user?.username || 'System'}</td>
                        <td>{log.item?.name || log.item?.TagId || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${log.action === 'add' ? 'status-add' : 'status-take'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600' }}>{log.quantity}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {activeView === 'inventory' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '2.5rem', maxWidth: '800px' }}>
            <div className="dashboard-header">
              <h2 className="dashboard-title">
                <LayoutGrid className="text-cyan-400" />
                Inventory Stocking
              </h2>

              <button
                onClick={() => setShowTypeModal(true)}
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
              >
                <PlusCircle size={16} />
                New Item Type
              </button>
            </div>

            {/* QR Scanner */}
            <div style={{ marginBottom: "2rem" }} ref={scannerRef}>
              <h4 style={{ marginBottom: "0.5rem" }}>Scan Item QR</h4>
              <QRScanner key={scannerKey} onScan={handleScan} />
            </div>

            <form onSubmit={handleStockSubmit} className="inventory-grid">
              <div className="full-width">
                <label className="input-label">1. Select Category (Item Type)</label>
                <select
                  className="input-field"
                  value={selectedItemType}
                  onChange={(e) => setSelectedItemType(e.target.value)}
                  required
                >
                  <option value="">-- Choose Type --</option>
                  {itemTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="input-label">2. Select Specific Item</label>
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
                      {i.name} ({i.TagId}) - Stock: {i.totalQuantity}
                    </option>
                  ))}
                  {selectedItemType && (
                    <option value="NEW" style={{ fontWeight: 'bold' }}>
                      + Add New Item
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="input-label">
                  {isNewItem ? '3. Item Identifiers' : '3. Quantity to Add'}
                </label>
                {isNewItem ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="text"
                      className="input-field"
                      value={manualTagId}
                      onChange={(e) => setManualTagId(e.target.value)}
                      placeholder="Tag ID (e.g. RFID-999)"
                      required
                    />

                    {/* QR CODE GENERATED HERE */}
                    {manualTagId && (
                      <div style={{ marginTop: "0.5rem", textAlign: "center" }}>
                        <QRGenerator tagId={manualTagId} />
                      </div>
                    )}

                    <input
                      type="text"
                      className="input-field"
                      value={manualItemName}
                      onChange={(e) => setManualItemName(e.target.value)}
                      placeholder="Item Name (e.g. M10 Bolt)"
                      required
                    />
                    <input
                      type="text"
                      className="input-field"
                      value={manualUom}
                      onChange={(e) => setManualUom(e.target.value)}
                      placeholder="UOM (e.g. Drum, Pail, Unit)"
                      required
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    className="input-field"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="Count"
                    required
                  />
                )}
              </div>

              {isNewItem && (
                <div className="full-width">
                  <label className="input-label">4. Initial Stock Quantity</label>
                  <input
                    type="number"
                    className="input-field"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="New Stock Count"
                    required
                  />
                </div>
              )}

              {selectedItemData && (
                <div className="full-width" style={{
                  background: 'rgba(34, 211, 238, 0.05)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  border: '1px dashed var(--border-glass)',
                  marginBottom: '1rem'
                }}>

                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                    Item Details
                  </div>

                  <div style={{ color: 'var(--text-secondary)', marginBottom: "1rem" }}>
                    Name: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                      {selectedItemData.name}
                    </span>
                    {" | "}
                    Tag: {selectedItemData.TagId}
                    {" | "}
                    Category: {selectedItemData.itemType?.name}
                    {" | "}
                    Stock: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                      {selectedItemData.totalQuantity}
                    </span>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <div className="qr-print-area">
                      <QRGenerator tagId={selectedItemData.TagId} />
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => downloadQR(selectedItemData.TagId)}
                      style={{ marginTop: "8px", width: "100%", padding: "0.5rem" }}
                    >
                      Download QR Image
                    </button>
                    <button
                      type="button"
                      className="btn-primary btn-scan-another"
                      onClick={resetScan}
                      style={{ marginTop: "8px", width: "100%", padding: "0.5rem" }}
                    >
                      Scan Another Item
                    </button>
                  </div>

                </div>
              )}

              {isNewItem && items.length === 0 && selectedItemType && (
                <div className="full-width" style={{
                  fontSize: '0.8rem',
                  color: 'var(--accent-amber)',
                  background: 'rgba(251, 191, 36, 0.05)',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  marginBottom: '1rem'
                }}>
                  Note: No items exist in this category yet. Please create the first one.
                </div>
              )}

              <div className="full-width" style={{ marginTop: '0.5rem' }}>
                {inventoryMessage.text && (
                  <div className={`message-box ${inventoryMessage.type === 'success' ? 'msg-success' : 'msg-error'}`}>
                    {inventoryMessage.text}
                  </div>
                )}
                <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '1rem', justifyContent: 'center' }}>
                  {submitting ? 'Updating...' : isNewItem ? 'Create Item & Add Stock' : 'Update Item Stock'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeView === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="reports-container">

              {/* Heading */}
              <div className="reports-heading">
                <h2>
                  <FileText size={28} />
                  Inventory Reports
                </h2>
                <p>Generate and download detailed Excel reports for a specific date range.</p>
              </div>

              {/* Date Controls */}
              <div className="reports-controls">
                <div className="form-group">
                  <label className="input-label">Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">End Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Error */}
              {reportsError && (
                <div className="reports-error">
                  <AlertCircle size={20} />
                  {reportsError}
                </div>
              )}

              {/* Report Cards */}
              <div className="reports-cards">
                <div className="report-card">
                  <div className="report-card-header">
                    <span className="report-card-icon">
                      <FileText size={22} />
                    </span>
                    <div>
                      <div className="report-card-title">Stock Report</div>
                      <div className="report-card-subtitle">Day-by-day consumption and closing stock</div>
                    </div>
                  </div>
                  <button
                    className="btn-report"
                    onClick={() => downloadReport('daily')}
                    disabled={loadingDaily}
                  >
                    <Download size={18} />
                    {loadingDaily ? 'Generating...' : 'Download Excel'}
                  </button>
                </div>

                <div className="report-card">
                  <div className="report-card-header">
                    <span className="report-card-icon">
                      <Activity size={22} />
                    </span>
                    <div>
                      <div className="report-card-title">Activity Logs</div>
                      <div className="report-card-subtitle">Individual transaction history</div>
                    </div>
                  </div>
                  <button
                    className="btn-report"
                    onClick={() => downloadReport('activities')}
                    disabled={loadingActivity}
                  >
                    <Download size={18} />
                    {loadingActivity ? 'Generating...' : 'Download Excel'}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </div>


      {/* Modal for New Item Type */}
      <AnimatePresence>
        {showTypeModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card modal-content"
            >
              <div className="modal-header">
                <h3>Add New Item Category</h3>
                <button onClick={() => setShowTypeModal(false)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateItemType} className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Category Name (e.g. Bolts)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  required
                />
                <textarea
                  className="input-field"
                  placeholder="Optional description..."
                  value={newTypeDesc}
                  onChange={(e) => setNewTypeDesc(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
                  <Save size={18} />
                  Save Category
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for Edit Item */}
      <AnimatePresence>
        {showEditModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card modal-content"
              style={{ maxWidth: '500px' }}
            >
              <div className="modal-header">
                <h3>Edit Item Details</h3>
                <button onClick={() => setShowEditModal(false)} className="close-btn">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="modal-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="input-label">Item Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Tag ID</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.TagId}
                    onChange={(e) => setEditFormData({ ...editFormData, TagId: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Category</label>
                  <select
                    className="input-field"
                    value={editFormData.itemType}
                    onChange={(e) => setEditFormData({ ...editFormData, itemType: e.target.value })}
                    required
                  >
                    {itemTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">UOM (Unit of Measurement)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.uom}
                    onChange={(e) => setEditFormData({ ...editFormData, uom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="input-label">Current Stock</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editFormData.totalQuantity}
                    onChange={(e) => setEditFormData({ ...editFormData, totalQuantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '1rem' }}>
                  <Save size={18} />
                  Update Item
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default AdminDashboard;
