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
  MessageCircle
} from 'lucide-react';
import { generateBillPDF, downloadPDFBlob } from '../../utils/pdfGenerator';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'builder'
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pricing mode: Wholesale exclusively
  const priceType = 'wholesale';

  // Selected quantities: { [itemId]: quantity }
  const [orderQuantities, setOrderQuantities] = useState({});
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
      // Fetch public catalog
      const response = await fetch('/api/catalog');
      if (response.ok) {
        const data = await response.json();
        setCatalog(data || []);
      } else {
        // Fallback to /api/customer/catalog
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

  // Quantity handlers
  const handleQuantityChange = (itemId, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setOrderQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const adjustQuantity = (itemId, delta) => {
    const current = orderQuantities[itemId] || 0;
    const newQty = Math.max(0, current + delta);
    setOrderQuantities(prev => ({ ...prev, [itemId]: newQty }));
  };

  const removeItem = (itemId) => {
    setOrderQuantities(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const clearAllItems = () => {
    setOrderQuantities({});
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

    catalog.forEach(item => {
      const qty = orderQuantities[item.id] || 0;
      if (qty > 0) {
        const rate = priceType === 'wholesale' 
          ? Number(item.wholesalePrice || item.retailPrice || 0)
          : Number(item.retailPrice || 0);
        const lineTotal = rate * qty;
        grandTotal += lineTotal;
        totalUnits += qty;
        selectedItems.push({
          itemId: item.id,
          name: item.name,
          size: item.size,
          rate,
          quantity: qty,
          lineTotal
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
      setError('Please select at least one Ganesha idol from the catalog to generate a bill.');
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
      setError('Please select at least one Ganesha idol from the catalog to generate a bill.');
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
      setError('Please select at least one Ganesha idol from the catalog to generate and share a bill.');
      return;
    }
    const data = customBill || previewBillData || buildBillObject();
    const phone = '918792044625';

    const itemsList = data.items.map((it, idx) => 
      `${idx + 1}. *${it.name}* (${it.size}) - Qty: ${it.quantity} @ Rs.${it.rate.toLocaleString('en-IN')} = *Rs.${it.lineTotal.toLocaleString('en-IN')}*`
    ).join('\n');

    const text = 
`🙏 *G.KAMAL GANESHA WORKS*
_Eco-Friendly Clay Idols • Bangalore_
----------------------------------
📋 *CHECKING BILL / ESTIMATE*
🔢 *Bill Ref:* #${data.id}
📅 *Date:* ${new Date().toLocaleDateString('en-IN')}
🏷️ *Pricing Tier:* ${priceType.toUpperCase()}

👤 *CUSTOMER DETAILS:*
• *Name:* ${data.customerDetails.name}
• *Mobile:* ${data.customerDetails.mobile}
• *Address:* ${data.customerDetails.address}

📦 *SELECTED GANESHA IDOLS:*
${itemsList}

💰 *FINANCIAL SUMMARY:*
• *Total Idols:* ${billSummary.totalUnits} Units
• *Grand Total:* Rs.${data.grandTotal.toLocaleString('en-IN')}
• *Advance Paid:* Rs.${data.advancePayment.toLocaleString('en-IN')}
• *Balance Due:* Rs.${data.balanceDue.toLocaleString('en-IN')}

📍 *Store Location:* Thanisandra Main Road, Vidyasagar, Bangalore - 560077
📞 *Contact:* 9739142445 / 8792044625
----------------------------------
_Generated from G.Kamal Ganesha Works Portal_`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filter catalog items
  const filteredCatalog = catalog.filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.size && item.size.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      <main className="relative z-10 flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Banner */}
        <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <DiyaDecoration className="w-12 h-12 animate-float" />
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
                <span className="text-[#ffd700]">📍 Thanisandra Main Road, Bangalore</span>
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

          {/* Wholesale Pricing Badge */}
          <div className="flex items-center gap-2 bg-[#ffd700]/15 border border-[#ffd700]/40 px-4 py-2.5 rounded-xl text-xs font-cinzel font-bold text-[#ffd700] uppercase tracking-wider shadow-lg">
            <Sparkles size={15} className="text-[#ff6a00]" />
            <span>✦ Direct Wholesale Pricing ✦</span>
          </div>
        </div>

        {/* Global Floating/Header Cart Status */}
        {billSummary.totalUnits > 0 && (
          <div className="glass-panel p-4 mb-6 border-2 border-[#ffd700]/50 bg-[#2d0007]/80 flex flex-col sm:flex-row justify-between items-center gap-3 animate-fadeIn shadow-xl">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-semibold text-[#ffebc2]">
                <strong className="text-[#ffd700] text-base">{billSummary.totalUnits}</strong> {billSummary.totalUnits === 1 ? 'idol' : 'idols'} selected
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

        {/* Dynamic Notifications */}
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
            <span>✦ Divine Ganesha Catalog ({catalog.length})</span>
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
              
              {/* Header with Search & Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#ffd700]/15 pb-4 mb-6 gap-4">
                <div>
                  <h3 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient tracking-wide">
                    Handcrafted Eco-Friendly Ganesha Idols
                  </h3>
                  <p className="text-xs text-[#cbd5e1] mt-0.5">
                    Select quantities for any idol model to calculate your instant Checking Bill.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-grow sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ffd700]/60" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search idol name or size..."
                      className="w-full pl-9 pr-3 py-1.5 input-glass text-xs"
                    />
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
              
              {loading ? (
                <div className="text-center text-[#ffd700] py-16 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#ffd700] border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-cinzel text-sm">Loading divine idol models...</p>
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center text-[#cbd5e1] py-16">
                  <p className="font-cinzel text-base text-[#ffd700] mb-2">No Ganesha Idols Found</p>
                  <p className="text-xs">Try clearing your search query or refreshing the catalog.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCatalog.map(item => {
                    const itemImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
                    const currentPhotoIdx = activePhotoIndexes[item.id] || 0;
                    const hasMultiplePhotos = itemImages.length > 1;

                    const rate = priceType === 'wholesale' 
                      ? Number(item.wholesalePrice || item.retailPrice || 0)
                      : Number(item.retailPrice || 0);
                    const currentQty = orderQuantities[item.id] || 0;

                    return (
                      <div 
                        key={item.id} 
                        className={`glass-panel border rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col group ${
                          currentQty > 0 
                            ? 'border-[#ffd700] shadow-[#ffd700]/10 ring-1 ring-[#ffd700]/50' 
                            : 'border-[#ffd700]/20 hover:border-[#ffd700]/60'
                        }`}
                      >
                        {/* Image Carousel */}
                        <div className="relative aspect-square w-full bg-black/40 border-b border-[#ffd700]/15 flex items-center justify-center overflow-hidden">
                          {itemImages.length > 0 ? (
                            <img
                              src={itemImages[currentPhotoIdx]}
                              alt={`${item.name} - View ${currentPhotoIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="text-[#ffd700] text-xs font-cinzel font-bold uppercase tracking-wider">
                              Divine Clay Ganesha
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
                                {itemImages.map((_, idx) => (
                                  <span
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                      idx === currentPhotoIdx ? 'bg-[#ffd700] w-3' : 'bg-white/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}

                          {/* Size Tag */}
                          <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-[#ffd700] border border-[#ffd700]/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            📏 {item.size || 'Custom Size'}
                          </span>

                          {/* Selected Quantity Badge */}
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
                              {item.description || 'Eco-friendly pure organic clay idol handcrafted with natural divine beauty.'}
                            </p>
                          </div>

                          {/* Pricing & Controls */}
                          <div className="border-t border-[#ffd700]/15 pt-3">
                            <div className="flex justify-between items-baseline mb-3">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                Wholesale Price:
                              </span>
                              <div className="text-right">
                                <span className="font-cinzel text-lg font-black text-gold-gradient">
                                  ₹{rate.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Quantity Selector */}
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
                                
                                <div className="text-center">
                                  <span className="font-cinzel font-bold text-sm text-[#ffd700]">
                                    {currentQty}
                                  </span>
                                  <span className="block text-[9px] text-gray-400 uppercase">
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

            {/* Selected Idols Table Card */}
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-[#ffd700]/20 mb-6 gap-3">
                <div>
                  <h3 className="font-cinzel text-base sm:text-lg font-bold text-[#ffd700] flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[#ff6a00]" />
                    <span>2. Selected Ganesha Idols</span>
                  </h3>
                  <span className="text-xs text-[#cbd5e1]">
                    Pricing applied: <strong className="text-[#ffd700] uppercase">{priceType} Tier</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="btn-outline-gold px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add More Idols</span>
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

              {billSummary.items.length === 0 ? (
                <div className="text-center py-12 text-[#cbd5e1]">
                  <p className="font-cinzel text-base text-[#ffd700] mb-2">No Idols Selected</p>
                  <p className="text-xs mb-6">Choose Ganesha idols from the catalog gallery to generate a bill.</p>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="btn-gold px-6 py-2.5 text-xs font-bold"
                  >
                    Browse Ganesha Catalog →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#ffd700]/20 text-[#ffd700] font-cinzel text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-2">#</th>
                        <th className="py-3 px-3">Ganesha Model</th>
                        <th className="py-3 px-3">Size</th>
                        <th className="py-3 px-3 text-right">Rate</th>
                        <th className="py-3 px-3 text-center">Quantity</th>
                        <th className="py-3 px-3 text-right">Line Total</th>
                        <th className="py-3 px-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/10 font-medium">
                      {billSummary.items.map((item, index) => (
                        <tr key={item.itemId} className="hover:bg-white/5">
                          <td className="py-3 px-2 text-gray-400">{index + 1}</td>
                          <td className="py-3 px-3 font-semibold text-[#ffd700]">{item.name}</td>
                          <td className="py-3 px-3 text-[#cbd5e1]">{item.size}</td>
                          <td className="py-3 px-3 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => adjustQuantity(item.itemId, -1)}
                                className="w-6 h-6 rounded bg-black/40 hover:bg-[#ffd700]/20 text-[#ffd700] flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-[#ffd700]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => adjustQuantity(item.itemId, 1)}
                                className="w-6 h-6 rounded bg-black/40 hover:bg-[#ffd700]/20 text-[#ffd700] flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-gold-gradient">
                            ₹{item.lineTotal.toLocaleString('en-IN')}
                          </td>
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
                      * Watermark "CHECKING BILL" will be embedded automatically across the entire bill document.
                    </p>
                  </div>

                  {/* Right: Calculations & Action Buttons */}
                  <div className="bg-black/40 border border-[#ffd700]/25 rounded-2xl p-6 space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-300">
                      <span>Total Idols Selected:</span>
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
                <div>
                  <h3 className="font-cinzel text-lg font-extrabold text-gold-gradient">
                    ✦ Checking Bill Preview ✦
                  </h3>
                  <p className="text-[11px] text-[#cbd5e1]">
                    G.Kamal Ganesha Works • Bangalore
                  </p>
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
                  WATERMARK: CHECKING BILL
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
                  <p className="text-amber-300 font-bold uppercase">{priceType} Tier</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="overflow-x-auto mb-5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ffd700]/20 text-[#ffd700] font-cinzel text-[10px] uppercase">
                      <th className="py-2 px-2">Item</th>
                      <th className="py-2 px-2">Size</th>
                      <th className="py-2 px-2 text-right">Rate</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewBillData.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-white font-medium">{it.name}</td>
                        <td className="py-2 px-2 text-gray-300">{it.size}</td>
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
