import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import DiyaDecoration from '../../components/DiyaDecoration';
import MapLocationLink from '../../components/MapLocationLink';
import { generateBillPDF, downloadPDFBlob } from '../../utils/pdfGenerator';
import {
  User,
  ShoppingBag,
  FileText,
  MapPin,
  LogOut,
  Plus,
  Minus,
  Download,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit2
} from 'lucide-react';

const CustomerDashboard = () => {
  const [user, setUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', address: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog');
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activePhotoIndexes, setActivePhotoIndexes] = useState({}); // { itemId: photoIndex }
  
  // Order Builder State
  const [orderQuantities, setOrderQuantities] = useState({}); // { itemId: quantity }
  const [orderPriceTypes, setOrderPriceTypes] = useState({}); // { itemId: 'retail' | 'wholesale' }
  const [advancePayment, setAdvancePayment] = useState(0);
  
  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewOrderData, setPreviewOrderData] = useState(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Authentication check and data fetching
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    const storedUser = localStorage.getItem('customerUser');
    
    if (!token || !storedUser) {
      localStorage.clear();
      navigate('/login/customer');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setProfileForm({
        name: (parsedUser.name && parsedUser.name !== 'New Customer' ? parsedUser.name : '') || '',
        email: parsedUser.email || '',
        address: parsedUser.address || ''
      });

      if (!parsedUser.name || parsedUser.name === 'New Customer') {
        setIsEditingProfile(true);
      } else {
        setIsEditingProfile(false);
      }
    } catch (e) {
      console.error('Error parsing stored user:', e);
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
        setUser(prev => ({ ...prev, ...data }));
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
        setCatalog(data);
        // Initialize default price types to retail for all items
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
        setOrders(data);
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
    
    if (!profileForm.name || profileForm.name.trim() === 'New Customer') {
      setError('Please enter your actual name');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        },
        body: JSON.stringify(profileForm)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Update user state and localStorage
      const updatedUser = { ...user, ...data.user };
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
      // 1. Save order to Express backend database
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

      // 2. Clear inputs and redirect to orders tab
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
        // Fallback: Generate approved Original Bill with official watermark
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
      // Client-side fallback if order exists in local state
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
    <div className="min-h-screen flex flex-col justify-between relative bg-devotional-cream text-devotional-maroon">
      {/* Golden Top Border */}
      <div className="w-full bg-devotional-maroon h-3 relative z-10 border-b border-devotional-gold"></div>

      <main className="relative z-10 flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        
        {/* Portal Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/80 backdrop-blur-sm border border-devotional-gold/30 rounded-2xl p-6 shadow-md mb-8 gap-4">
          <div className="flex items-center gap-3">
            <DiyaDecoration className="w-10 h-10" />
            <div>
              <h2 className="text-xl font-extrabold uppercase text-devotional-maroonDark tracking-wide">
                Customer Dashboard
              </h2>
              <p className="text-xs text-gray-500 font-semibold">
                Welcome back, {user?.name || 'Customer'} ({user?.mobile})
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-devotional-gold/15 text-devotional-maroon px-4 py-2 rounded-xl hover:bg-devotional-gold/30 transition-colors"
            >
              <Edit2 size={14} />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors border border-red-200"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r text-red-700 text-sm flex items-start gap-2 animate-bounce" style={{ animationDuration: '4s' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r text-green-700 text-sm flex items-start gap-2">
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Profile Completion / Edit Panel */}
        {isEditingProfile && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-devotional-gold/40 rounded-2xl p-6 shadow-md mb-8 animate-fadeIn">
            <h3 className="text-base font-bold text-devotional-maroonDark mb-2 flex items-center gap-1.5">
              <User size={18} className="text-devotional-gold" />
              Confirm Your Billing Details
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Your Name, Phone Number, and Address are printed on your generated bills and sent to our admin workshop.
            </p>
            <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Your Full Name"
                  className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="name@email.com"
                  className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1">
                  Delivery/Residence Address
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Bangalore Delivery Address"
                  className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-sm"
                />
              </div>
              <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                {user?.name !== 'New Customer' && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-devotional-maroon text-white font-bold px-6 py-2 rounded-lg hover:bg-devotional-maroonDark text-xs uppercase tracking-wider"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Tab Links */}
        <div className="flex border-b border-devotional-gold/30 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-devotional-maroon text-devotional-maroon'
                : 'border-transparent text-gray-400 hover:text-devotional-maroon/70'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Catalog Gallery</span>
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'builder'
                ? 'border-devotional-maroon text-devotional-maroon'
                : 'border-transparent text-gray-400 hover:text-devotional-maroon/70'
            }`}
          >
            <FileText size={16} />
            <span>Create Bill / Order</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs md:text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-devotional-maroon text-devotional-maroon'
                : 'border-transparent text-gray-400 hover:text-devotional-maroon/70'
            }`}
          >
            <Download size={16} />
            <span>My Orders & Bills</span>
          </button>
        </div>

        {/* Tab 1: Catalog Grid */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm border border-devotional-gold/20 rounded-2xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-devotional-maroonDark flex items-center gap-1.5 border-b border-devotional-gold/15 pb-3 mb-6">
                ✦ Catalog Gallery ✦
              </h3>
              
              {catalog.length === 0 ? (
                <p className="text-center text-gray-400 py-12">Loading catalog items...</p>
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
                      <div key={item.id} className="bg-white border border-devotional-gold/15 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                        {/* Image Carousel Block */}
                        <div className="relative aspect-square w-full bg-devotional-cream/10 border-b border-devotional-gold/10 flex items-center justify-center overflow-hidden group">
                          {itemImages.length > 0 ? (
                            <img
                              src={itemImages[currentPhotoIdx]}
                              alt={`${item.name} - View ${currentPhotoIdx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="text-devotional-gold text-xs font-bold uppercase tracking-wider">
                              No Image Available
                            </div>
                          )}

                          {hasMultiplePhotos && (
                            <>
                              {/* Left Arrow */}
                              <button
                                onClick={() => {
                                  const prevIdx = (currentPhotoIdx - 1 + itemImages.length) % itemImages.length;
                                  setActivePhotoIndexes(prev => ({ ...prev, [item.id]: prevIdx }));
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                              >
                                ◀
                              </button>
                              {/* Right Arrow */}
                              <button
                                onClick={() => {
                                  const nextIdx = (currentPhotoIdx + 1) % itemImages.length;
                                  setActivePhotoIndexes(prev => ({ ...prev, [item.id]: nextIdx }));
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
                              >
                                ▶
                              </button>
                              {/* Photo Counter Badge */}
                              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                {currentPhotoIdx + 1} / {itemImages.length}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Details Block */}
                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <div>
                            <h4 className="font-extrabold text-devotional-maroonDark text-sm">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="bg-devotional-gold/10 text-devotional-maroon px-2 py-0.5 rounded text-[10px] font-bold">
                                Size: {item.size}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">{rateLabel}</p>
                              <p className="text-base font-extrabold text-devotional-maroon">₹{activeRate}</p>
                            </div>
                            <span className="text-[9px] bg-devotional-cream text-devotional-maroon px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                              {customerType} pricing
                            </span>
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
            {/* Catalog list with quantity selectors */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-devotional-gold/20 rounded-2xl p-6 shadow-md">
              <h3 className="text-base font-bold text-devotional-maroonDark mb-4 pb-2 border-b border-devotional-gold/10">
                Select Items & Quantities
              </h3>
              
              <div className="space-y-4">
                {catalog.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">No items in the catalog.</p>
                ) : (
                  catalog.map(item => {
                    const qty = orderQuantities[item.id] || 0;
                    const customerType = user?.customerType || 'retail';
                    const activeRate = customerType === 'wholesale' ? item.wholesalePrice : item.retailPrice;
                    const primaryImg = item.images && item.images.length > 0 ? item.images[0] : item.image;

                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl hover:border-devotional-gold/30 bg-white shadow-sm transition-all gap-4">
                        <div className="flex items-center gap-3">
                          {primaryImg ? (
                            <img src={primaryImg} alt={item.name} className="w-12 h-12 object-cover rounded-lg border border-devotional-gold/20" />
                          ) : (
                            <div className="w-12 h-12 bg-devotional-cream/40 border border-dashed rounded-lg flex items-center justify-center text-devotional-gold text-[9px] font-bold shrink-0">
                              No Image
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-devotional-maroonDark text-sm">{item.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="bg-devotional-gold/10 text-devotional-maroon text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Size: {item.size}
                              </span>
                              <span className="text-xs text-gray-500 font-semibold">
                                Rate: ₹{activeRate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Qty adjusters */}
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">

                          {/* Plus Minus inputs */}
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button
                              onClick={() => adjustQuantity(item.id, -1)}
                              className="p-2 hover:bg-gray-200 text-gray-500 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={qty}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="w-10 text-center bg-transparent outline-none text-sm font-semibold text-gray-700"
                            />
                            <button
                              onClick={() => adjustQuantity(item.id, 1)}
                              className="p-2 hover:bg-gray-200 text-gray-500 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Calculation Sidebar */}
            <div className="bg-gradient-to-b from-white to-devotional-cream/30 border border-devotional-gold/30 rounded-2xl p-6 shadow-md h-fit">
              <h3 className="text-base font-bold text-devotional-maroonDark mb-4 pb-2 border-b border-devotional-gold/25 uppercase tracking-wide">
                Live Bill Calculator
              </h3>

              {/* Order breakdown list */}
              {summary.items.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No items selected. Adjust quantities on the left to build your bill.
                </div>
              ) : (
                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
                  {summary.items.map(item => (
                    <div key={item.itemId} className="flex justify-between items-center text-xs text-gray-600 border-b border-gray-100 pb-1.5">
                      <div>
                        <span className="font-bold text-devotional-maroonDark">{item.name}</span>
                        <span className="text-[10px] text-gray-400 block">({item.size} - Qty: {item.quantity})</span>
                      </div>
                      <span className="font-semibold text-gray-700">₹{item.lineTotal}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Advance and Totals */}
              <div className="space-y-4 pt-2 border-t border-devotional-gold/20">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-gray-600">Grand Total:</span>
                  <span className="font-extrabold text-gray-800 text-lg">₹{summary.grandTotal}</span>
                </div>

                {/* Advance input field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Advance Payment Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={summary.grandTotal}
                    value={advancePayment || ''}
                    onChange={(e) => setAdvancePayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Enter advance amount"
                    disabled={summary.grandTotal === 0}
                    className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-sm disabled:bg-gray-100"
                  />
                </div>

                {/* Balance calculation */}
                <div className="bg-red-50/50 border border-red-200/50 rounded-xl p-3 flex justify-between items-center text-sm text-devotional-maroon">
                  <span className="font-bold">Balance Due:</span>
                  <span className="font-extrabold text-base">₹{summary.balanceDue}</span>
                </div>

                {/* Create/Preview Buttons */}
                <button
                  onClick={handleViewBill}
                  disabled={summary.items.length === 0}
                  className="w-full py-3 bg-devotional-maroon text-white font-bold rounded-xl hover:bg-devotional-maroonDark transition-all text-xs uppercase tracking-wider flex justify-center items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Eye size={16} />
                  <span>View Bill Preview</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Order History */}
        {activeTab === 'orders' && (
          <div className="bg-white/80 backdrop-blur-sm border border-devotional-gold/20 rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-devotional-maroonDark mb-4 flex items-center gap-1.5">
              ✦ Order & Bill History ✦
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-devotional-gold/30 text-xs font-bold text-devotional-maroon uppercase bg-devotional-gold/5">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-400">You haven't placed any orders yet.</td>
                    </tr>
                  ) : (
                    orders.map(order => {
                      const dateStr = new Date(order.createdAt).toLocaleDateString();
                      
                      // Compile simple line summaries
                      const summaryText = order.items.map(i => `${i.name} (${i.quantity})`).join(', ');

                      return (
                        <tr key={order.id} className="hover:bg-amber-50/10">
                          <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-600">#{order.id}</td>
                          <td className="py-3.5 px-4 text-xs">{dateStr}</td>
                          <td className="py-3.5 px-4 text-xs max-w-xs truncate" title={summaryText}>
                            {summaryText}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold">₹{order.grandTotal}</td>
                          <td className="py-3.5 px-4 text-right text-devotional-maroon font-bold">₹{order.balanceDue}</td>
                          
                          <td className="py-3.5 px-4 text-center">
                            {order.status === 'finalized' ? (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-200">
                                <CheckCircle size={10} />
                                Original Bill Ready
                              </span>
                            ) : order.status === 'rejected' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-200">
                                  <AlertCircle size={10} />
                                  Rejected by Workshop
                                </span>
                                {order.rejectionReason && (
                                  <span className="text-[8px] text-gray-500 max-w-[120px] truncate" title={order.rejectionReason}>
                                    {order.rejectionReason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                                <AlertCircle size={10} />
                                Pending Review
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Checking bill is always downloadable */}
                              <button
                                onClick={() => downloadLocalCheckingBill(order)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-devotional-maroon bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded"
                                title="Download Checking Bill PDF"
                              >
                                <Download size={12} />
                                <span>Checking</span>
                              </button>

                              {/* Original bill is only downloadable when finalized */}
                              <button
                                onClick={() => downloadServerOriginalBill(order.id)}
                                disabled={order.status !== 'finalized'}
                                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded transition-all ${
                                  order.status === 'finalized'
                                    ? 'bg-devotional-gold/20 text-devotional-maroon hover:bg-devotional-gold/45 cursor-pointer font-extrabold border border-devotional-gold/30'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-100'
                                }`}
                                title={order.status === 'finalized' ? "Download Original Final Bill PDF" : "Original Bill not yet approved by Admin"}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#FFFDF6] border-2 border-devotional-gold rounded-2xl overflow-hidden shadow-2xl animate-fadeIn relative my-8">
            
            {/* Modal Header */}
            <div className="bg-devotional-maroon text-devotional-cream px-6 py-4 flex justify-between items-center border-b border-devotional-gold">
              <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                <FileText size={16} className="text-devotional-gold" />
                On-Screen Bill Preview
              </h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-devotional-goldLight hover:text-white font-bold text-sm uppercase tracking-wider"
              >
                ✕ Close
              </button>
            </div>

            {/* Bill Paper Preview Area */}
            <div className="p-6 md:p-8 bg-white border-b border-gray-100 relative pdf-watermark-container">
              
              {/* Tiled Watermark Simulation */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.04] select-none flex flex-col justify-between p-12 overflow-hidden rotate-12">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="text-3xl font-extrabold text-devotional-maroon tracking-widest text-center whitespace-nowrap mb-6">
                    CHECKING BILL &nbsp;&nbsp;&nbsp;&nbsp; CHECKING BILL
                  </div>
                ))}
              </div>

              <div className="relative z-10 border border-gray-200 p-6 rounded-lg bg-[#FFFDF6]/50">
                {/* Header top row */}
                <div className="flex justify-between items-start border-b border-devotional-maroon/20 pb-4 mb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-devotional-maroon">G.KAMAL GANESHA WORKS</h2>
                    <p className="text-[10px] text-devotional-gold font-bold">PREMIUM MANUFACTURER</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-gray-800">G.Kamal Ganesha Works</p>
                    <p className="text-gray-500 font-semibold">Saraipalaya, Thanisandra Main Road, Vidyasagar, Bangalore - 560077</p>
                    <p className="text-devotional-maroon font-mono font-bold">9739142445 / 8792044625</p>
                  </div>
                </div>

                {/* Customer / Bill info row */}
                <div className="grid grid-cols-2 text-xs gap-4 mb-6">
                  <div>
                    <h4 className="font-bold text-devotional-maroon tracking-wide uppercase mb-1">To Customer:</h4>
                    <p className="font-semibold text-gray-700">{previewOrderData.customerDetails.name}</p>
                    <p className="text-gray-500">Phone: {previewOrderData.customerDetails.mobile}</p>
                    <p className="text-gray-500">Address: {previewOrderData.customerDetails.address}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-devotional-maroon tracking-wide uppercase mb-1">Bill Reference:</h4>
                    <p className="font-semibold text-gray-700">Order ID: #PREVIEW</p>
                    <p className="text-gray-500">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-devotional-orange font-bold uppercase">Status: CHECKING BILL</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-devotional-maroon text-devotional-cream font-bold">
                        <th className="p-2 rounded-l">Item</th>
                        <th className="p-2">Size</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right rounded-r">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewOrderData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-semibold text-devotional-maroonDark">{item.name}</td>
                          <td className="p-2">{item.size}</td>
                          <td className="p-2 text-right">₹{item.rate}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right font-bold">₹{item.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Box */}
                <div className="flex flex-col items-end gap-1.5 pt-2 border-t border-gray-100 text-xs text-gray-700">
                  <div className="flex justify-between w-48 border-b border-gray-100 pb-1">
                    <span>Grand Total:</span>
                    <span className="font-bold">₹{previewOrderData.grandTotal}</span>
                  </div>
                  <div className="flex justify-between w-48 border-b border-gray-100 pb-1">
                    <span>Advance Payment:</span>
                    <span className="font-semibold text-green-600">- ₹{previewOrderData.advancePayment}</span>
                  </div>
                  <div className="flex justify-between w-48 bg-red-50 text-devotional-maroon font-bold p-1.5 rounded">
                    <span>Balance Due:</span>
                    <span>₹{previewOrderData.balanceDue}</span>
                  </div>
                </div>

                {/* Warning note */}
                <div className="mt-8 text-center border-t border-dashed border-red-200 pt-4">
                  <p className="text-red-600 font-bold text-xs uppercase tracking-widest">
                    This is just a checking bill
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1 leading-relaxed">
                    This bill contains temporary values compiled for verification. The final authorized invoice will be generated upon workshop admin validation.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                ← Back & Edit
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tempOrder = {
                      id: 'PREVIEW',
                      customerDetails: {
                        name: customerProfile?.name || 'Customer',
                        mobile: customerProfile?.mobile || '',
                        email: customerProfile?.email || '',
                        address: customerProfile?.address || ''
                      },
                      items: previewOrderData.items,
                      grandTotal: previewOrderData.grandTotal,
                      advancePayment: previewOrderData.advancePayment,
                      balanceDue: previewOrderData.balanceDue,
                      status: 'pending_review'
                    };
                    const doc = generateBillPDF(tempOrder, 'CHECKING BILL', true);
                    downloadPDFBlob(doc, `Checking_Bill_${customerProfile?.name || 'Order'}.pdf`);
                  }}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider border border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download size={14} />
                  <span>Download Bill</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="bg-gradient-to-r from-devotional-orange to-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:from-devotional-marigold hover:to-devotional-orange transition-all duration-300 shadow-md text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Submit Order</span>
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
