import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import DiyaDecoration from '../../components/DiyaDecoration';
import { generateBillPDF, downloadPDFBlob } from '../../utils/pdfGenerator';
import {
  Database,
  UserPlus,
  LogOut,
  Edit,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Search,
  X,
  Sparkles,
  FileText,
  Download,
  Eye,
  MessageCircle,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Check,
  Layers
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'confirmed_bill' | 'add_admin'
  const [catalog, setCatalog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'GANESHA' | 'GOWRI'

  // Admin Account Form
  const [newAdmin, setNewAdmin] = useState({ name: '', mobile: '', password: '' });
  
  // Catalog Item Form (Name, Category, Price, Images)
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    category: 'GANESHA',
    price: '',
    images: []
  });
  const [editingCatalogId, setEditingCatalogId] = useState(null);
  const [catalogLightbox, setCatalogLightbox] = useState(null); // { item, index }

  // Admin Confirmed Bill Generator States
  const [billQuantities, setBillQuantities] = useState({});
  const [billAdvance, setBillAdvance] = useState(0);
  const [billCustomer, setBillCustomer] = useState({
    name: '',
    mobile: '',
    address: ''
  });
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBillData, setPreviewBillData] = useState(null);

  // In-App Confirm Dialog Modal
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Database Connection Live Status State
  const [dbStatus, setDbStatus] = useState({ connected: false, text: 'Checking...', count: 0 });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Helper to update state only when content actually changes
  const setIfChanged = (setter, newVal) => {
    setter(prev => JSON.stringify(prev) === JSON.stringify(newVal) ? prev : newVal);
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'undefined' || token === 'null') return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [catalogRes, healthRes] = await Promise.all([
        fetch('/api/admin/catalog', { headers }),
        fetch('/api/health').catch(() => null)
      ]);
      
      if (catalogRes.ok) {
        const newCatalog = await catalogRes.json();
        setIfChanged(setCatalog, newCatalog);
      }
      
      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        setDbStatus({
          connected: healthData.mongoConnected || false,
          text: healthData.database || 'Connected',
          count: healthData.counts?.catalog || 0
        });
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/login/admin');
      return;
    }

    fetchAllData();
    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  // --- CATALOG MANAGEMENT ---
  const handleCatalogSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const url = editingCatalogId ? `/api/admin/catalog/${editingCatalogId}` : '/api/admin/catalog';
    const method = editingCatalogId ? 'PUT' : 'POST';

    try {
      const itemPrice = Number(catalogForm.price);
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: catalogForm.name.trim(),
          category: catalogForm.category || 'GANESHA',
          price: itemPrice,
          wholesalePrice: itemPrice,
          retailPrice: itemPrice,
          images: catalogForm.images
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(editingCatalogId ? 'Item updated successfully!' : 'Item created successfully!');
      setCatalogForm({ name: '', category: 'GANESHA', price: '', images: [] });
      setEditingCatalogId(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Error processing catalog item');
    }
  };

  const startEditCatalog = (item) => {
    setEditingCatalogId(item.id);
    setCatalogForm({
      name: item.name,
      category: item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA'),
      price: item.price !== undefined ? item.price : (item.wholesalePrice || item.retailPrice || ''),
      images: item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : [])
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditCatalog = () => {
    setEditingCatalogId(null);
    setCatalogForm({ name: '', category: 'GANESHA', price: '', images: [] });
  };

  const deleteCatalogItem = (id, name = '') => {
    setConfirmDialog({
      title: '⚠️ Delete Item Model',
      message: `Are you sure you want to permanently delete "${name || 'this item'}" from the catalog?`,
      confirmText: 'Delete Completely',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        setSuccess('');

        setCatalog(prev => prev.filter(c => c.id !== id));

        try {
          const response = await fetch(`/api/admin/catalog/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);

          setSuccess('Item permanently deleted from database.');
          fetchAllData();
        } catch (err) {
          setError(err.message || 'Failed to delete catalog item');
          fetchAllData();
        }
      }
    });
  };

  // --- ADMIN CONFIRMED BILL GENERATOR METHODS ---
  const adjustBillQuantity = (itemId, delta) => {
    const current = billQuantities[itemId] || 0;
    const newQty = Math.max(0, current + delta);
    setBillQuantities(prev => ({ ...prev, [itemId]: newQty }));
  };

  const removeBillItem = (itemId) => {
    setBillQuantities(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const clearConfirmedBill = () => {
    setBillQuantities({});
    setBillAdvance(0);
    setBillCustomer({ name: '', mobile: '', address: '' });
    setSuccess('Bill reset successfully.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getConfirmedBillSummary = () => {
    const selectedItems = [];
    let grandTotal = 0;
    let totalUnits = 0;

    catalog.forEach(item => {
      const qty = billQuantities[item.id] || 0;
      if (qty > 0) {
        const rate = Number(item.price || item.wholesalePrice || item.retailPrice || 0);
        const lineTotal = rate * qty;
        grandTotal += lineTotal;
        totalUnits += qty;
        selectedItems.push({
          itemId: item.id,
          name: item.name,
          category: item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA'),
          rate,
          quantity: qty,
          lineTotal
        });
      }
    });

    const advance = Math.min(grandTotal, Math.max(0, Number(billAdvance) || 0));
    const balanceDue = Math.max(0, grandTotal - advance);

    return {
      items: selectedItems,
      totalUnits,
      grandTotal,
      advancePayment: advance,
      balanceDue
    };
  };

  const confirmedSummary = getConfirmedBillSummary();

  const buildConfirmedBillObject = () => {
    const billId = `GK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    return {
      id: billId,
      customerDetails: {
        name: billCustomer.name.trim() || 'Valued Customer',
        mobile: billCustomer.mobile.trim() || 'N/A',
        address: billCustomer.address.trim() || 'Bangalore',
        email: ''
      },
      items: confirmedSummary.items,
      grandTotal: confirmedSummary.grandTotal,
      advancePayment: confirmedSummary.advancePayment,
      balanceDue: confirmedSummary.balanceDue,
      createdAt: new Date().toISOString()
    };
  };

  // Preview Confirmed Bill
  const handlePreviewConfirmedBill = () => {
    setError('');
    if (confirmedSummary.items.length === 0) {
      setError('Please select at least one item to generate a bill.');
      return;
    }
    const data = buildConfirmedBillObject();
    setPreviewBillData(data);
    setIsPreviewOpen(true);
  };

  // Download Confirmed Bill (PDF) - Official original bill
  const handleDownloadConfirmedPDF = () => {
    setError('');
    if (confirmedSummary.items.length === 0) {
      setError('Please select at least one item to generate a bill.');
      return;
    }
    try {
      const billData = previewBillData || buildConfirmedBillObject();
      // Generate official bill with 'G.kamal ganesha works' watermark and isChecking = false
      const doc = generateBillPDF(billData, 'G.kamal ganesha works', false);
      const safeName = (billData.customerDetails?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      downloadPDFBlob(doc, `Confirmed_Ganesha_Bill_${safeName}_${billData.id}.pdf`);
      setSuccess(`Confirmed Bill PDF #${billData.id} downloaded successfully!`);
      setTimeout(() => setSuccess(''), 4000);
      setIsPreviewOpen(false);
    } catch (err) {
      console.error('Error generating confirmed bill:', err);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  // Share Confirmed Bill via WhatsApp
  const handleShareConfirmedWhatsApp = (targetRecipient = 'customer') => {
    setError('');
    if (confirmedSummary.items.length === 0) {
      setError('Please select at least one item to generate and share a bill.');
      return;
    }

    const billData = previewBillData || buildConfirmedBillObject();
    
    // Determine recipient phone number
    let targetPhone = '918792044625';
    if (targetRecipient === 'customer' && billCustomer.mobile) {
      const cleanMob = billCustomer.mobile.replace(/\D/g, '').slice(-10);
      if (cleanMob.length === 10) {
        targetPhone = `91${cleanMob}`;
      }
    }

    const itemsList = billData.items.map((it, idx) => 
      `${idx + 1}. *${it.name}* - Qty: ${it.quantity} @ Rs.${it.rate.toLocaleString('en-IN')} = *Rs.${it.lineTotal.toLocaleString('en-IN')}*`
    ).join('\n');

    const text = 
`🙏 *G.KAMAL GANESHA WORKS*
*OFFICIAL CONFIRMED BILL & RECEIPT*
_Eco-Friendly Clay Idols • Thanisandra, Bangalore_
----------------------------------
📋 *ORDER INVOICE:* #${billData.id}
📅 *Date:* ${new Date().toLocaleDateString('en-IN')}

👤 *CUSTOMER DETAILS:*
• *Name:* ${billData.customerDetails.name}
• *Mobile:* ${billData.customerDetails.mobile}
• *Address:* ${billData.customerDetails.address}

📦 *ITEMS ORDERED:*
${itemsList}

💰 *PAYMENT SUMMARY:*
• *Total Units:* ${confirmedSummary.totalUnits} Units
• *Grand Total:* Rs.${billData.grandTotal.toLocaleString('en-IN')}
• *Advance Received:* Rs.${billData.advancePayment.toLocaleString('en-IN')}
• *Balance Due:* Rs.${billData.balanceDue.toLocaleString('en-IN')}

📍 *Workshop:* Thanisandra Main Road, Vidyasagar, Bangalore - 560077
📞 *Contact:* 9739142445 / 8792044625
----------------------------------
_Thank you for choosing eco-friendly clay idols!_`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filter Catalog
  const filteredCatalog = catalog.filter(item => {
    const itemCat = item.category ? item.category.toUpperCase() : (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA');
    if (selectedCategory !== 'ALL' && itemCat !== selectedCategory) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name && item.name.toLowerCase().includes(q);
  });

  const filteredBillCatalog = catalog.filter(item => {
    if (!billSearchQuery.trim()) return true;
    const q = billSearchQuery.toLowerCase();
    return item.name && item.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Header Dashboard Banner */}
        <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <DiyaDecoration className="w-12 h-12 animate-float" />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-cinzel text-xl sm:text-2xl font-extrabold text-gold-gradient tracking-wide uppercase">
                  Admin Control Center
                </h2>
                <span className="badge-gold text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  Management Console
                </span>
              </div>
              <p className="text-xs text-[#cbd5e1] mt-1">
                Manage official 2026 price list models, generate confirmed bills, and manage administrators.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Database Live Sync Status Badge */}
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                dbStatus.connected 
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                  : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
              }`}
              title="Real-time Database Connection Status"
            >
              <Database size={14} className={dbStatus.connected ? 'text-emerald-400' : 'text-amber-400'} />
              <span>{dbStatus.connected ? 'Atlas Synced' : 'Local Synced'} ({dbStatus.count} models)</span>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                navigate('/login/admin');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-200 text-xs font-bold transition-all shadow-md"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/80 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#ffd700]/25 mb-8 gap-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
              activeTab === 'catalog'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#cbd5e1] hover:text-white'
            }`}
          >
            <ShoppingBag size={16} />
            <span>✦ Catalog Models ({catalog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('confirmed_bill')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
              activeTab === 'confirmed_bill'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#cbd5e1] hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span>✦ Generate Confirmed Bill {confirmedSummary.totalUnits > 0 ? `(${confirmedSummary.totalUnits})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('add_admin')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
              activeTab === 'add_admin'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#cbd5e1] hover:text-white'
            }`}
          >
            <UserPlus size={16} />
            <span>✦ Add Admin Account</span>
          </button>
        </div>

        {/* TAB 1: CATALOG MANAGEMENT */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/25 shadow-2xl">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#ffd700]/15 pb-4 mb-6 gap-4">
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-gold-gradient tracking-wide">
                    {editingCatalogId ? 'Edit Item Model' : 'Official Price List Models'}
                  </h3>
                  <p className="text-xs text-[#cbd5e1] mt-0.5">
                    Add new idol models, edit rates, and manage high-resolution photos.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-grow sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ffd700]/60" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search model name..."
                      className="w-full pl-9 pr-3 py-1.5 input-glass text-xs"
                    />
                  </div>
                  <button
                    onClick={fetchAllData}
                    className="btn-outline-gold p-2 text-xs"
                    title="Refresh data"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2.5 mb-6">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3.5 py-1 rounded-xl text-xs font-cinzel font-bold transition-all ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#ffd700] text-[#1a0003] shadow-md'
                      : 'bg-white/5 border border-[#ffd700]/20 text-[#cbd5e1] hover:text-white'
                  }`}
                >
                  ALL ({catalog.length})
                </button>
                <button
                  onClick={() => setSelectedCategory('GANESHA')}
                  className={`px-3.5 py-1 rounded-xl text-xs font-cinzel font-bold transition-all ${
                    selectedCategory === 'GANESHA'
                      ? 'bg-[#ffd700] text-[#1a0003] shadow-md'
                      : 'bg-white/5 border border-[#ffd700]/20 text-[#cbd5e1] hover:text-white'
                  }`}
                >
                  GANESHA ({catalog.filter(i => (i.category ? i.category.toUpperCase() === 'GANESHA' : !i.name.toLowerCase().includes('gowri'))).length})
                </button>
                <button
                  onClick={() => setSelectedCategory('GOWRI')}
                  className={`px-3.5 py-1 rounded-xl text-xs font-cinzel font-bold transition-all ${
                    selectedCategory === 'GOWRI'
                      ? 'bg-[#ffd700] text-[#1a0003] shadow-md'
                      : 'bg-white/5 border border-[#ffd700]/20 text-[#cbd5e1] hover:text-white'
                  }`}
                >
                  GOWRI ({catalog.filter(i => (i.category ? i.category.toUpperCase() === 'GOWRI' : i.name.toLowerCase().includes('gowri'))).length})
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Add / Edit Form (1 col) */}
                <div className="glass-panel p-6 border border-[#ffd700]/30 rounded-2xl h-fit">
                  <h4 className="font-cinzel font-bold text-sm text-[#ffd700] mb-4 flex items-center gap-2">
                    <Edit size={16} className="text-[#ff6a00]" />
                    <span>{editingCatalogId ? 'Edit Model Details' : 'Add New Item Model'}</span>
                  </h4>

                  <form onSubmit={handleCatalogSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={catalogForm.name}
                        onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                        placeholder="e.g. DARBAR, 1.5 FEET, 1.5 FEET GOWRI"
                        className="w-full px-3 py-2 input-glass text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Category *
                      </label>
                      <select
                        value={catalogForm.category}
                        onChange={(e) => setCatalogForm({ ...catalogForm, category: e.target.value })}
                        className="w-full px-3 py-2 input-glass text-xs bg-[#1a0003] text-[#ffd700] font-semibold"
                      >
                        <option value="GANESHA">GANESHA</option>
                        <option value="GOWRI">GOWRI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={catalogForm.price}
                        onChange={(e) => setCatalogForm({ ...catalogForm, price: e.target.value })}
                        placeholder="Rate in ₹"
                        className="w-full px-3 py-2 input-glass text-xs font-bold text-[#ffd700]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Photos (Multiple Optional)
                      </label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          if (files.length > 0) {
                            const newImages = [];
                            let loaded = 0;
                            files.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                newImages.push(reader.result);
                                loaded++;
                                if (loaded === files.length) {
                                  setCatalogForm(prev => ({
                                    ...prev,
                                    images: [...prev.images, ...newImages]
                                  }));
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                        className="w-full text-xs text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#ffd700]/20 file:text-[#ffd700] hover:file:bg-[#ffd700]/30"
                      />
                    </div>

                    {/* Image Thumbnails preview with delete */}
                    {catalogForm.images && catalogForm.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {catalogForm.images.map((img, idx) => (
                          <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#ffd700]/40 group">
                            <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setCatalogForm(prev => ({
                                  ...prev,
                                  images: prev.images.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="absolute inset-0 bg-red-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove photo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      {editingCatalogId && (
                        <button
                          type="button"
                          onClick={cancelEditCatalog}
                          className="flex-1 py-2.5 btn-outline-gold text-xs font-bold"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2.5 btn-gold text-xs font-bold uppercase tracking-wider shadow-lg"
                      >
                        {editingCatalogId ? 'Save Changes' : '+ Add Model'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Idols Grid List (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center text-xs text-[#cbd5e1] font-semibold">
                    <span>Total Models: {filteredCatalog.length}</span>
                  </div>

                  {filteredCatalog.length === 0 ? (
                    <div className="text-center py-12 text-[#cbd5e1] glass-panel border border-[#ffd700]/15 rounded-2xl">
                      <p className="font-cinzel text-base text-[#ffd700] mb-1">No Items Found</p>
                      <p className="text-xs">Add your first model using the form on the left.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredCatalog.map(item => {
                        const itemImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
                        const rate = Number(item.price || item.wholesalePrice || item.retailPrice || 0);
                        const itemCat = item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA');

                        return (
                          <div 
                            key={item.id}
                            className="glass-panel border border-[#ffd700]/25 rounded-xl p-4 flex flex-col justify-between hover:border-[#ffd700]/60 transition-all shadow-md"
                          >
                            <div className="flex gap-3">
                              {/* Idol image preview */}
                              <div 
                                onClick={() => itemImages.length > 0 && setCatalogLightbox({ item, index: 0 })}
                                className="w-20 h-20 rounded-lg overflow-hidden bg-black/50 border border-[#ffd700]/30 shrink-0 cursor-pointer relative group"
                              >
                                {itemImages.length > 0 ? (
                                  <>
                                    <img src={itemImages[0]} alt={item.name} className="w-full h-full object-cover" />
                                    {itemImages.length > 1 && (
                                      <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-[#ffd700] px-1 rounded font-bold">
                                        +{itemImages.length - 1}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-gray-400 font-bold p-1 text-center">
                                    <DiyaDecoration className="w-6 h-6 opacity-70 mb-0.5" />
                                    <span>{itemCat}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex-grow min-w-0">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-block mb-1 ${
                                  itemCat === 'GANESHA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {itemCat} #{item.slNo || ''}
                                </span>
                                <h5 className="font-cinzel font-bold text-sm text-[#ffd700] truncate">
                                  {item.name}
                                </h5>
                                <div className="mt-2 text-sm font-bold text-gold-gradient font-cinzel">
                                  Price: ₹{rate.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-[#ffd700]/15 pt-3 mt-3">
                              <button
                                onClick={() => startEditCatalog(item)}
                                className="px-3 py-1.5 rounded-lg bg-[#ffd700]/15 hover:bg-[#ffd700]/25 text-[#ffd700] text-xs font-bold flex items-center gap-1"
                                title="Edit Model"
                              >
                                <Edit size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => deleteCatalogItem(item.id, item.name)}
                                className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1"
                                title="Delete Model"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIRMED BILL GENERATOR */}
        {activeTab === 'confirmed_bill' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/25 shadow-2xl space-y-6">
              
              <div className="border-b border-[#ffd700]/15 pb-4">
                <h3 className="font-cinzel text-lg font-bold text-gold-gradient tracking-wide">
                  Generate Confirmed Order Bill (Official Tax/Invoice Receipt)
                </h3>
                <p className="text-xs text-[#cbd5e1] mt-0.5">
                  Generate finalized official bills with custom customer details, advance tracking, and instant WhatsApp delivery.
                </p>
              </div>

              {/* Customer Inputs */}
              <div className="glass-panel p-5 border border-[#ffd700]/25 rounded-2xl">
                <h4 className="font-cinzel font-bold text-xs uppercase tracking-wider text-[#ffd700] mb-3 flex items-center gap-1.5">
                  <User size={14} className="text-[#ff6a00]" />
                  <span>Customer / Billed To Details</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                      Customer / Mandali Name *
                    </label>
                    <input
                      type="text"
                      value={billCustomer.name}
                      onChange={(e) => setBillCustomer({ ...billCustomer, name: e.target.value })}
                      placeholder="Enter Name"
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={billCustomer.mobile}
                      onChange={(e) => setBillCustomer({ ...billCustomer, mobile: e.target.value })}
                      placeholder="Enter Mobile Number for WhatsApp"
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                      Delivery / Residence Address
                    </label>
                    <input
                      type="text"
                      value={billCustomer.address}
                      onChange={(e) => setBillCustomer({ ...billCustomer, address: e.target.value })}
                      placeholder="Enter Delivery Address / Area"
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Idol Selection & Bill Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Quick Idol Picker from Catalog (5 cols) */}
                <div className="lg:col-span-5 glass-panel p-5 border border-[#ffd700]/25 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-cinzel font-bold text-xs uppercase tracking-wider text-[#ffd700]">
                        Select Items from Catalog
                      </h4>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase">
                        Official rates
                      </span>
                    </div>

                    <div className="relative mb-3">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ffd700]/60" />
                      <input
                        type="text"
                        value={billSearchQuery}
                        onChange={(e) => setBillSearchQuery(e.target.value)}
                        placeholder="Search item..."
                        className="w-full pl-8 pr-3 py-1.5 input-glass text-xs"
                      />
                    </div>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {filteredBillCatalog.map(item => {
                        const rate = Number(item.price || item.wholesalePrice || item.retailPrice || 0);
                        const qty = billQuantities[item.id] || 0;
                        const itemCat = item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA');

                        return (
                          <div 
                            key={item.id} 
                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                              qty > 0 ? 'bg-[#ffd700]/10 border-[#ffd700]/60' : 'bg-black/30 border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <h6 className="font-cinzel font-bold text-xs text-[#ffd700] truncate">
                                {item.name}
                              </h6>
                              <span className="text-[10px] text-gray-300">
                                {itemCat} • <strong className="text-white">₹{rate.toLocaleString('en-IN')}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {qty === 0 ? (
                                <button
                                  onClick={() => adjustBillQuantity(item.id, 1)}
                                  className="px-2.5 py-1 rounded-lg btn-outline-gold text-[11px] font-bold"
                                >
                                  + Add
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 bg-black/60 rounded-lg p-0.5 border border-[#ffd700]/30">
                                  <button
                                    onClick={() => adjustBillQuantity(item.id, -1)}
                                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-[#ffd700] flex items-center justify-center font-bold text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center font-bold text-xs text-[#ffd700]">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => adjustBillQuantity(item.id, 1)}
                                    className="w-5 h-5 rounded bg-[#ffd700] text-black flex items-center justify-center font-bold text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Bill Items Table & Financials (7 cols) */}
                <div className="lg:col-span-7 glass-panel p-5 border border-[#ffd700]/25 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center pb-3 border-b border-[#ffd700]/15 mb-3">
                      <h4 className="font-cinzel font-bold text-xs uppercase tracking-wider text-[#ffd700]">
                        Confirmed Bill Line Items ({confirmedSummary.items.length})
                      </h4>
                      {confirmedSummary.items.length > 0 && (
                        <button
                          onClick={clearConfirmedBill}
                          className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    {confirmedSummary.items.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 text-xs">
                        No items selected yet. Add models from the catalog list on the left.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[220px] overflow-y-auto mb-4">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#ffd700]/15 text-[#ffd700] font-cinzel text-[10px] uppercase">
                              <th className="py-1.5">Item Name</th>
                              <th className="py-1.5 text-right">Price</th>
                              <th className="py-1.5 text-center">Qty</th>
                              <th className="py-1.5 text-right">Total</th>
                              <th className="py-1.5 text-center">✕</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {confirmedSummary.items.map(it => (
                              <tr key={it.itemId}>
                                <td className="py-2 text-white font-medium">
                                  {it.name}
                                </td>
                                <td className="py-2 text-right text-gray-300">₹{it.rate.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-center text-[#ffd700] font-bold">{it.quantity}</td>
                                <td className="py-2 text-right font-bold text-gold-gradient">₹{it.lineTotal.toLocaleString('en-IN')}</td>
                                <td className="py-2 text-center">
                                  <button
                                    onClick={() => removeBillItem(it.itemId)}
                                    className="text-red-400 hover:text-red-300 p-0.5"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Financial Calculations & Actions */}
                  {confirmedSummary.items.length > 0 && (
                    <div className="border-t border-[#ffd700]/15 pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">
                            Advance Paid (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={confirmedSummary.grandTotal}
                            value={billAdvance}
                            onChange={(e) => setBillAdvance(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-2.5 py-1.5 input-glass text-xs font-bold text-[#ffd700]"
                            placeholder="Advance received"
                          />
                        </div>
                        
                        <div className="bg-black/40 p-2.5 rounded-xl border border-[#ffd700]/20 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Grand Total:</span>
                            <strong className="text-[#ffd700]">₹{confirmedSummary.grandTotal.toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Advance:</span>
                            <strong className="text-emerald-400">₹{confirmedSummary.advancePayment.toLocaleString('en-IN')}</strong>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                            <span className="text-red-300">Balance Due:</span>
                            <strong className="text-red-400 font-cinzel">₹{confirmedSummary.balanceDue.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={handlePreviewConfirmedBill}
                          className="btn-outline-gold py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          <Eye size={14} />
                          <span>Preview</span>
                        </button>
                        
                        <button
                          onClick={handleDownloadConfirmedPDF}
                          className="btn-gold py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
                        >
                          <Download size={14} />
                          <span>Download PDF</span>
                        </button>
                      </div>

                      {/* Direct WhatsApp Share Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          onClick={() => handleShareConfirmedWhatsApp('customer')}
                          className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-black font-black py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl transition-transform hover:scale-102"
                          title="Send bill directly to customer's mobile number via WhatsApp"
                        >
                          <MessageCircle size={16} />
                          <span>Send to Customer WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleShareConfirmedWhatsApp('store')}
                          className="bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 font-bold py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                          title="Send bill copy to store number 8792044625"
                        >
                          <MessageCircle size={14} />
                          <span>Share (8792044625)</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADD ADMIN */}
        {activeTab === 'add_admin' && (
          <div className="max-w-md mx-auto">
            <div className="glass-panel p-8 border border-[#ffd700]/30 rounded-2xl shadow-2xl">
              <h3 className="font-cinzel text-lg font-bold text-gold-gradient tracking-wide mb-2 text-center">
                Create New Admin Account
              </h3>
              <p className="text-xs text-[#cbd5e1] mb-6 text-center">
                Add an authorized admin user with full access to this management dashboard.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError('');
                  setSuccess('');
                  setLoading(true);
                  try {
                    const response = await fetch('/api/admin/create-admin', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                      },
                      body: JSON.stringify(newAdmin)
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);

                    setSuccess(`Admin account for "${newAdmin.name}" created successfully!`);
                    setNewAdmin({ name: '', mobile: '', password: '' });
                  } catch (err) {
                    setError(err.message || 'Error creating admin account');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#ffebc2] mb-1 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdmin.name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full input-glass p-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ffebc2] mb-1 uppercase tracking-wider">
                    10-Digit Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newAdmin.mobile}
                    onChange={(e) => setNewAdmin({ ...newAdmin, mobile: e.target.value })}
                    placeholder="Enter mobile number"
                    className="w-full input-glass p-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ffebc2] mb-1 uppercase tracking-wider">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full input-glass p-3 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gold py-3 text-xs font-bold uppercase tracking-wider shadow-xl hover:scale-102 transition-transform disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : '+ Create Administrator'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* CONFIRMED BILL PREVIEW MODAL */}
      {isPreviewOpen && previewBillData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel border-2 border-[#ffd700]/60 max-w-2xl w-full p-6 sm:p-8 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
            
            <div className="flex justify-between items-start border-b border-[#ffd700]/30 pb-4 mb-5">
              <div>
                <h3 className="font-cinzel text-lg font-extrabold text-gold-gradient">
                  ✦ Confirmed Bill Preview ✦
                </h3>
                <p className="text-[11px] text-[#cbd5e1]">
                  Official Tax / Delivery Invoice • G.Kamal Ganesha Works
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl border border-[#ffd700]/20 mb-5 text-xs">
              <div>
                <span className="block font-bold text-[#ffd700] uppercase text-[10px]">Billed To:</span>
                <p className="font-semibold text-white mt-0.5">{previewBillData.customerDetails.name}</p>
                <p className="text-gray-300">📞 {previewBillData.customerDetails.mobile}</p>
                <p className="text-gray-300">📍 {previewBillData.customerDetails.address}</p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-[#ffd700] uppercase text-[10px]">Reference:</span>
                <p className="font-mono text-white mt-0.5">{previewBillData.id}</p>
                <p className="text-gray-300">Date: {new Date().toLocaleDateString('en-IN')}</p>
                <p className="text-emerald-400 font-bold uppercase">Official Bill</p>
              </div>
            </div>

            <div className="overflow-x-auto mb-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#ffd700]/20 text-[#ffd700] font-cinzel text-[10px] uppercase">
                    <th className="py-2 px-2">Item Name</th>
                    <th className="py-2 px-2 text-right">Price</th>
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {previewBillData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 text-white font-medium">{it.name}</td>
                      <td className="py-2 px-2 text-right text-gray-300">₹{it.rate.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2 text-center text-[#ffd700] font-bold">{it.quantity}</td>
                      <td className="py-2 px-2 text-right text-gold-gradient font-bold">₹{it.lineTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-black/60 p-4 rounded-xl border border-[#ffd700]/30 space-y-1.5 text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-gray-300">Grand Total:</span>
                <span className="font-bold text-white">₹{previewBillData.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Advance Paid:</span>
                <span className="font-bold text-emerald-400">₹{previewBillData.advancePayment.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-1.5">
                <span className="text-red-300">Balance Due:</span>
                <span className="text-red-400 font-cinzel font-black">₹{previewBillData.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="btn-outline-gold px-4 py-2 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => handleShareConfirmedWhatsApp('customer')}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold px-4 py-2 text-xs flex items-center gap-1.5 rounded-xl shadow-lg"
              >
                <MessageCircle size={15} />
                <span>Send to Customer WhatsApp</span>
              </button>
              <button
                onClick={handleDownloadConfirmedPDF}
                className="btn-gold px-5 py-2 text-xs flex items-center gap-1.5 font-bold shadow-xl"
              >
                <Download size={14} />
                <span>Download Confirmed PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-2 border-[#ffd700]/60 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center space-y-4">
            <h4 className="font-cinzel text-base font-bold text-[#ffd700]">
              {confirmDialog.title}
            </h4>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-outline-gold px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg"
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {catalogLightbox && (
        <div 
          onClick={() => setCatalogLightbox(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] flex flex-col items-center glass-panel border border-[#ffd700]/40 p-4 rounded-2xl"
          >
            <button
              onClick={() => setCatalogLightbox(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 text-lg font-bold"
            >
              ✕
            </button>
            <h4 className="font-cinzel text-sm font-bold text-[#ffd700] mb-3">
              {catalogLightbox.item.name}
            </h4>
            <div className="relative flex items-center justify-center">
              <img
                src={(catalogLightbox.item.images || [catalogLightbox.item.image])[catalogLightbox.index]}
                alt="Idol View"
                className="max-h-[65vh] object-contain rounded-lg"
              />
              {(catalogLightbox.item.images || []).length > 1 && (
                <>
                  <button
                    onClick={() => {
                      const total = catalogLightbox.item.images.length;
                      setCatalogLightbox(prev => ({
                        ...prev,
                        index: (prev.index - 1 + total) % total
                      }));
                    }}
                    className="absolute left-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => {
                      const total = catalogLightbox.item.images.length;
                      setCatalogLightbox(prev => ({
                        ...prev,
                        index: (prev.index + 1) % total
                      }));
                    }}
                    className="absolute right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;
