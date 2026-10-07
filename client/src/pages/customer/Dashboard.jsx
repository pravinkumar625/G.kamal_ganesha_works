import React, { useState, useEffect } from 'react';
import DiyaDecoration from '../../components/DiyaDecoration';
import Footer from '../../components/Footer';
import { 
  ShoppingBag, 
  FileText, 
  Download, 
  User, 
  Plus, 
  Minus, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Sparkles,
  Phone,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  ArrowRight,
  Printer,
  MessageCircle,
  Layers,
  LayoutGrid,
  List,
  Edit3,
  PlusCircle
} from 'lucide-react';
import { generateBillPDF, downloadPDFBlob } from '../../utils/pdfGenerator';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'builder'
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'GANESHA' | 'GOWRI'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Selected quantities: { [itemId]: quantity }
  const [orderQuantities, setOrderQuantities] = useState({});
  // Custom manual price overrides: { [itemId]: customRate }
  const [customRates, setCustomRates] = useState({});
  // Custom manual items added directly by user: [ { id, name, rate, quantity } ]
  const [manualCustomItems, setManualCustomItems] = useState([]);
  // Form state for adding manual custom item
  const [showManualItemForm, setShowManualItemForm] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({ name: '', rate: '', quantity: 1 });

  const [advancePayment, setAdvancePayment] = useState(0);

  // Customer bill recipient details (for bill printing)
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    mobile: '',
    address: ''
  });

  // Image carousels active indexes
  const [activePhotoIndexes, setActivePhotoIndexes] = useState({});

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBillData, setPreviewBillData] = useState(null);

  // Load catalog on mount
  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/catalog');
      if (response.ok) {
        const data = await response.json();
        setCatalog(data || []);
      } else {
        const fallbackRes = await fetch('/api/customer/catalog');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setCatalog(fallbackData || []);
        }
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
      setError('Unable to load catalog. Please ensure internet connectivity.');
    } finally {
      setLoading(false);
    }
  };

  // Quantity handlers (Supports manual typing and button increments)
  const handleQuantityChange = (itemId, val) => {
    if (val === '' || val === null || val === undefined) {
      setOrderQuantities(prev => ({ ...prev, [itemId]: 0 }));
      return;
    }
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setOrderQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const adjustQuantity = (itemId, delta) => {
    const current = orderQuantities[itemId] || 0;
    const newQty = Math.max(0, current + delta);
    setOrderQuantities(prev => ({ ...prev, [itemId]: newQty }));
  };

  const handleRateChange = (itemId, val) => {
    const newRate = Math.max(0, parseFloat(val) || 0);
    setCustomRates(prev => ({ ...prev, [itemId]: newRate }));
  };

  const removeItem = (itemId) => {
    setOrderQuantities(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
    setManualCustomItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Manual Custom Item Handlers
  const handleAddManualItem = (e) => {
    e.preventDefault();
    if (!manualItemForm.name.trim()) {
      setError('Please enter an item name');
      return;
    }
    const rate = Math.max(0, parseFloat(manualItemForm.rate) || 0);
    const qty = Math.max(1, parseInt(manualItemForm.quantity, 10) || 1);

    const newItem = {
      id: `manual-${Date.now()}`,
      name: manualItemForm.name.trim(),
      category: 'CUSTOM',
      rate,
      quantity: qty,
      isManual: true
    };

    setManualCustomItems(prev => [...prev, newItem]);
    setManualItemForm({ name: '', rate: '', quantity: 1 });
    setShowManualItemForm(false);
    setSuccess(`Custom item "${newItem.name}" added to bill!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleManualItemQtyChange = (id, val) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    setManualCustomItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const handleManualItemRateChange = (id, val) => {
    const rate = Math.max(0, parseFloat(val) || 0);
    setManualCustomItems(prev => prev.map(item => item.id === id ? { ...item, rate } : item));
  };

  const handleManualItemNameChange = (id, val) => {
    setManualCustomItems(prev => prev.map(item => item.id === id ? { ...item, name: val } : item));
  };

  const clearAllItems = () => {
    setOrderQuantities({});
    setCustomRates({});
    setManualCustomItems([]);
    setAdvancePayment(0);
    setSuccess('Bill items cleared.');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Photo carousel navigation
  const nextPhoto = (itemId, maxPhotos, e) => {
    e.stopPropagation();
    setActivePhotoIndexes(prev => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) + 1) % maxPhotos
    }));
  };

  const prevPhoto = (itemId, maxPhotos, e) => {
    e.stopPropagation();
    setActivePhotoIndexes(prev => ({
      ...prev,
      [itemId]: ((prev[itemId] || 0) - 1 + maxPhotos) % maxPhotos
    }));
  };

  // Calculate bill totals
  const getBillSummary = () => {
    const selectedItems = [];
    let grandTotal = 0;
    let totalUnits = 0;

    // Standard catalog items
    catalog.forEach(item => {
      const qty = orderQuantities[item.id] || 0;
      if (qty > 0) {
        const defaultRate = Number(item.price || item.wholesalePrice || item.retailPrice || 0);
        const rate = customRates[item.id] !== undefined ? customRates[item.id] : defaultRate;
        const lineTotal = rate * qty;
        grandTotal += lineTotal;
        totalUnits += qty;
        selectedItems.push({
          itemId: item.id,
          name: item.name,
          category: item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA'),
          rate,
          quantity: qty,
          lineTotal,
          isManual: false
        });
      }
    });

    // Custom manually added items
    manualCustomItems.forEach(item => {
      if (item.quantity > 0) {
        const lineTotal = item.rate * item.quantity;
        grandTotal += lineTotal;
        totalUnits += item.quantity;
        selectedItems.push({
          itemId: item.id,
          name: item.name,
          category: item.category || 'CUSTOM',
          rate: item.rate,
          quantity: item.quantity,
          lineTotal,
          isManual: true
        });
      }
    });

    const advance = Math.min(grandTotal, Math.max(0, Number(advancePayment) || 0));
    const balanceDue = Math.max(0, grandTotal - advance);

    return {
      items: selectedItems,
      totalUnits,
      grandTotal,
      advancePayment: advance,
      balanceDue
    };
  };

  const billSummary = getBillSummary();

  // Create Bill Object for PDF or Preview
  const buildBillObject = () => {
    const billId = `BILL-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      id: billId,
      customerDetails: {
        name: customerDetails.name.trim() || 'Valued Customer',
        mobile: customerDetails.mobile.trim() || 'N/A',
        address: customerDetails.address.trim() || 'Bangalore',
        email: ''
      },
      items: billSummary.items,
      grandTotal: billSummary.grandTotal,
      advancePayment: billSummary.advancePayment,
      balanceDue: billSummary.balanceDue,
      createdAt: new Date().toISOString()
    };
  };

  // Open Preview Modal
  const handlePreviewBill = () => {
    setError('');
    if (billSummary.items.length === 0) {
      setError('Please select or write at least one item to generate a bill.');
      return;
    }
    const billData = buildBillObject();
    setPreviewBillData(billData);
    setIsPreviewOpen(true);
  };

  // Instant Download Checking Bill PDF
  const handleDownloadCheckingBill = () => {
    setError('');
    if (billSummary.items.length === 0) {
      setError('Please select or write at least one item to generate a bill.');
      return;
    }
    try {
      const billData = previewBillData || buildBillObject();
      const doc = generateBillPDF(billData, 'CHECKING BILL', true);
      const safeName = (billData.customerDetails?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      downloadPDFBlob(doc, `Checking_Bill_${safeName}.pdf`);
      setSuccess('Checking Bill PDF downloaded successfully!');
      setTimeout(() => setSuccess(''), 4000);
      setIsPreviewOpen(false);
    } catch (err) {
      console.error('Error downloading bill:', err);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  // Direct WhatsApp Share to Store Number 8792044625
  const shareOnWhatsApp = (customBill = null) => {
    setError('');
    if (billSummary.items.length === 0) {
      setError('Please select or write at least one item to generate and share a bill.');
      return;
    }
    const data = customBill || previewBillData || buildBillObject();
    const phone = '918792044625';

    const itemsList = data.items.map((it, idx) => 
      `${idx + 1}. *${it.name}* - Qty: ${it.quantity} @ Rs.${it.rate.toLocaleString('en-IN')} = *Rs.${it.lineTotal.toLocaleString('en-IN')}*`
    ).join('\n');

    const text = 
`🙏 *G.KAMAL GANESHA WORKS*
_Eco-Friendly Clay Idols • Bangalore - 560077_
----------------------------------
📋 *CHECKING BILL / ESTIMATE*
🔢 *Bill Ref:* #${data.id}
📅 *Date:* ${new Date().toLocaleDateString('en-IN')}

👤 *CUSTOMER DETAILS:*
• *Name:* ${data.customerDetails.name}
• *Mobile:* ${data.customerDetails.mobile}
• *Address:* ${data.customerDetails.address}

📦 *SELECTED ITEMS:*
${itemsList}

💰 *FINANCIAL SUMMARY:*
• *Total Units:* ${billSummary.totalUnits} Units
• *Grand Total:* Rs.${data.grandTotal.toLocaleString('en-IN')}
• *Advance Paid:* Rs.${data.advancePayment.toLocaleString('en-IN')}
• *Balance Due:* Rs.${data.balanceDue.toLocaleString('en-IN')}

📍 *Store Location:* Thanisandra Main Road, Vidyasagar, Bangalore - 560077
📞 *Contact:* 9739142445 / 8792044625
----------------------------------
_Generated from G.Kamal Ganesha Works Official Portal_`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filter catalog items by Category & Search query
  const filteredCatalog = catalog.filter(item => {
    const itemCat = item.category ? item.category.toUpperCase() : (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA');
    
    if (selectedCategory !== 'ALL' && itemCat !== selectedCategory) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query))
    );
  });

  const ganeshaCount = catalog.filter(i => (i.category ? i.category.toUpperCase() === 'GANESHA' : !i.name.toLowerCase().includes('gowri'))).length;
  const gowriCount = catalog.filter(i => (i.category ? i.category.toUpperCase() === 'GOWRI' : i.name.toLowerCase().includes('gowri'))).length;

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      <main className="relative z-10 flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Banner */}
        <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="G.Kamal Ganesha Works" 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#ffd700] shadow-xl bg-black"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-cinzel text-xl sm:text-2xl font-extrabold text-gold-gradient tracking-wide uppercase">
                  G.Kamal Ganesha Works
                </h2>
                <span className="badge-gold text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  100% Eco-Friendly Clay Idols
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[#cbd5e1] font-medium">
                <span className="text-[#ffd700]">📍 Bangalore - 560077</span>
                <span className="hidden sm:inline">•</span>
                <span className="text-[#ffebc2]">📞 9739142445 / 8792044625</span>
                <span className="hidden sm:inline">•</span>
                <a
                  href="https://wa.me/918792044625?text=Hello%20G.Kamal%20Ganesha%20Works,%20I%20would%20like%20to%20enquire%20about%20Clay%20Ganesha%20Idols."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#25D366] hover:text-white bg-[#25D366]/15 hover:bg-[#25D366]/30 border border-[#25D366]/40 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all"
                  title="Direct WhatsApp chat to 8792044625"
                >
                  <MessageCircle size={12} className="text-[#25D366]" />
                  <span>WhatsApp: 8792044625</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#ffd700]/15 border border-[#ffd700]/40 px-4 py-2.5 rounded-xl text-xs font-cinzel font-bold text-[#ffd700] uppercase tracking-wider shadow-lg">
            <Sparkles size={15} className="text-[#ff6a00]" />
            <span>✦ Official 2026 Price List ✦</span>
          </div>
        </div>

        {/* Floating Quick Summary Bar if items selected */}
        {billSummary.totalUnits > 0 && (
          <div className="glass-panel p-4 mb-6 border-2 border-[#ffd700]/50 bg-[#2d0007]/80 flex flex-col sm:flex-row justify-between items-center gap-3 animate-fadeIn shadow-xl">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold text-[#ffebc2]">
                <strong className="text-[#ffd700] text-base">{billSummary.totalUnits}</strong> {billSummary.totalUnits === 1 ? 'item' : 'items'} selected
              </span>
              <span className="text-gray-400">|</span>
              <span className="font-bold text-base text-[#ffd700]">
                Grand Total: ₹{billSummary.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {activeTab !== 'builder' && (
                <button
                  onClick={() => setActiveTab('builder')}
                  className="btn-gold px-4 py-2 text-xs flex items-center gap-1.5 font-bold shadow-lg"
                >
                  <FileText size={14} />
                  <span>Review & Generate Bill →</span>
                </button>
              )}
              
              <button
                onClick={() => shareOnWhatsApp()}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold px-3.5 py-2 text-xs flex items-center gap-1.5 rounded-xl shadow-lg transition-transform hover:scale-105"
                title="Send bill directly on WhatsApp to 8792044625"
              >
                <MessageCircle size={15} />
                <span>WhatsApp to 8792044625</span>
              </button>

              <button
                onClick={handlePreviewBill}
                className="btn-outline-gold px-3 py-2 text-xs flex items-center gap-1.5"
                title="Instant preview"
              >
                <Eye size={14} />
                <span>Quick Preview</span>
              </button>
            </div>
          </div>
        )}

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
        <div className="flex border-b border-[#ffd700]/25 mb-8 gap-3">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#cbd5e1] hover:text-white'
            }`}
          >
            <ShoppingBag size={16} />
            <span>✦ Divine Catalog ({catalog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'builder'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#cbd5e1] hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span>✦ Generate Checking Bill {billSummary.totalUnits > 0 ? `(${billSummary.totalUnits})` : ''}</span>
          </button>
        </div>

        {/* TAB 1: CATALOG GALLERY */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/20 shadow-2xl">
              
              {/* Header with Category Filter, Search & View Mode Toggle */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-[#ffd700]/15 pb-5 mb-6 gap-4">
                <div>
                  <h3 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient tracking-wide">
                    G.Kamal Ganesha Works — 2026 Price List
                  </h3>
                  <p className="text-xs text-[#cbd5e1] mt-0.5">
                    Type or click quantities for any idol to instantly compute your Checking Bill.
                  </p>
                </div>

                {/* Search, Custom Item, & View Toggle */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="relative flex-grow sm:w-52">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ffd700]/60" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search idol name..."
                      className="w-full pl-9 pr-3 py-1.5 input-glass text-xs"
                    />
                  </div>

                  {/* Add Manual Item Trigger */}
                  <button
                    onClick={() => setShowManualItemForm(!showManualItemForm)}
                    className="btn-outline-gold px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold"
                    title="Write a custom item manually"
                  >
                    <Edit3 size={13} className="text-[#ff6a00]" />
                    <span>+ Write Custom Item</span>
                  </button>

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-black/40 border border-[#ffd700]/30 rounded-xl p-0.5">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                        viewMode === 'grid' ? 'bg-[#ffd700] text-[#1a0003] font-bold' : 'text-[#cbd5e1] hover:text-white'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid size={14} />
                      <span className="hidden sm:inline text-[11px]">Cards</span>
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                        viewMode === 'table' ? 'bg-[#ffd700] text-[#1a0003] font-bold' : 'text-[#cbd5e1] hover:text-white'
                      }`}
                      title="Price List Table View"
                    >
                      <List size={14} />
                      <span className="hidden sm:inline text-[11px]">Table</span>
                    </button>
                  </div>

                  <button
                    onClick={fetchCatalog}
                    className="btn-outline-gold p-2 text-xs"
                    title="Refresh catalog"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* MANUAL CUSTOM ITEM FORM (Collapsible) */}
              {showManualItemForm && (
                <div className="mb-6 p-5 glass-panel border-2 border-[#ffd700]/50 rounded-2xl bg-[#2d0007]/60 animate-fadeIn">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-cinzel text-xs sm:text-sm font-bold text-[#ffd700] flex items-center gap-2">
                      <Edit3 size={15} className="text-[#ff6a00]" />
                      <span>Write / Add Custom Item Manually</span>
                    </h4>
                    <button
                      onClick={() => setShowManualItemForm(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddManualItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Item Name / Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualItemForm.name}
                        onChange={(e) => setManualItemForm({ ...manualItemForm, name: e.target.value })}
                        placeholder="e.g. 2.5 Feet Custom Clay Ganesha"
                        className="w-full input-glass px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Price per Item (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={manualItemForm.rate}
                        onChange={(e) => setManualItemForm({ ...manualItemForm, rate: e.target.value })}
                        placeholder="e.g. 850"
                        className="w-full input-glass px-3 py-2 text-xs font-bold text-[#ffd700]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Quantity *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={manualItemForm.quantity}
                          onChange={(e) => setManualItemForm({ ...manualItemForm, quantity: e.target.value })}
                          className="w-20 input-glass px-2 py-2 text-xs text-center font-bold text-[#ffd700]"
                        />
                        <button
                          type="submit"
                          className="flex-grow btn-gold py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md"
                        >
                          <PlusCircle size={14} />
                          <span>Add to Bill</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Category Pills Filter */}
              <div className="flex flex-wrap items-center gap-2.5 mb-6">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#ffd700] text-[#1a0003] shadow-lg scale-105'
                      : 'bg-white/5 border border-[#ffd700]/25 text-[#cbd5e1] hover:text-white hover:border-[#ffd700]'
                  }`}
                >
                  <Layers size={13} />
                  <span>ALL IDOLS ({catalog.length})</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('GANESHA')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 ${
                    selectedCategory === 'GANESHA'
                      ? 'bg-[#ffd700] text-[#1a0003] shadow-lg scale-105'
                      : 'bg-white/5 border border-[#ffd700]/25 text-[#cbd5e1] hover:text-white hover:border-[#ffd700]'
                  }`}
                >
                  <span>GANESHA ({ganeshaCount})</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('GOWRI')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-cinzel font-bold transition-all flex items-center gap-1.5 ${
                    selectedCategory === 'GOWRI'
                      ? 'bg-[#ffd700] text-[#1a0003] shadow-lg scale-105'
                      : 'bg-white/5 border border-[#ffd700]/25 text-[#cbd5e1] hover:text-white hover:border-[#ffd700]'
                  }`}
                >
                  <span>GOWRI ({gowriCount})</span>
                </button>
              </div>
              
              {loading ? (
                <div className="text-center text-[#ffd700] py-16 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#ffd700] border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-cinzel text-sm">Loading divine idol models...</p>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center text-[#cbd5e1] py-16">
                  <p className="font-cinzel text-base text-[#ffd700] mb-2">No Items Found</p>
                  <p className="text-xs">Try clearing your search query or refreshing the catalog.</p>
                </div>
              ) : viewMode === 'table' ? (
                /* OFFICIAL PRICE LIST TABLE VIEW (With editable input) */
                <div className="overflow-x-auto border border-[#ffd700]/30 rounded-2xl shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#6b1f1f] text-[#ffd700] font-cinzel text-[11px] uppercase tracking-wider border-b border-[#ffd700]/30">
                        <th className="py-3.5 px-3 text-center w-16">SL-NO</th>
                        <th className="py-3.5 px-4">ITEM NAME</th>
                        <th className="py-3.5 px-4 text-center w-28">CATEGORY</th>
                        <th className="py-3.5 px-4 text-right w-32">PRICE</th>
                        <th className="py-3.5 px-4 text-center w-48">ENTER QTY (TYPE OR CLICK)</th>
                        <th className="py-3.5 px-4 text-right w-32">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/15 font-medium">
                      {filteredCatalog.map((item, idx) => {
                        const rate = Number(item.price || item.wholesalePrice || item.retailPrice || 0);
                        const currentQty = orderQuantities[item.id] || 0;
                        const itemCat = item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA');

                        return (
                          <tr 
                            key={item.id} 
                            className={`transition-colors ${
                              currentQty > 0 ? 'bg-[#ffd700]/10 font-bold' : (idx % 2 === 1 ? 'bg-white/[0.02]' : 'hover:bg-white/5')
                            }`}
                          >
                            <td className="py-3 px-3 text-center text-gray-400 font-mono">
                              {item.slNo || idx + 1}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">
                              <span className="text-[#ffd700] text-sm">{item.name}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                itemCat === 'GANESHA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {itemCat}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-cinzel text-sm font-bold text-gold-gradient">
                              ₹{rate.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => adjustQuantity(item.id, -1)}
                                  className="w-7 h-7 rounded-lg bg-black/40 hover:bg-[#ffd700]/20 text-[#ffd700] flex items-center justify-center font-bold"
                                  title="Decrease"
                                >
                                  <Minus size={13} />
                                </button>
                                
                                <input
                                  type="number"
                                  min="0"
                                  value={currentQty > 0 ? currentQty : ''}
                                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                  placeholder="0"
                                  className="w-16 text-center font-bold text-[#ffd700] text-sm bg-black/60 border border-[#ffd700]/40 rounded-lg py-1 px-1 focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] outline-none"
                                  onClick={(e) => e.target.select()}
                                  title="Click to type quantity manually"
                                />

                                <button
                                  onClick={() => adjustQuantity(item.id, 1)}
                                  className="w-7 h-7 rounded-lg bg-[#ffd700] hover:bg-[#ffe24d] text-[#1a0003] flex items-center justify-center font-bold"
                                  title="Increase"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-cinzel text-sm font-bold text-gold-gradient">
                              {currentQty > 0 ? `₹${(rate * currentQty).toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* GRID CARDS VIEW (With writable manual input) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCatalog.map((item, idx) => {
                    const itemImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
                    const currentPhotoIdx = activePhotoIndexes[item.id] || 0;
                    const hasMultiplePhotos = itemImages.length > 1;

                    const rate = Number(item.price || item.wholesalePrice || item.retailPrice || 0);
                    const currentQty = orderQuantities[item.id] || 0;
                    const itemCat = item.category || (item.name.toLowerCase().includes('gowri') ? 'GOWRI' : 'GANESHA');

                    return (
                      <div 
                        key={item.id} 
                        className={`glass-panel border rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col group ${
                          currentQty > 0 
                            ? 'border-[#ffd700] shadow-[#ffd700]/10 ring-1 ring-[#ffd700]/50' 
                            : 'border-[#ffd700]/20 hover:border-[#ffd700]/60'
                        }`}
                      >
                        {/* Image Header or Clean Decorative Emblem */}
                        <div className="relative aspect-video w-full bg-gradient-to-br from-[#2d0007] to-black border-b border-[#ffd700]/15 flex items-center justify-center overflow-hidden">
                          {itemImages.length > 0 ? (
                            <img
                              src={itemImages[currentPhotoIdx]}
                              alt={`${item.name} - View ${currentPhotoIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <DiyaDecoration className="w-10 h-10 mx-auto mb-1 opacity-80" />
                              <div className="text-[#ffd700] text-xs font-cinzel font-bold uppercase tracking-wider">
                                {itemCat} IDOL
                              </div>
                            </div>
                          )}

                          {hasMultiplePhotos && (
                            <>
                              <button
                                onClick={(e) => prevPhoto(item.id, itemImages.length, e)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-all"
                                title="Previous Photo"
                              >
                                ‹
                              </button>
                              <button
                                onClick={(e) => nextPhoto(item.id, itemImages.length, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-all"
                                title="Next Photo"
                              >
                                ›
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-y-0 -translate-x-1/2 flex gap-1 bg-black/50 px-2 py-0.5 rounded-full">
                                {itemImages.map((_, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                      pIdx === currentPhotoIdx ? 'bg-[#ffd700] w-3' : 'bg-white/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}

                          {/* Category Tag (Top Left) */}
                          <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-[#ffd700] border border-[#ffd700]/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            {itemCat} #{item.slNo || idx + 1}
                          </span>

                          {/* Selected Quantity Badge (Top Right) */}
                          {currentQty > 0 && (
                            <span className="absolute top-2.5 right-2.5 bg-[#ffd700] text-[#1a0003] font-black text-xs px-2.5 py-0.5 rounded-full shadow-lg">
                              ✓ {currentQty} Selected
                            </span>
                          )}
                        </div>

                        {/* Card Content */}
                        <div className="p-5 flex flex-col justify-between flex-grow">
                          <div>
                            <h4 className="font-cinzel text-base font-bold text-[#ffd700] mb-1">
                              {item.name}
                            </h4>
                            <p className="text-xs text-[#cbd5e1] line-clamp-2 mb-3">
                              100% natural clay idol handcrafted with pure devotion.
                            </p>
                          </div>

                          {/* Pricing & Controls */}
                          <div className="border-t border-[#ffd700]/15 pt-3">
                            <div className="flex justify-between items-baseline mb-3">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Price:
                              </span>
                              <div className="text-right">
                                <span className="font-cinzel text-xl font-black text-gold-gradient">
                                  ₹{rate.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Quantity Selector with DIRECT MANUAL INPUT */}
                            {currentQty === 0 ? (
                              <button
                                onClick={() => adjustQuantity(item.id, 1)}
                                className="w-full btn-outline-gold py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#ffd700]/15 transition-all"
                              >
                                <Plus size={14} />
                                <span>Add to Bill</span>
                              </button>
                            ) : (
                              <div className="flex items-center justify-between bg-black/40 border border-[#ffd700]/40 rounded-xl p-1.5">
                                <button
                                  onClick={() => adjustQuantity(item.id, -1)}
                                  className="w-8 h-8 rounded-lg bg-[#ffd700]/10 hover:bg-[#ffd700]/25 text-[#ffd700] flex items-center justify-center font-bold"
                                  title="Decrease"
                                >
                                  <Minus size={14} />
                                </button>
                                
                                <div className="text-center px-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentQty > 0 ? currentQty : ''}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    placeholder="0"
                                    className="w-16 text-center font-cinzel font-bold text-sm text-[#ffd700] bg-black/60 border border-[#ffd700]/40 rounded-lg py-1 px-1 focus:border-[#ffd700] focus:ring-1 focus:ring-[#ffd700] outline-none"
                                    onClick={(e) => e.target.select()}
                                    title="Click to write quantity manually"
                                  />
                                  <span className="block text-[9px] text-gray-400 uppercase mt-0.5">
                                    Total: ₹{(rate * currentQty).toLocaleString('en-IN')}
                                  </span>
                                </div>

                                <button
                                  onClick={() => adjustQuantity(item.id, 1)}
                                  className="w-8 h-8 rounded-lg bg-[#ffd700] hover:bg-[#ffe24d] text-[#1a0003] flex items-center justify-center font-bold"
                                  title="Increase"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GENERATE CHECKING BILL */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            
            {/* Customer Details Card (Printed on Bill) */}
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl">
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-[#ffd700] mb-2 flex items-center gap-2">
                <User size={18} className="text-[#ff6a00]" />
                <span>1. Bill Recipient Details (Printed on Invoice)</span>
              </h3>
              <p className="text-xs text-[#cbd5e1] mb-6">
                Enter customer information below. These details will be formatted directly onto your official Checking Bill.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#ffebc2] mb-1.5 uppercase tracking-wider">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerDetails.name}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                    placeholder="Enter Customer / Mandali Name"
                    className="w-full input-glass p-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ffebc2] mb-1.5 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={customerDetails.mobile}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, mobile: e.target.value })}
                    placeholder="Enter 10-Digit Mobile Number"
                    className="w-full input-glass p-3 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ffebc2] mb-1.5 uppercase tracking-wider">
                    Delivery / Residence Address
                  </label>
                  <input
                    type="text"
                    value={customerDetails.address}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                    placeholder="Enter Address / Area"
                    className="w-full input-glass p-3 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Selected Items Table Card (With Editable Manual Fields) */}
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-[#ffd700]/20 mb-6 gap-3">
                <div>
                  <h3 className="font-cinzel text-base sm:text-lg font-bold text-[#ffd700] flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#ff6a00]" />
                    <span>2. Selected Items & Custom Additions</span>
                  </h3>
                  <span className="text-xs text-[#cbd5e1]">
                    You can type quantities, edit custom rates, or write additional items manually.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowManualItemForm(!showManualItemForm)}
                    className="btn-outline-gold px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-bold"
                  >
                    <Edit3 size={14} className="text-[#ff6a00]" />
                    <span>+ Add Custom Item</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="btn-outline-gold px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Browse Catalog</span>
                  </button>
                  {billSummary.items.length > 0 && (
                    <button
                      onClick={clearAllItems}
                      className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-1"
                      title="Clear all"
                    >
                      <Trash2 size={13} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* MANUAL CUSTOM ITEM FORM (Collapsible in Bill Builder) */}
              {showManualItemForm && (
                <div className="mb-6 p-5 glass-panel border-2 border-[#ffd700]/50 rounded-2xl bg-[#2d0007]/60 animate-fadeIn">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-cinzel text-xs sm:text-sm font-bold text-[#ffd700] flex items-center gap-2">
                      <Edit3 size={15} className="text-[#ff6a00]" />
                      <span>Write / Add Custom Item Manually</span>
                    </h4>
                    <button
                      onClick={() => setShowManualItemForm(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                  
                  <form onSubmit={handleAddManualItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Item Name / Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualItemForm.name}
                        onChange={(e) => setManualItemForm({ ...manualItemForm, name: e.target.value })}
                        placeholder="e.g. 2.5 Feet Custom Clay Ganesha"
                        className="w-full input-glass px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Price per Item (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={manualItemForm.rate}
                        onChange={(e) => setManualItemForm({ ...manualItemForm, rate: e.target.value })}
                        placeholder="e.g. 850"
                        className="w-full input-glass px-3 py-2 text-xs font-bold text-[#ffd700]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                        Quantity *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={manualItemForm.quantity}
                          onChange={(e) => setManualItemForm({ ...manualItemForm, quantity: e.target.value })}
                          className="w-20 input-glass px-2 py-2 text-xs text-center font-bold text-[#ffd700]"
                        />
                        <button
                          type="submit"
                          className="flex-grow btn-gold py-2 px-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md"
                        >
                          <PlusCircle size={14} />
                          <span>Add to Bill</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {billSummary.items.length === 0 ? (
                <div className="text-center py-12 text-[#cbd5e1]">
                  <p className="font-cinzel text-base text-[#ffd700] mb-2">No Items Selected</p>
                  <p className="text-xs mb-6">Choose items from the catalog or write a custom item manually.</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="btn-gold px-6 py-2.5 text-xs font-bold"
                    >
                      Browse Catalog →
                    </button>
                    <button
                      onClick={() => setShowManualItemForm(true)}
                      className="btn-outline-gold px-6 py-2.5 text-xs font-bold"
                    >
                      + Write Custom Item
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#ffd700]/20 text-[#ffd700] font-cinzel text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-2">#</th>
                        <th className="py-3 px-4">Item Name / Description</th>
                        <th className="py-3 px-3 text-right">Price (₹)</th>
                        <th className="py-3 px-3 text-center">Quantity</th>
                        <th className="py-3 px-3 text-right">Line Total</th>
                        <th className="py-3 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/10 font-medium">
                      {billSummary.items.map((item, index) => (
                        <tr key={item.itemId} className="hover:bg-white/5">
                          <td className="py-3 px-2 text-gray-400">{index + 1}</td>
                          
                          {/* Item Name (Editable if custom manual item) */}
                          <td className="py-3 px-4 font-semibold text-[#ffd700]">
                            {item.isManual ? (
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleManualItemNameChange(item.itemId, e.target.value)}
                                className="w-full input-glass px-2 py-1 text-xs text-[#ffd700] font-bold"
                              />
                            ) : (
                              <span>{item.name}</span>
                            )}
                          </td>
                          
                          {/* Price (Editable manually) */}
                          <td className="py-3 px-3 text-right">
                            {item.isManual ? (
                              <input
                                type="number"
                                min="0"
                                value={item.rate}
                                onChange={(e) => handleManualItemRateChange(item.itemId, e.target.value)}
                                className="w-20 text-right input-glass px-2 py-1 text-xs font-bold text-[#ffd700]"
                              />
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <span>₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) => handleRateChange(item.itemId, e.target.value)}
                                  className="w-20 text-right input-glass px-2 py-1 text-xs font-bold text-[#ffd700]"
                                  title="Edit rate manually if needed"
                                />
                              </div>
                            )}
                          </td>

                          {/* Quantity (Editable manually with +/- buttons) */}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => item.isManual ? handleManualItemQtyChange(item.itemId, item.quantity - 1) : adjustQuantity(item.itemId, -1)}
                                className="w-6 h-6 rounded bg-black/40 hover:bg-[#ffd700]/20 text-[#ffd700] flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => item.isManual ? handleManualItemQtyChange(item.itemId, e.target.value) : handleQuantityChange(item.itemId, e.target.value)}
                                className="w-14 text-center font-bold text-[#ffd700] bg-black/60 border border-[#ffd700]/40 rounded-lg py-1 px-1 text-xs focus:border-[#ffd700] outline-none"
                                onClick={(e) => e.target.select()}
                              />

                              <button
                                onClick={() => item.isManual ? handleManualItemQtyChange(item.itemId, item.quantity + 1) : adjustQuantity(item.itemId, 1)}
                                className="w-6 h-6 rounded bg-black/40 hover:bg-[#ffd700]/20 text-[#ffd700] flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="py-3 px-3 text-right font-bold text-gold-gradient">
                            ₹{item.lineTotal.toLocaleString('en-IN')}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => removeItem(item.itemId)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bill Summary & Download Section */}
            {billSummary.items.length > 0 && (
              <div className="glass-panel p-6 sm:p-8 border-2 border-[#ffd700]/40 shadow-2xl">
                <h3 className="font-cinzel text-base sm:text-lg font-bold text-[#ffd700] mb-6 flex items-center gap-2">
                  <FileText size={18} className="text-[#ff6a00]" />
                  <span>3. Bill Financials & Download</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Advance Payment Setup */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#ffebc2] mb-1.5 uppercase tracking-wider">
                        Advance Payment Received (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={billSummary.grandTotal}
                        value={advancePayment}
                        onChange={(e) => setAdvancePayment(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full input-glass p-3 text-sm font-bold text-[#ffd700]"
                        placeholder="Enter advance amount"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAdvancePayment(0)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#cbd5e1]"
                      >
                        ₹0 (No Advance)
                      </button>
                      <button
                        onClick={() => setAdvancePayment(Math.round(billSummary.grandTotal * 0.25))}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#ffd700]"
                      >
                        25% (₹{Math.round(billSummary.grandTotal * 0.25).toLocaleString('en-IN')})
                      </button>
                      <button
                        onClick={() => setAdvancePayment(Math.round(billSummary.grandTotal * 0.50))}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#ffd700]"
                      >
                        50% (₹{Math.round(billSummary.grandTotal * 0.50).toLocaleString('en-IN')})
                      </button>
                      <button
                        onClick={() => setAdvancePayment(billSummary.grandTotal)}
                        className="px-2.5 py-1 rounded-lg bg-[#ffd700]/20 hover:bg-[#ffd700]/30 text-[11px] text-[#ffd700] font-bold"
                      >
                        100% Full Paid
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-400 italic">
                      * Official G.Kamal Ganesha Works logo watermark embedded in center of PDF.
                    </p>
                  </div>

                  {/* Right: Calculations & Action Buttons */}
                  <div className="bg-black/40 border border-[#ffd700]/25 rounded-2xl p-6 space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-300">
                      <span>Total Units Selected:</span>
                      <strong className="text-white">{billSummary.totalUnits} Units</strong>
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold border-t border-[#ffd700]/15 pt-2">
                      <span className="text-[#ffebc2]">Grand Total:</span>
                      <span className="text-gold-gradient text-lg font-cinzel">
                        ₹{billSummary.grandTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-300">
                      <span>Advance Paid:</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{billSummary.advancePayment.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-bold border-t border-[#ffd700]/15 pt-2">
                      <span className="text-red-300">Balance Due:</span>
                      <span className="text-red-400 text-lg font-cinzel font-black">
                        ₹{billSummary.balanceDue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handlePreviewBill}
                        className="flex-1 btn-outline-gold py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                      >
                        <Eye size={15} />
                        <span>Preview Bill</span>
                      </button>
                      <button
                        onClick={handleDownloadCheckingBill}
                        className="flex-1 btn-gold py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:scale-102 transition-transform"
                      >
                        <Download size={15} />
                        <span>Download PDF</span>
                      </button>
                    </div>

                    {/* WhatsApp Direct Share Button */}
                    <button
                      onClick={() => shareOnWhatsApp()}
                      className="w-full mt-3 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:scale-102 transition-transform"
                    >
                      <MessageCircle size={17} className="text-black" />
                      <span>Share on WhatsApp (8792044625)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: BILL PREVIEW MODAL */}
        {isPreviewOpen && previewBillData && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="glass-panel border-2 border-[#ffd700]/60 max-w-2xl w-full p-6 sm:p-8 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
              
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-[#ffd700]/30 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-12 h-12 rounded-full border border-[#ffd700] object-cover bg-black" 
                  />
                  <div>
                    <h3 className="font-cinzel text-lg font-extrabold text-gold-gradient">
                      ✦ Checking Bill Preview ✦
                    </h3>
                    <p className="text-[11px] text-[#cbd5e1]">
                      G.Kamal Ganesha Works • Bangalore - 560077
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Watermark Banner */}
              <div className="mb-4 py-2 px-4 bg-amber-500/15 border border-amber-500/40 rounded-xl text-center">
                <span className="font-cinzel text-xs font-bold text-[#ffd700] tracking-widest uppercase">
                  ✦ OFFICIAL CENTERED LOGO WATERMARK EMBEDDED ✦
                </span>
              </div>

              {/* Customer & Bill Details */}
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
                  <p className="text-amber-300 font-bold uppercase">2026 Price Card</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="overflow-x-auto mb-5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ffd700]/20 text-[#ffd700] font-cinzel text-[10px] uppercase">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-2 text-right">Price</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewBillData.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 text-white font-medium">{it.name}</td>
                        <td className="py-2 px-2 text-right text-gray-300">₹{it.rate.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-center text-[#ffd700] font-bold">{it.quantity}</td>
                        <td className="py-2 px-2 text-right text-gold-gradient font-bold">₹{it.lineTotal.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
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

              {/* Devotional Seal in Modal */}
              <div className="flex flex-col items-center justify-center my-3 py-1.5 border-t border-b border-[#ffd700]/20">
                <img src="/logo.png" alt="Emblem" className="w-8 h-8 rounded-full border border-[#ffd700]/60 mb-1" />
                <span className="font-cinzel text-[10px] text-[#ffd700] font-bold tracking-widest uppercase">
                  || SHRI GANESHAYA NAMAH ||
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="btn-outline-gold px-4 py-2 text-xs font-semibold"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => shareOnWhatsApp(previewBillData)}
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold px-4 py-2 text-xs flex items-center gap-1.5 rounded-xl shadow-lg"
                >
                  <MessageCircle size={15} />
                  <span>Send on WhatsApp</span>
                </button>
                <button
                  onClick={handleDownloadCheckingBill}
                  className="btn-gold px-5 py-2 text-xs flex items-center gap-1.5 font-bold shadow-xl"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Floating WhatsApp Quick Action Button directed to 8792044625 */}
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          <button
            onClick={() => shareOnWhatsApp()}
            className="group flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-108 border-2 border-white/40"
            title="Chat or Send Bill on WhatsApp to 8792044625"
          >
            <MessageCircle size={20} className="text-black" />
            <span className="text-xs tracking-wider uppercase font-black">
              {billSummary.totalUnits > 0 ? 'Send Bill (8792044625)' : 'WhatsApp (8792044625)'}
            </span>
          </button>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default CustomerDashboard;
