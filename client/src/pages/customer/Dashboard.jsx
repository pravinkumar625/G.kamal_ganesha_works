import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../../components/DiyaDecoration';
import Footer from '../../components/Footer';
import { 
  ShoppingBag, 
  FileText, 
  Download, 
  User, 
  Edit2, 
  LogOut, 
  Plus, 
  Minus, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Sparkles,
  Phone,
  MapPin,
  Clock,
  Store
} from 'lucide-react';
import { generateBillPDF, downloadPDFBlob } from '../../utils/pdfGenerator';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'builder' | 'orders'
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  
  // Builder state
  const [orderQuantities, setOrderQuantities] = useState({});
  const [orderPriceTypes, setOrderPriceTypes] = useState({});
  const [advancePayment, setAdvancePayment] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewOrderData, setPreviewOrderData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activePhotoIndexes, setActivePhotoIndexes] = useState({});
  
  // Form profile
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    address: ''
  });

  const navigate = useNavigate();

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const cachedUser = localStorage.getItem('customerUser');
    
    if (!token) {
      navigate('/login/customer');
      return;
    }

    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed);
        setProfileForm({
          name: (parsed.name && parsed.name !== 'New Customer' ? parsed.name : '') || '',
          email: parsed.email || '',
          address: parsed.address || ''
        });
        if (!parsed.name || parsed.name === 'New Customer') {
          setIsEditingProfile(true);
        }
      } catch (e) {
        console.error('Failed to parse cached user:', e);
      }
    }

    fetchProfile();
    fetchCatalog();
    fetchOrders();

    // Live auto-sync interval for customer dashboard
    const interval = setInterval(() => {
      const token = localStorage.getItem('customerToken');
      if (token && token !== 'undefined' && token !== 'null' && !isPreviewOpen && !isEditingProfile) {
        fetchOrders();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isPreviewOpen, isEditingProfile, navigate]);

  // Helper to update state only when content actually changes (prevents visual flickering/fluctuation)
  const setIfChanged = (setter, newVal) => {
    setter(prev => JSON.stringify(prev) === JSON.stringify(newVal) ? prev : newVal);
  };

  // Fetch logged in customer profile from backend
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/customer/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(prev => JSON.stringify(prev) === JSON.stringify({ ...prev, ...data }) ? prev : { ...prev, ...data });
        setProfileForm({
          name: (data.name && data.name !== 'New Customer' ? data.name : '') || '',
          email: data.email || '',
          address: data.address || ''
        });
        localStorage.setItem('customerUser', JSON.stringify(data));
        if (data.name && data.name !== 'New Customer') {
          setIsEditingProfile(false);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  // Fetch Ganesha catalog items
  const fetchCatalog = async () => {
    try {
      const response = await fetch('/api/customer/catalog', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIfChanged(setCatalog, data);
        const defaultTypes = {};
        data.forEach(item => {
          defaultTypes[item.id] = 'retail';
        });
        setOrderPriceTypes(defaultTypes);
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
    }
  };

  // Fetch customer's own order history
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/customer/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIfChanged(setOrders, data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  // Profile update submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profileForm.name.trim()) {
      setError('Please provide your Full Name');
      return;
    }

    if (!profileForm.address.trim()) {
      setError('Please provide your Delivery/Residence Address');
      return;
    }

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        },
        body: JSON.stringify(profileForm)
      });

      const updatedUser = await response.json();
      if (!response.ok) throw new Error(updatedUser.error || 'Failed to update profile');

      setUser(updatedUser);
      localStorage.setItem('customerUser', JSON.stringify(updatedUser));
      
      setSuccess('Profile details confirmed successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  // Order quantity controls
  const handleQuantityChange = (itemId, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setOrderQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const adjustQuantity = (itemId, delta) => {
    const current = orderQuantities[itemId] || 0;
    const newQty = Math.max(0, current + delta);
    setOrderQuantities(prev => ({ ...prev, [itemId]: newQty }));
  };

  // Calculate totals dynamically based strictly on customer profile type
  const getOrderSummary = () => {
    const selectedItems = [];
    let grandTotal = 0;
    const customerType = user?.customerType || 'retail';

    catalog.forEach(item => {
      const qty = orderQuantities[item.id] || 0;
      if (qty > 0) {
        const rate = customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice;
        const lineTotal = rate * qty;
        grandTotal += lineTotal;
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

    const balanceDue = Math.max(0, grandTotal - (Number(advancePayment) || 0));

    return {
      items: selectedItems,
      grandTotal,
      advancePayment: Number(advancePayment) || 0,
      balanceDue
    };
  };

  const summary = getOrderSummary();

  // Prepare order details for checking bill review
  const handleViewBill = () => {
    setError('');
    if (summary.items.length === 0) {
      setError('Please select at least one item and quantity to create a bill.');
      return;
    }
    
    if (!user.name || user.name === 'New Customer') {
      setError('Please confirm your Name and Address in the profile card before generating a bill.');
      setIsEditingProfile(true);
      return;
    }

    const orderPreview = {
      id: 'PREVIEW',
      customerDetails: {
        name: user.name,
        mobile: user.mobile,
        email: user.email || '',
        address: user.address || ''
      },
      items: summary.items,
      grandTotal: summary.grandTotal,
      advancePayment: summary.advancePayment,
      balanceDue: summary.balanceDue,
      createdAt: new Date().toISOString()
    };

    setPreviewOrderData(orderPreview);
    setIsPreviewOpen(true);
  };

  // Final submit order and download checking bill PDF
  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        },
        body: JSON.stringify({
          items: summary.items,
          grandTotal: summary.grandTotal,
          advancePayment: summary.advancePayment,
          balanceDue: summary.balanceDue
        })
      });

      const savedOrder = await response.json();
      if (!response.ok) throw new Error(savedOrder.error);

      setOrderQuantities({});
      setAdvancePayment(0);
      setIsPreviewOpen(false);
      setSuccess(`Order #${savedOrder.id} submitted successfully!`);
      fetchOrders();
      setActiveTab('orders');
    } catch (err) {
      setError(err.message || 'Error submitting order.');
    } finally {
      setLoading(false);
    }
  };

  // Client side checking bill download from orders list
  const downloadLocalCheckingBill = (order) => {
    const doc = generateBillPDF(order, 'CHECKING BILL', true);
    downloadPDFBlob(doc, `Checking_Bill_${order.id}.pdf`);
  };

  // Fetch approved Original Bill PDF (Server-gated endpoint with fallback generation)
  const downloadServerOriginalBill = async (orderId) => {
    setError('');
    try {
      const response = await fetch(`/api/customer/orders/${orderId}/original-bill`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to download original bill');
      }

      if (data.pdfBase64 && data.pdfBase64.startsWith('data:application/pdf')) {
        const downloadLink = document.createElement('a');
        downloadLink.href = data.pdfBase64;
        downloadLink.download = `Original_Ganesha_Bill_${orderId}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        const targetOrder = data.order || orders.find(o => o.id === orderId);
        if (targetOrder) {
          const doc = generateBillPDF(targetOrder, 'G.kamal ganesha works', false);
          downloadPDFBlob(doc, `Original_Ganesha_Bill_${orderId}.pdf`);
        } else {
          throw new Error('Order details not found');
        }
      }
    } catch (err) {
      console.error('Error downloading bill:', err);
      const targetOrder = orders.find(o => o.id === orderId);
      if (targetOrder && targetOrder.status === 'finalized') {
        const doc = generateBillPDF(targetOrder, 'G.kamal ganesha works', false);
        downloadPDFBlob(doc, `Original_Ganesha_Bill_${orderId}.pdf`);
      } else {
        setError(err.message || 'Access Denied: Original Bill not finalized.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      <main className="relative z-10 flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Portal Greeting Banner */}
        <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <DiyaDecoration className="w-12 h-12 animate-float" />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-cinzel text-xl sm:text-2xl font-extrabold text-gold-gradient tracking-wide uppercase">
                  Welcome, {user?.name || 'Customer'}
                </h2>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  user?.customerType === 'wholesale' ? 'badge-gold' : 'badge-orange'
                }`}>
                  {user?.customerType === 'wholesale' ? 'Wholesale Tier' : 'Retail Tier'}
                </span>
              </div>
              <p className="text-xs text-[#b3999c] mt-1 flex items-center gap-2">
                <span>📞 {user?.mobile}</span>
                {user?.address && <span>• 📍 {user.address}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="btn-outline-gold px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <Edit2 size={13} />
              <span>{isEditingProfile ? 'Close Profile' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-red-950/40 text-red-300 px-4 py-2 rounded-xl hover:bg-red-900/40 transition-colors border border-red-500/30"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/70 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-start gap-2.5 animate-pulse">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Completion / Edit Panel */}
        {isEditingProfile && (
          <div className="glass-panel p-6 sm:p-8 border-2 border-[#ffd700]/40 rounded-2xl mb-8 animate-fadeIn shadow-2xl">
            <h3 className="font-cinzel text-base font-bold text-[#ffd700] mb-1.5 flex items-center gap-2">
              <User size={18} className="text-[#ff6a00]" />
              <span>Confirm Your Delivery & Billing Details</span>
            </h3>
            <p className="text-xs text-[#b3999c] mb-5">
              Your name and address are formatted on official bills and dispatched to our workshop.
            </p>
            <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                  Full Name <span className="text-[#ff6a00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Your Full Name"
                  className="w-full px-3.5 py-2.5 input-glass text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="name@email.com"
                  className="w-full px-3.5 py-2.5 input-glass text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                  Delivery / Residence Address <span className="text-[#ff6a00]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Bangalore Address"
                  className="w-full px-3.5 py-2.5 input-glass text-sm"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                {user?.name !== 'New Customer' && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn-outline-gold px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-gold px-6 py-2 text-xs"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#ffd700]/25 mb-8 gap-3">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#b3999c] hover:text-white'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Catalog Gallery</span>
          </button>
          
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'builder'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#b3999c] hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span>Create Bill / Order</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-cinzel font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 rounded-t-xl'
                : 'border-transparent text-[#b3999c] hover:text-white'
            }`}
          >
            <Download size={16} />
            <span>My Orders & Bills ({orders.length})</span>
          </button>
        </div>

        {/* Tab 1: Catalog Grid */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/20 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#ffd700]/15 pb-4 mb-6">
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient tracking-wide">
                  ✦ Divine Idol Catalog ✦
                </h3>
                <span className="text-xs text-[#ffebc2] font-semibold">
                  Showing pricing for: <strong className="text-[#ffd700] uppercase">{user?.customerType || 'retail'}</strong>
                </span>
              </div>
              
              {catalog.length === 0 ? (
                <p className="text-center text-[#b3999c] py-12">Loading catalog models...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catalog.map(item => {
                    const itemImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
                    const currentPhotoIdx = activePhotoIndexes[item.id] || 0;
                    const hasMultiplePhotos = itemImages.length > 1;

                    const customerType = user?.customerType || 'retail';
                    const activeRate = customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice;
                    const rateLabel = customerType === 'wholesale' ? 'Wholesale Price (Bulk)' : 'Retail Price';

                    return (
                      <div key={item.id} className="glass-panel border border-[#ffd700]/20 rounded-2xl overflow-hidden shadow-lg hover:border-[#ffd700]/60 transition-all flex flex-col group hover:-translate-y-1.5">
                        {/* Image Carousel Block */}
                        <div className="relative aspect-square w-full bg-black/40 border-b border-[#ffd700]/15 flex items-center justify-center overflow-hidden">
                          {itemImages.length > 0 ? (
                            <img
                              src={itemImages[currentPhotoIdx]}
                              alt={`${item.name} - View ${currentPhotoIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                            />
                          ) : (
                            <div className="text-[#ffd700] text-xs font-cinzel font-bold uppercase tracking-wider">
                              No Image Available
                            </div>
                          )}

                          {hasMultiplePhotos && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const prevIdx = (currentPhotoIdx - 1 + itemImages.length) % itemImages.length;
                                  setActivePhotoIndexes(prev => ({ ...prev, [item.id]: prevIdx }));
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-[#ffd700] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                              >
                                ◀
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextIdx = (currentPhotoIdx + 1) % itemImages.length;
                                  setActivePhotoIndexes(prev => ({ ...prev, [item.id]: nextIdx }));
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-[#ffd700] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                              >
                                ▶
                              </button>
                              <span className="absolute bottom-2 right-2 bg-black/75 text-[#ffd700] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#ffd700]/30">
                                {currentPhotoIdx + 1} / {itemImages.length}
                              </span>
                            </>
                          )}

                          {/* Eco badge */}
                          <span className="absolute top-2.5 left-2.5 badge-orange text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            100% Eco Clay
                          </span>
                        </div>

                        {/* Details Block */}
                        <div className="p-5 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="font-cinzel font-bold text-base text-gold-gradient">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="badge-gold text-[10px] font-bold px-2 py-0.5 rounded">
                                Size: {item.size}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-[#ffd700]/15 flex justify-between items-end">
                            <div>
                              <p className="text-[10px] text-[#b3999c] uppercase font-bold tracking-wider">{rateLabel}</p>
                              <p className="text-xl font-cinzel font-extrabold text-[#ffd700]">₹{activeRate?.toLocaleString()}</p>
                            </div>
                            <button
                              onClick={() => {
                                adjustQuantity(item.id, 1);
                                setActiveTab('builder');
                              }}
                              className="btn-gold px-3.5 py-1.5 text-xs flex items-center gap-1 shadow"
                            >
                              <Plus size={13} />
                              <span>Order</span>
                            </button>
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

        {/* Tab 2: Live Order Builder / Bill Creator */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items selection */}
            <div className="lg:col-span-2 glass-panel p-6 sm:p-8 border border-[#ffd700]/20 shadow-2xl">
              <h3 className="font-cinzel text-base sm:text-lg font-bold text-gold-gradient mb-4 pb-2 border-b border-[#ffd700]/15">
                Select Items & Order Quantities
              </h3>
              
              <div className="space-y-4">
                {catalog.length === 0 ? (
                  <p className="text-center text-[#b3999c] py-6 text-sm">No items in the catalog.</p>
                ) : (
                  catalog.map(item => {
                    const qty = orderQuantities[item.id] || 0;
                    const customerType = user?.customerType || 'retail';
                    const activeRate = customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice;
                    const primaryImg = item.images && item.images.length > 0 ? item.images[0] : item.image;

                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-[#ffd700]/15 hover:border-[#ffd700]/40 bg-black/20 transition-all gap-4">
                        <div className="flex items-center gap-3">
                          {primaryImg ? (
                            <img src={primaryImg} alt={item.name} className="w-14 h-14 object-cover rounded-xl border border-[#ffd700]/25 shrink-0" />
                          ) : (
                            <div className="w-14 h-14 bg-[#4a0e17]/50 border border-dashed border-[#ffd700]/30 rounded-xl flex items-center justify-center text-[#ffd700] text-[9px] font-bold shrink-0">
                              No Image
                            </div>
                          )}
                          <div>
                            <h4 className="font-cinzel font-bold text-sm text-[#ffd700]">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="badge-gold text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Size: {item.size}
                              </span>
                              <span className="text-xs text-[#ffebc2] font-semibold">
                                Rate: ₹{activeRate?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Qty controls */}
                        <div className="flex items-center border border-[#ffd700]/30 rounded-xl overflow-hidden bg-black/40">
                          <button
                            onClick={() => adjustQuantity(item.id, -1)}
                            className="p-2.5 hover:bg-[#ffd700]/20 text-[#ffd700] transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-12 text-center bg-transparent outline-none text-sm font-bold text-[#ffd700]"
                          />
                          <button
                            onClick={() => adjustQuantity(item.id, 1)}
                            className="p-2.5 hover:bg-[#ffd700]/20 text-[#ffd700] transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Calculation Sidebar */}
            <div className="glass-panel p-6 sm:p-8 border-2 border-[#ffd700]/30 shadow-2xl h-fit">
              <h3 className="font-cinzel text-base font-bold text-gold-gradient mb-4 pb-2 border-b border-[#ffd700]/20 uppercase tracking-wide">
                Live Bill Calculator
              </h3>

              {summary.items.length === 0 ? (
                <div className="text-center py-8 text-[#b3999c] text-xs leading-relaxed">
                  No items selected yet. Adjust quantities on the left to build your bill.
                </div>
              ) : (
                <div className="space-y-3 mb-6 max-h-56 overflow-y-auto pr-1">
                  {summary.items.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center text-xs border-b border-[#ffd700]/10 pb-2">
                      <div>
                        <span className="font-bold text-[#ffd700]">{item.name}</span>
                        <span className="text-[10px] text-[#b3999c] block">({item.size} × {item.quantity})</span>
                      </div>
                      <span className="font-bold text-[#ffebc2]">₹{item.lineTotal?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Advance and Totals */}
              <div className="space-y-4 pt-3 border-t border-[#ffd700]/20">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-[#ffebc2]">Grand Total:</span>
                  <span className="font-cinzel font-extrabold text-[#ffd700] text-xl">₹{summary.grandTotal?.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1 font-cinzel">
                    Advance Payment (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={summary.grandTotal}
                    value={advancePayment || ''}
                    onChange={(e) => setAdvancePayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Enter advance amount"
                    disabled={summary.grandTotal === 0}
                    className="w-full px-3.5 py-2.5 input-glass text-sm disabled:opacity-40"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#4a0e17]/60 border border-red-500/40 flex justify-between items-center text-sm">
                  <span className="font-bold text-red-300">Balance Due:</span>
                  <span className="font-cinzel font-extrabold text-red-200 text-lg">₹{summary.balanceDue?.toLocaleString()}</span>
                </div>

                <button
                  onClick={handleViewBill}
                  disabled={summary.items.length === 0}
                  className="w-full btn-gold py-3.5 text-xs flex justify-center items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-40 mt-2"
                >
                  <Eye size={16} />
                  <span>Preview Checking Bill</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Order History */}
        {activeTab === 'orders' && (
          <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/20 shadow-2xl">
            <h3 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient mb-6 flex items-center gap-2">
              ✦ My Order & Bill History ✦
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#ffd700]/30 text-[11px] font-cinzel font-bold text-[#ffd700] uppercase bg-[#ffd700]/5">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Items Summary</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-right">Balance Due</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Bill Downloads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffd700]/10">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#b3999c]">
                        You haven't placed any orders yet. Switch to the <strong>Create Bill</strong> tab to get started.
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => {
                      const dateStr = new Date(order.createdAt).toLocaleDateString();
                      const summaryText = order.items.map(i => `${i.name} (${i.quantity})`).join(', ');

                      return (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-[#ffd700]">#{order.id}</td>
                          <td className="py-4 px-4 text-[#ffebc2]">{dateStr}</td>
                          <td className="py-4 px-4 text-[#b3999c] max-w-xs truncate" title={summaryText}>
                            {summaryText}
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-[#ffd700]">₹{order.grandTotal?.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right font-bold text-red-400">₹{order.balanceDue?.toLocaleString()}</td>
                          
                          <td className="py-4 px-4 text-center">
                            {order.status === 'finalized' ? (
                              <span className="inline-flex items-center gap-1 badge-green text-[10px] font-bold px-2.5 py-1 rounded-full">
                                <CheckCircle size={11} />
                                Original Bill Ready
                              </span>
                            ) : order.status === 'rejected' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 badge-red text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  <AlertCircle size={11} />
                                  Rejected by Workshop
                                </span>
                                {order.rejectionReason && (
                                  <span className="text-[9px] text-red-300 max-w-[120px] truncate" title={order.rejectionReason}>
                                    {order.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 badge-gold text-[10px] font-bold px-2.5 py-1 rounded-full">
                                <Clock size={11} />
                                Pending Review
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Checking bill download */}
                              <button
                                onClick={() => downloadLocalCheckingBill(order)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#ffebc2] bg-white/10 hover:bg-white/20 border border-[#ffd700]/20 px-2.5 py-1.5 rounded-lg transition-all"
                                title="Download Checking Bill PDF"
                              >
                                <Download size={12} />
                                <span>Checking</span>
                              </button>

                              {/* Original bill download (only finalized) */}
                              <button
                                onClick={() => downloadServerOriginalBill(order.id)}
                                disabled={order.status !== 'finalized'}
                                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${
                                  order.status === 'finalized'
                                    ? 'btn-gold shadow-md'
                                    : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                                }`}
                                title={order.status === 'finalized' ? "Download Original Final Bill PDF" : "Original Bill pending approval"}
                              >
                                <Download size={12} />
                                <span>Original</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* VIEW BILL PREVIEW MODAL */}
      {isPreviewOpen && previewOrderData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#200104] border-2 border-[#ffd700] rounded-2xl overflow-hidden shadow-2xl animate-fadeIn relative my-8 text-white">
            
            {/* Modal Header */}
            <div className="bg-[#4a0e17] px-6 py-4 flex justify-between items-center border-b border-[#ffd700]/40">
              <h3 className="font-cinzel font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-gold-gradient">
                <FileText size={16} className="text-[#ffd700]" />
                <span>On-Screen Bill Preview</span>
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-[#ffd700] hover:text-white font-bold text-sm uppercase tracking-wider"
              >
                ✕ Close
              </button>
            </div>

            {/* Bill Paper Preview Area */}
            <div className="p-6 md:p-8 bg-[#1a0003] border-b border-[#ffd700]/20 relative">
              <div className="relative z-10 border border-[#ffd700]/30 p-6 rounded-xl bg-black/40">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-[#ffd700]/30 pb-4 mb-4">
                  <div>
                    <h2 className="font-cinzel text-lg font-extrabold text-[#ffd700]">G.KAMAL GANESHA WORKS</h2>
                    <p className="text-[10px] text-orange-gradient font-bold tracking-widest uppercase">PREMIUM CLAY IDOL MANUFACTURER</p>
                  </div>
                  <div className="text-right text-xs text-[#ffebc2]">
                    <p className="font-bold text-white">Saraipalaya, Thanisandra Main Road</p>
                    <p className="text-gray-400">Vidyasagar, Bangalore - 560077</p>
                    <p className="text-[#ffd700] font-mono font-bold">9739142445 / 8792044625</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 text-xs gap-4 mb-6 text-[#ffebc2]">
                  <div>
                    <h4 className="font-cinzel font-bold text-[#ffd700] uppercase mb-1">To Customer:</h4>
                    <p className="font-semibold text-white">{previewOrderData.customerDetails.name}</p>
                    <p className="text-gray-400">Phone: {previewOrderData.customerDetails.mobile}</p>
                    <p className="text-gray-400">Address: {previewOrderData.customerDetails.address}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="font-cinzel font-bold text-[#ffd700] uppercase mb-1">Bill Reference:</h4>
                    <p className="font-semibold text-white">Order ID: #PREVIEW</p>
                    <p className="text-gray-400">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-[#ff6a00] font-bold uppercase">Status: CHECKING BILL</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#4a0e17] text-[#ffd700] font-cinzel font-bold">
                        <th className="p-2.5 rounded-l">Item</th>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right rounded-r">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/10">
                      {previewOrderData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="p-2.5 font-semibold text-[#ffebc2]">{item.name}</td>
                          <td className="p-2.5 text-gray-300">{item.size}</td>
                          <td className="p-2.5 text-right text-gray-300">₹{item.rate}</td>
                          <td className="p-2.5 text-right text-gray-300">{item.quantity}</td>
                          <td className="p-2.5 text-right font-bold text-[#ffd700]">₹{item.lineTotal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end gap-1.5 pt-2 border-t border-[#ffd700]/20 text-xs text-[#ffebc2]">
                  <div className="flex justify-between w-52 border-b border-[#ffd700]/15 pb-1">
                    <span>Grand Total:</span>
                    <span className="font-bold text-[#ffd700]">₹{previewOrderData.grandTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-52 border-b border-[#ffd700]/15 pb-1">
                    <span>Advance Payment:</span>
                    <span className="font-semibold text-emerald-400">- ₹{previewOrderData.advancePayment?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-52 bg-red-950/60 border border-red-500/40 text-red-200 font-bold p-2 rounded-lg">
                    <span>Balance Due:</span>
                    <span>₹{previewOrderData.balanceDue?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-[#2b0308] px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-t border-[#ffd700]/20">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="btn-outline-gold px-4 py-2.5 text-xs"
              >
                ← Back & Modify
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const tempOrder = {
                      id: 'PREVIEW',
                      customerDetails: previewOrderData.customerDetails,
                      items: previewOrderData.items,
                      grandTotal: previewOrderData.grandTotal,
                      advancePayment: previewOrderData.advancePayment,
                      balanceDue: previewOrderData.balanceDue,
                      status: 'pending_review'
                    };
                    const doc = generateBillPDF(tempOrder, 'CHECKING BILL', true);
                    downloadPDFBlob(doc, `Checking_Bill_${previewOrderData.customerDetails.name || 'Order'}.pdf`);
                  }}
                  className="px-4 py-2.5 text-xs font-cinzel font-bold uppercase tracking-wider border border-[#ffd700] text-[#ffd700] bg-[#ffd700]/10 hover:bg-[#ffd700]/20 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download size={14} />
                  <span>Download Checking PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="btn-gold px-6 py-2.5 text-xs flex items-center gap-1.5 shadow-xl disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-[#1a0003] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Submit Order to Workshop</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CustomerDashboard;
