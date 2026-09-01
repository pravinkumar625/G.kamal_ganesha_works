import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import DiyaDecoration from '../../components/DiyaDecoration';
import { generateBillPDF, downloadPDFBlob } from '../../utils/pdfGenerator';
import {
  Inbox,
  Database,
  Users,
  Activity,
  UserPlus,
  LogOut,
  Edit,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Save,
  Trash2,
  Plus,
  FileText,
  Download,
  Send,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  RotateCcw,
  Eye,
  CreditCard,
  Search,
  X,
  ShoppingBag,
  Calendar,
  Layers,
  MessageSquare,
  Radio,
  Check,
  XCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loginActivity, setLoginActivity] = useState([]);
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('active');

  // Admin Account Form
  const [newAdmin, setNewAdmin] = useState({ name: '', mobile: '', password: '' });
  
  // Catalog Item Form (Manufacturing / Cost Price is REMOVED as requested)
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    size: '',
    retailPrice: '',
    wholesalePrice: '',
    images: []
  });
  const [editingCatalogId, setEditingCatalogId] = useState(null);
  // Catalog image lightbox carousel state: { itemId, index }
  const [catalogLightbox, setCatalogLightbox] = useState(null);

  // Edit Order Modal & States
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderEditForm, setOrderEditForm] = useState(null);
  const [newItemToAdd, setNewItemToAdd] = useState({ itemId: '', quantity: 1, priceType: 'retail', customRate: '' });

  // Create New Order Modal & States
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    customerId: '',
    name: '',
    mobile: '',
    email: '',
    address: '',
    customerType: 'retail',
    items: [],
    advancePayment: 0,
    grandTotal: 0,
    balanceDue: 0
  });
  const [createOrderNewItem, setCreateOrderNewItem] = useState({ itemId: '', quantity: 1, customRate: '' });

  // Quick Amount / Due Edit Modal
  const [editingAmounts, setEditingAmounts] = useState(null);

  // Approve Order Modal
  const [approvingOrder, setApprovingOrder] = useState(null);
  const [modalError, setModalError] = useState('');

  // Reject Order Modal
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectModalError, setRejectModalError] = useState('');

  // View Bill Modal
  const [viewingBillOrder, setViewingBillOrder] = useState(null);

  // In-App Confirm Dialog Modal
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Ref to track if any interactive modal or form is currently open
  const isInteractingRef = useRef(false);
  useEffect(() => {
    isInteractingRef.current = !!(
      isCreateOrderOpen ||
      editingOrder ||
      editingAmounts ||
      editingCatalogId ||
      approvingOrder ||
      rejectingOrder ||
      viewingBillOrder
    );
  }, [isCreateOrderOpen, editingOrder, editingAmounts, editingCatalogId, approvingOrder, rejectingOrder, viewingBillOrder]);

  // Helper to update state only when content actually changes (prevents visual flickering/fluctuation)
  const setIfChanged = (setter, newVal) => {
    setter(prev => JSON.stringify(prev) === JSON.stringify(newVal) ? prev : newVal);
  };

  const fetchAllData = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'undefined' || token === 'null') return;
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [ordersRes, catalogRes, customersRes, activityRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/catalog', { headers }),
        fetch('/api/admin/customers', { headers }),
        fetch('/api/admin/login-activity', { headers })
      ]);
      if (ordersRes.ok) {
        const newOrders = await ordersRes.json();
        setIfChanged(setOrders, newOrders);
      }
      if (catalogRes.ok) {
        const newCatalog = await catalogRes.json();
        setIfChanged(setCatalog, newCatalog);
      }
      if (customersRes.ok) {
        const newCustomers = await customersRes.json();
        setIfChanged(setCustomers, newCustomers);
      }
      if (activityRes.ok) {
        const newActivity = await activityRes.json();
        setIfChanged(setLoginActivity, newActivity);
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

    // Auto-refresh order queue & dashboard data smoothly without thrashing
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('adminToken');
      if (currentToken && currentToken !== 'undefined' && currentToken !== 'null' && !isInteractingRef.current) {
        fetchAllData();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // --- CATALOG MANAGEMENT ---
  const handleCatalogSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const url = editingCatalogId ? `/api/admin/catalog/${editingCatalogId}` : '/api/admin/catalog';
    const method = editingCatalogId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name: catalogForm.name,
          size: catalogForm.size,
          retailPrice: Number(catalogForm.retailPrice),
          wholesalePrice: Number(catalogForm.wholesalePrice),
          images: catalogForm.images
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(editingCatalogId ? 'Catalog item updated successfully!' : 'Catalog item created successfully!');
      setCatalogForm({ name: '', size: '', retailPrice: '', wholesalePrice: '', images: [] });
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
      size: item.size,
      retailPrice: item.retailPrice,
      wholesalePrice: item.wholesalePrice,
      images: item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : [])
    });
  };

  const deleteCatalogItem = (id, name = '') => {
    setConfirmDialog({
      title: 'Delete Ganesha Model',
      message: `Are you sure you want to delete "${name || 'this model'}" from the catalog?`,
      confirmText: 'Delete Model',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        setSuccess('');

        try {
          const response = await fetch(`/api/admin/catalog/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);

          setSuccess('Item deleted successfully from catalog');
          fetchAllData();
        } catch (err) {
          setError(err.message || 'Failed to delete catalog item');
        }
      }
    });
  };

  // --- ORDER DELETION ---
  const deleteOrder = (orderId) => {
    setConfirmDialog({
      title: 'Delete Order Record',
      message: `Are you sure you want to permanently delete Order #${orderId}?`,
      confirmText: 'Delete Order',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        setSuccess('');

        try {
          const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);

          setSuccess(`Order #${orderId} deleted successfully.`);
          fetchAllData();
        } catch (err) {
          setError(err.message || 'Failed to delete order');
        }
      }
    });
  };

  // --- CUSTOMER DELETION & RESTORATION ---
  const handleDeleteCustomer = (customerId, customerName) => {
    setConfirmDialog({
      title: 'Move to Deleted List',
      message: `Are you sure you want to move customer "${customerName}" to the Deleted list?`,
      confirmText: 'Move to Deleted',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        setSuccess('');

        try {
          const response = await fetch(`/api/admin/customers/${customerId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);

          setSuccess(`Customer "${customerName}" moved to Deleted List.`);
          fetchAllData();
        } catch (err) {
          setError(err.message || 'Failed to delete customer');
        }
      }
    });
  };

  const handlePermanentDeleteCustomer = (customerId, customerName) => {
    setConfirmDialog({
      title: '⚠️ Permanently Delete Customer',
      message: `This will PERMANENTLY remove "${customerName}" and all their data from the system. This action CANNOT be undone!`,
      confirmText: 'Permanently Delete',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setError('');
        setSuccess('');
        try {
          const response = await fetch(`/api/admin/customers/${customerId}/permanent`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setSuccess(`Customer "${customerName}" permanently deleted.`);
          fetchAllData();
        } catch (err) {
          setError(err.message || 'Failed to permanently delete customer');
        }
      }
    });
  };

  const handleRestoreCustomer = async (customerId, customerName) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/customers/${customerId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Customer "${customerName}" restored to Active Customers.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to restore customer');
    }
  };

  // --- QUICK AMOUNT / DUE ADJUSTMENT ---
  const openAmountEditor = (customer, specificOrder = null) => {
    const targetOrder = specificOrder || (customer.orders && customer.orders[0]) || null;
    setEditingAmounts({
      customerId: customer.id,
      customerName: customer.name,
      orderId: targetOrder?.id || (customer.orders && customer.orders[0]?.id) || '',
      grandTotal: targetOrder ? targetOrder.grandTotal : customer.totalSpent,
      advancePayment: targetOrder ? targetOrder.advancePayment : customer.advancePaid,
      balanceDue: targetOrder ? targetOrder.balanceDue : customer.balanceDue
    });
  };

  const saveAmountAdjustment = async () => {
    if (!editingAmounts) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/customers/${editingAmounts.customerId}/adjust-amount`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          orderId: editingAmounts.orderId,
          grandTotal: Number(editingAmounts.grandTotal),
          advancePayment: Number(editingAmounts.advancePayment),
          balanceDue: Number(editingAmounts.balanceDue)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Amounts updated successfully for ${editingAmounts.customerName}!`);
      setEditingAmounts(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to update amounts');
    } finally {
      setLoading(false);
    }
  };

  // --- ADMIN PROVISIONING ---
  const handleAdminProvision = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(newAdmin)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Admin account for ${newAdmin.name} created successfully!`);
      setNewAdmin({ name: '', mobile: '', password: '' });
    } catch (err) {
      setError(err.message || 'Failed to add admin');
    }
  };

  // --- ORDER EDITING (WITH ADD & DELETE ITEMS + DIRECT AMOUNTS OVERRIDE) ---
  const startEditOrder = (order) => {
    setEditingOrder(order);
    const itemsSubtotal = (order.items || []).reduce((s, i) => s + (i.lineTotal || 0), 0);
    setOrderEditForm({
      id: order.id,
      name: order.customerDetails?.name || '',
      mobile: order.customerDetails?.mobile || '',
      email: order.customerDetails?.email || '',
      address: order.customerDetails?.address || '',
      customerType: order.customerDetails?.customerType || 'retail',
      advancePayment: order.advancePayment || 0,
      grandTotal: order.grandTotal || 0,
      balanceDue: order.balanceDue || 0,
      discount: order.discount || 0,
      extraCharges: order.extraCharges || 0,
      itemsSubtotal: itemsSubtotal,
      items: order.items ? [...order.items] : []
    });
    setNewItemToAdd({ itemId: '', quantity: 1, priceType: order.customerDetails?.customerType || 'retail', customRate: '' });
  };

  const recalcOrderTotals = (items, discount, extraCharges, advancePayment) => {
    const subtotal = items.reduce((s, i) => s + (i.lineTotal || 0), 0);
    const grandTotal = Math.max(0, subtotal - (Number(discount) || 0) + (Number(extraCharges) || 0));
    const balanceDue = Math.max(0, grandTotal - (Number(advancePayment) || 0));
    return { itemsSubtotal: subtotal, grandTotal, balanceDue };
  };

  const handleEditOrderItemQuantity = (idx, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    const updatedItems = [...orderEditForm.items];
    updatedItems[idx].quantity = qty;
    updatedItems[idx].lineTotal = updatedItems[idx].rate * qty;

    const { itemsSubtotal, grandTotal, balanceDue } = recalcOrderTotals(
      updatedItems, orderEditForm.discount, orderEditForm.extraCharges, orderEditForm.advancePayment
    );

    setOrderEditForm(prev => ({ ...prev, items: updatedItems, itemsSubtotal, grandTotal, balanceDue }));
  };

  const handleDeleteItemFromOrder = (idx) => {
    const updatedItems = orderEditForm.items.filter((_, i) => i !== idx);
    const { itemsSubtotal, grandTotal, balanceDue } = recalcOrderTotals(
      updatedItems, orderEditForm.discount, orderEditForm.extraCharges, orderEditForm.advancePayment
    );
    setOrderEditForm(prev => ({ ...prev, items: updatedItems, itemsSubtotal, grandTotal, balanceDue }));
  };

  const handleAddItemToExistingOrder = () => {
    if (!newItemToAdd.itemId) {
      alert('Please select a Ganesha model to add.');
      return;
    }
    const catItem = catalog.find(c => c.id === newItemToAdd.itemId);
    if (!catItem) return;

    const qty = Math.max(1, parseInt(newItemToAdd.quantity) || 1);
    const rate = newItemToAdd.customRate !== '' 
      ? Number(newItemToAdd.customRate) 
      : (newItemToAdd.priceType === 'wholesale' ? catItem.wholesalePrice : catItem.retailPrice);
    
    const newItem = {
      itemId: catItem.id,
      name: catItem.name,
      size: catItem.size,
      rate: rate,
      quantity: qty,
      lineTotal: rate * qty
    };

    const updatedItems = [...orderEditForm.items, newItem];
    const { itemsSubtotal, grandTotal, balanceDue } = recalcOrderTotals(
      updatedItems, orderEditForm.discount, orderEditForm.extraCharges, orderEditForm.advancePayment
    );
    setOrderEditForm(prev => ({ ...prev, items: updatedItems, itemsSubtotal, grandTotal, balanceDue }));
    setNewItemToAdd({ itemId: '', quantity: 1, priceType: orderEditForm.customerType || 'retail', customRate: '' });
  };

  const handleEditOrderFieldChange = (field, val) => {
    setOrderEditForm(prev => {
      const updated = { ...prev, [field]: val };
      if (['discount', 'extraCharges', 'advancePayment'].includes(field)) {
        const disc = field === 'discount' ? (Number(val) || 0) : (Number(prev.discount) || 0);
        const extra = field === 'extraCharges' ? (Number(val) || 0) : (Number(prev.extraCharges) || 0);
        const adv = field === 'advancePayment' ? (Number(val) || 0) : (Number(prev.advancePayment) || 0);
        const subtotal = Number(prev.itemsSubtotal) || 0;
        const grandTotal = Math.max(0, subtotal - disc + extra);
        updated.grandTotal = grandTotal;
        updated.balanceDue = Math.max(0, grandTotal - adv);
      }
      return updated;
    });
  };

  const saveEditedOrder = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      customerDetails: {
        name: orderEditForm.name,
        mobile: orderEditForm.mobile,
        email: orderEditForm.email,
        address: orderEditForm.address,
        customerType: orderEditForm.customerType
      },
      items: orderEditForm.items,
      discount: Number(orderEditForm.discount) || 0,
      extraCharges: Number(orderEditForm.extraCharges) || 0,
      grandTotal: Number(orderEditForm.grandTotal),
      advancePayment: Number(orderEditForm.advancePayment),
      balanceDue: Number(orderEditForm.balanceDue)
    };

    try {
      const response = await fetch(`/api/admin/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Order #${editingOrder.id} modified successfully!`);
      setEditingOrder(null);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to update order details');
    } finally {
      setLoading(false);
    }
  };

  // --- CREATE NEW ORDER BY ADMIN ---
  const handleOpenCreateOrder = () => {
    setNewOrderForm({
      customerId: '',
      name: '',
      mobile: '',
      email: '',
      address: '',
      customerType: 'retail',
      items: [],
      discount: 0,
      extraCharges: 0,
      itemsSubtotal: 0,
      advancePayment: 0,
      grandTotal: 0,
      balanceDue: 0
    });
    setCreateOrderNewItem({ itemId: '', quantity: 1, customRate: '' });
    setIsCreateOrderOpen(true);
  };

  const handleSelectCustomerForNewOrder = (customerId) => {
    if (!customerId) {
      setNewOrderForm(prev => ({
        ...prev,
        customerId: '',
        name: '',
        mobile: '',
        email: '',
        address: ''
      }));
      return;
    }
    const found = customers.find(c => c.id === customerId);
    if (found) {
      setNewOrderForm(prev => ({
        ...prev,
        customerId: found.id,
        name: found.name || '',
        mobile: found.mobile || '',
        email: found.email || '',
        address: found.address || '',
        customerType: found.customerType || 'retail'
      }));
    }
  };

  const handleAddItemToNewOrder = () => {
    if (!createOrderNewItem.itemId) {
      alert('Please select a Ganesha model to add.');
      return;
    }
    const catItem = catalog.find(c => c.id === createOrderNewItem.itemId);
    if (!catItem) return;

    const qty = Math.max(1, parseInt(createOrderNewItem.quantity) || 1);
    const rate = createOrderNewItem.customRate !== '' 
      ? Number(createOrderNewItem.customRate) 
      : (newOrderForm.customerType === 'wholesale' ? catItem.wholesalePrice : catItem.retailPrice);
    
    const newItem = {
      itemId: catItem.id,
      name: catItem.name,
      size: catItem.size,
      rate: rate,
      quantity: qty,
      lineTotal: rate * qty
    };

    const updatedItems = [...newOrderForm.items, newItem];
    const calculatedGrandTotal = updatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const subtotal = updatedItems.reduce((s, i) => s + i.lineTotal, 0);
    const grandTotal = Math.max(0, subtotal - (Number(newOrderForm.discount) || 0) + (Number(newOrderForm.extraCharges) || 0));
    const balanceDue = Math.max(0, grandTotal - (Number(newOrderForm.advancePayment) || 0));

    setNewOrderForm(prev => ({
      ...prev,
      items: updatedItems,
      itemsSubtotal: subtotal,
      grandTotal,
      balanceDue
    }));

    setCreateOrderNewItem({ itemId: '', quantity: 1, customRate: '' });
  };

  const handleDeleteItemFromNewOrder = (idx) => {
    const updatedItems = newOrderForm.items.filter((_, i) => i !== idx);
    const subtotal = updatedItems.reduce((s, i) => s + i.lineTotal, 0);
    const grandTotal = Math.max(0, subtotal - (Number(newOrderForm.discount) || 0) + (Number(newOrderForm.extraCharges) || 0));
    const balanceDue = Math.max(0, grandTotal - (Number(newOrderForm.advancePayment) || 0));
    setNewOrderForm(prev => ({ ...prev, items: updatedItems, itemsSubtotal: subtotal, grandTotal, balanceDue }));
  };

  const handleCreateOrderSubmit = async (finalizeImmediately = false) => {
    if (!newOrderForm.name.trim() || !newOrderForm.mobile.trim()) {
      alert('Please provide Customer Name and Mobile Number.');
      return;
    }
    if (newOrderForm.items.length === 0) {
      alert('Please add at least one Ganesha idol to the order.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        customerDetails: {
          name: newOrderForm.name.trim(),
          mobile: newOrderForm.mobile.trim(),
          email: newOrderForm.email ? newOrderForm.email.trim() : '',
          address: newOrderForm.address ? newOrderForm.address.trim() : '',
          customerType: newOrderForm.customerType
        },
        items: newOrderForm.items,
        discount: Number(newOrderForm.discount) || 0,
        extraCharges: Number(newOrderForm.extraCharges) || 0,
        grandTotal: Number(newOrderForm.grandTotal),
        advancePayment: Number(newOrderForm.advancePayment),
        balanceDue: Number(newOrderForm.balanceDue),
        status: finalizeImmediately ? 'finalized' : 'pending_review'
      };

      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(payload)
      });

      const createdOrder = await response.json();
      if (!response.ok) throw new Error(createdOrder.error);

      if (finalizeImmediately) {
        // Generate and download Original Bill PDF immediately
        const doc = generateBillPDF(createdOrder, 'G.kamal ganesha works', false);
        const pdfBase64 = doc.output('datauristring');
        
        // Save PDF to backend & dispatch SMS
        await fetch(`/api/admin/orders/${createdOrder.id}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({ pdfBase64 })
        });

        setSuccess(`Order #${createdOrder.id} created & submitted successfully!`);
      } else {
        setSuccess(`New Order #${createdOrder.id} submitted successfully!`);
      }

      setIsCreateOrderOpen(false);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to create new order');
    } finally {
      setLoading(false);
    }
  };

  // --- ORDER APPROVAL & SENDING ---
  const startApproveOrder = (order) => {
    setModalError('');
    const cleanId = String(order?.id || '').replace(/^#/, '').trim();
    // Get latest state of this order from orders array
    const fresh = orders.find(o => String(o.id).replace(/^#/, '').trim() === cleanId) || order;
    setApprovingOrder({ ...fresh, id: cleanId });
  };

  const handleConfirmApproval = async () => {
    if (!approvingOrder) return;
    setError('');
    setSuccess('');
    setModalError('');
    setLoading(true);

    const cleanId = String(approvingOrder.id || '').replace(/^#/, '').trim();
    const token = localStorage.getItem('adminToken');

    try {
      if (!token || token === 'undefined' || token === 'null') {
        throw new Error('Admin session expired. Please log in again.');
      }

      let pdfBase64 = '';
      try {
        const doc = generateBillPDF(approvingOrder, 'G.kamal ganesha works', false);
        pdfBase64 = doc.output('datauristring');
      } catch (pdfErr) {
        console.warn('PDF generation in browser encountered warning, proceeding with approval:', pdfErr);
      }

      const bodyPayload = (pdfBase64 && pdfBase64.length < 2000000) ? { pdfBase64 } : {};

      const response = await fetch(`/api/admin/orders/${encodeURIComponent(cleanId)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to approve order');

      // Optimistic state update
      setOrders(prev => prev.map(o => String(o.id).replace(/^#/, '').trim() === cleanId ? { ...o, status: 'finalized', rejectionReason: '' } : o));
      setSuccess(`Order #${cleanId} has been accepted & approved successfully!`);
      setApprovingOrder(null);
      fetchAllData();
    } catch (err) {
      console.error('Error approving order:', err);
      setModalError(err.message || 'Failed to approve order.');
      setError(err.message || 'Failed to approve order.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBillPDF = (order) => {
    const isChecking = order.status !== 'finalized';
    const watermarkText = isChecking ? 'CHECKING BILL' : 'G.kamal ganesha works';
    const doc = generateBillPDF(order, watermarkText, isChecking);
    downloadPDFBlob(doc, `Ganesha_Bill_${order.id || 'Draft'}.pdf`);
  };

  // --- ORDER REJECTION ---
  const startRejectOrder = (order) => {
    setRejectModalError('');
    const cleanId = String(order?.id || '').replace(/^#/, '').trim();
    const fresh = orders.find(o => String(o.id).replace(/^#/, '').trim() === cleanId) || order;
    setRejectingOrder({ ...fresh, id: cleanId });
    setRejectionReason(fresh.rejectionReason || 'Cannot fulfill order at this time / Out of stock');
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    setError('');
    setSuccess('');
    setRejectModalError('');
    setLoading(true);

    const cleanId = String(rejectingOrder.id || '').replace(/^#/, '').trim();
    const token = localStorage.getItem('adminToken');

    try {
      if (!token || token === 'undefined' || token === 'null') {
        throw new Error('Admin session expired. Please log in again.');
      }

      const reasonToSet = (rejectionReason && rejectionReason.trim()) || 'Cannot fulfill order at this time / Out of stock';
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(cleanId)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reasonToSet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order');

      // Optimistic state update
      setOrders(prev => prev.map(o => String(o.id).replace(/^#/, '').trim() === cleanId ? { ...o, status: 'rejected', rejectionReason: reasonToSet } : o));
      setSuccess(`Order #${cleanId} marked as Rejected.`);
      setRejectingOrder(null);
      fetchAllData();
    } catch (err) {
      console.error('Error rejecting order:', err);
      setRejectModalError(err.message || 'Failed to reject order.');
      setError(err.message || 'Failed to reject order.');
    } finally {
      setLoading(false);
    }
  };

  // --- RESET ORDER TO PENDING REVIEW ---
  const handleResetToPending = async (order) => {
    setError('');
    setSuccess('');
    setLoading(true);
    const cleanId = String(order?.id || '').replace(/^#/, '').trim();
    const token = localStorage.getItem('adminToken');
    try {
      if (!token || token === 'undefined' || token === 'null') {
        throw new Error('Admin session expired. Please log in again.');
      }
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(cleanId)}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset order');

      setOrders(prev => prev.map(o => String(o.id).replace(/^#/, '').trim() === cleanId ? { ...o, status: 'pending_review', rejectionReason: '' } : o));
      setSuccess(`Order #${cleanId} status reset to Pending Review.`);
      fetchAllData();
    } catch (err) {
      console.error('Error resetting order:', err);
      setError(err.message || 'Failed to reset order status');
    } finally {
      setLoading(false);
    }
  };

  // Filter login logs
  const filteredActivity = loginActivity.filter(log => 
    log.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.mobile?.includes(searchQuery)
  );

  // Filtered customer list for Customer Directory
  const activeCustomers = customers.filter(c => !c.deleted);
  const deletedCustomers = customers.filter(c => c.deleted);
  const baseCustomers = customerFilter === 'active' 
    ? activeCustomers 
    : customerFilter === 'deleted' 
      ? deletedCustomers 
      : customers;

  const displayedCustomers = baseCustomers.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (c.name || '').toLowerCase().includes(q);
    const phoneMatch = (c.mobile || '').includes(q);
    const emailMatch = (c.email || '').toLowerCase().includes(q);
    const addressMatch = (c.address || '').toLowerCase().includes(q);
    const dateMatch = c.registeredAt ? new Date(c.registeredAt).toLocaleDateString().includes(q) : false;
    return nameMatch || phoneMatch || emailMatch || addressMatch || dateMatch;
  });

  // Filtered Orders for Order Queue (by Customer Name, Phone, Order ID, Date, Item)
  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const idMatch = (o.id || '').toLowerCase().includes(q);
    const nameMatch = (o.customerDetails?.name || '').toLowerCase().includes(q);
    const phoneMatch = (o.customerDetails?.mobile || '').includes(q);
    const emailMatch = (o.customerDetails?.email || '').toLowerCase().includes(q);
    const addressMatch = (o.customerDetails?.address || '').toLowerCase().includes(q);
    const itemsMatch = (o.items || []).some(i => (i.name || '').toLowerCase().includes(q));
    const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '';
    const dateMatch = dateStr.includes(q) || (o.createdAt || '').toLowerCase().includes(q);
    return idMatch || nameMatch || phoneMatch || emailMatch || addressMatch || itemsMatch || dateMatch;
  });

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Header Banner */}
        <div className="glass-panel p-6 sm:p-8 border border-[#ffd700]/30 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <DiyaDecoration className="w-12 h-12 animate-float" />
            <div>
              <h2 className="font-cinzel text-xl sm:text-2xl font-extrabold text-gold-gradient tracking-wide uppercase">
                Admin Control Dashboard
              </h2>
              <p className="text-xs text-[#ffebc2] font-medium mt-0.5">
                G.Kamal Ganesha Works • Workshop Manager & Operations
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Create Order Trigger */}
            <button
              onClick={handleOpenCreateOrder}
              className="btn-gold px-4 py-2.5 text-xs flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
            >
              <Plus size={15} />
              <span>+ Create Order</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="mb-6 glass-panel p-3.5 border border-[#ffd700]/25 shadow-lg flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-grow w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ffd700]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer Name, Phone Number, Order ID (e.g. 2026-001), or Date..."
              className="w-full pl-10 pr-10 py-2.5 input-glass text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-bold text-[#ffd700] whitespace-nowrap bg-[#ffd700]/15 px-3 py-1.5 rounded-lg border border-[#ffd700]/30">
              Filtering by: "{searchQuery}"
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/70 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'orders'
                  ? 'btn-gold shadow-lg'
                  : 'glass-panel text-[#ffebc2] border-[#ffd700]/15 hover:border-[#ffd700]/40'
              }`}
            >
              <Inbox size={16} />
              <span>Orders Intake</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'catalog'
                  ? 'btn-gold shadow-lg'
                  : 'glass-panel text-[#ffebc2] border-[#ffd700]/15 hover:border-[#ffd700]/40'
              }`}
            >
              <Database size={16} />
              <span>Catalog Manager</span>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'customers'
                  ? 'btn-gold shadow-lg'
                  : 'glass-panel text-[#ffebc2] border-[#ffd700]/15 hover:border-[#ffd700]/40'
              }`}
            >
              <Users size={16} />
              <span>Customers List</span>
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'revenue'
                  ? 'btn-gold shadow-lg'
                  : 'glass-panel text-[#ffebc2] border-[#ffd700]/15 hover:border-[#ffd700]/40'
              }`}
            >
              <TrendingUp size={16} />
              <span>Revenue & Dues</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'activity'
                  ? 'btn-gold shadow-lg'
                  : 'glass-panel text-[#ffebc2] border-[#ffd700]/15 hover:border-[#ffd700]/40'
              }`}
            >
              <Activity size={16} />
              <span>Login Activity</span>
            </button>
            <button
              onClick={() => setActiveTab('add_admin')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'add_admin'
                  ? 'btn-gold shadow-lg'
                  : 'glass-panel text-[#ffebc2] border-[#ffd700]/15 hover:border-[#ffd700]/40'
              }`}
            >
              <UserPlus size={16} />
              <span>Add Admin</span>
            </button>
          </div>

          <div className="lg:col-span-4 glass-panel border border-[#ffd700]/25 rounded-2xl p-6 sm:p-8 shadow-2xl min-h-[50vh]">
            
            {/* TAB: ORDERS INTAKE */}
            {activeTab === 'orders' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-3 border-b border-[#ffd700]/20 gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-cinzel text-lg font-bold text-gold-gradient uppercase tracking-wide">
                        Order Queue & Processing
                      </h3>
                      <span className="flex items-center gap-1.5 badge-green text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Live Sync
                      </span>
                    </div>
                    <span className="text-xs text-[#cbd5e1] font-medium mt-0.5 block">
                      Showing {filteredOrders.length} of {orders.length} orders
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={fetchAllData}
                      className="btn-outline-gold px-3 py-2 text-xs flex items-center gap-1.5"
                      title="Instantly refresh order queue"
                    >
                      <RotateCcw size={13} className="text-[#ffd700]" />
                      <span>Refresh</span>
                    </button>

                    <button
                      onClick={handleOpenCreateOrder}
                      className="btn-gold px-4 py-2 text-xs flex items-center gap-1.5 shadow-lg"
                    >
                      <Plus size={14} />
                      <span>Create New Order</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#ffd700]/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#ffd700]/30 font-cinzel font-bold text-[#ffd700] uppercase bg-[#ffd700]/10 text-[11px]">
                        <th className="py-3.5 px-3">Order ID</th>
                        <th className="py-3.5 px-3">Customer Details</th>
                        <th className="py-3.5 px-3">Items Summary</th>
                        <th className="py-3.5 px-3 text-right">Grand Total</th>
                        <th className="py-3.5 px-3 text-right">Advance Paid</th>
                        <th className="py-3.5 px-3 text-right">Balance Due</th>
                        <th className="py-3.5 px-3 text-center">Status</th>
                        <th className="py-3.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/10">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-[#cbd5e1]">
                            {searchQuery ? `No orders found matching "${searchQuery}".` : 'No orders placed yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(order => {
                          const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
                          const itemsSummary = order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'No items';

                          return (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 px-3 font-mono text-xs font-bold text-[#ffd700]">
                                #{order.id}
                                <span className="block text-[10px] text-[#cbd5e1] font-normal mt-0.5">{dateStr}</span>
                              </td>
                              <td className="py-4 px-3">
                                <div className="font-bold text-white text-sm">{order.customerDetails?.name || 'Customer'}</div>
                                <div className="text-xs text-[#ffd700] font-mono mt-0.5">📞 {order.customerDetails?.mobile}</div>
                                {order.customerDetails?.address && (
                                  <div className="text-[11px] text-[#cbd5e1] max-w-[150px] truncate mt-0.5" title={order.customerDetails?.address}>
                                    📍 {order.customerDetails?.address}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-3 max-w-[170px] truncate text-[#f8fafc]" title={itemsSummary}>
                                {itemsSummary}
                              </td>
                              <td className="py-4 px-3 text-right font-cinzel font-bold text-[#ffd700] text-sm">₹{order.grandTotal?.toLocaleString()}</td>
                              <td className="py-4 px-3 text-right font-semibold text-emerald-400">₹{order.advancePayment?.toLocaleString() || 0}</td>
                              <td className="py-4 px-3 text-right font-bold text-red-400 text-sm">₹{order.balanceDue?.toLocaleString()}</td>
                              
                              <td className="py-4 px-3 text-center">
                                {order.status === 'finalized' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="badge-green text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                      <CheckCircle size={10} />
                                      Approved
                                    </span>
                                    <span className="text-[9px] text-cyan-300 font-bold flex items-center gap-0.5">
                                      <MessageSquare size={9} /> SMS Sent
                                    </span>
                                  </div>
                                ) : order.status === 'rejected' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="badge-red text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                      <XCircle size={10} />
                                      Rejected
                                    </span>
                                    {order.rejectionReason && (
                                      <span className="text-[9px] text-red-300 max-w-[110px] truncate" title={order.rejectionReason}>
                                        {order.rejectionReason}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="badge-gold text-[10px] font-bold px-2.5 py-1 rounded-full">
                                    Pending Review
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Bill Preview */}
                                  <button
                                    onClick={() => setViewingBillOrder(order)}
                                    className="p-2 text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 rounded-lg border border-cyan-500/40 transition-colors"
                                    title="View Full Bill on Screen"
                                  >
                                    <Eye size={14} />
                                  </button>

                                  {/* Edit Order Items & Amounts */}
                                  <button
                                    onClick={() => startEditOrder(order)}
                                    className="p-2 text-[#ffebc2] hover:text-white bg-white/10 hover:bg-white/20 rounded-lg border border-[#ffd700]/30 transition-colors"
                                    title="Modify Order Items & Amounts"
                                  >
                                    <Edit size={14} />
                                  </button>

                                  {/* Download PDF Bill */}
                                  <button
                                    onClick={() => downloadBillPDF(order)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold text-xs shadow-sm transition-all ${
                                      order.status === 'finalized'
                                        ? 'btn-gold'
                                        : 'bg-white/10 text-[#ffd700] hover:bg-white/20 border-[#ffd700]/30'
                                    }`}
                                    title={order.status === 'finalized' ? "Download Approved Final PDF Bill" : "Download Checking Bill PDF"}
                                  >
                                    <Download size={13} />
                                    <span>PDF</span>
                                  </button>

                                  {/* Accept / Approve Button (shown if not already finalized) */}
                                  {order.status !== 'finalized' && (
                                    <button
                                      onClick={() => startApproveOrder(order)}
                                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow transition-all"
                                      title="Accept & Finalize Order (Send Final Bill via SMS)"
                                    >
                                      <CheckCircle size={13} />
                                      <span>Accept</span>
                                    </button>
                                  )}

                                  {/* Reject Button (shown if not rejected) */}
                                  {order.status !== 'rejected' && (
                                    <button
                                      onClick={() => startRejectOrder(order)}
                                      className="flex items-center gap-1 bg-red-950/60 text-red-300 hover:bg-red-900/60 border border-red-500/40 px-2.5 py-1.5 rounded-lg font-bold text-xs shadow transition-all"
                                      title="Reject Order & Specify Reason"
                                    >
                                      <XCircle size={13} />
                                      <span>Reject</span>
                                    </button>
                                  )}

                                  {/* Modify Rejection Reason (shown if rejected) */}
                                  {order.status === 'rejected' && (
                                    <button
                                      onClick={() => startRejectOrder(order)}
                                      className="flex items-center gap-1 bg-white/10 text-[#cbd5e1] hover:text-white border border-white/20 px-2 py-1.5 rounded-lg font-semibold text-[10px]"
                                      title="Modify Rejection Reason"
                                    >
                                      <Edit size={11} />
                                      <span>Reason</span>
                                    </button>
                                  )}

                                  {/* Reset / Reopen Order to Pending Review (shown if finalized or rejected) */}
                                  {order.status !== 'pending_review' && (
                                    <button
                                      onClick={() => handleResetToPending(order)}
                                      className="p-2 text-[#ffd700] hover:text-white bg-[#ffd700]/15 hover:bg-[#ffd700]/30 rounded-lg border border-[#ffd700]/40 transition-colors"
                                      title="Reopen / Reset status to Pending Review"
                                    >
                                      <RotateCcw size={14} />
                                    </button>
                                  )}

                                  {/* Delete Order Button */}
                                  <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="p-2 text-red-400 hover:text-red-200 bg-red-950/60 hover:bg-red-900/60 rounded-lg border border-red-500/30 transition-colors"
                                    title="Delete Order"
                                  >
                                    <Trash2 size={14} />
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

            {/* TAB: CATALOG MANAGER */}
            {activeTab === 'catalog' && (
              <div>
                <h3 className="font-cinzel text-lg font-bold text-gold-gradient mb-6 pb-3 border-b border-[#ffd700]/20 uppercase tracking-wide">
                  Catalog Manager
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Add / Edit Form */}
                  <div className="md:col-span-1 glass-panel border border-[#ffd700]/30 p-5 rounded-2xl">
                    <h4 className="font-cinzel font-bold text-xs uppercase tracking-wider text-[#ffd700] mb-4">
                      {editingCatalogId ? 'Edit Model' : 'Add Ganesha Model'}
                    </h4>
                    <form onSubmit={handleCatalogSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">Item Name</label>
                        <input
                          type="text"
                          required
                          value={catalogForm.name}
                          onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                          placeholder="e.g. Clay Bal Ganesha"
                          className="w-full px-3 py-2 input-glass text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">Size Option</label>
                        <input
                          type="text"
                          required
                          value={catalogForm.size}
                          onChange={(e) => setCatalogForm({ ...catalogForm, size: e.target.value })}
                          placeholder="e.g. 1/4 ft, 1 ft, 2.5 ft"
                          className="w-full px-3 py-2 input-glass text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">Retail Price (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={catalogForm.retailPrice}
                          onChange={(e) => setCatalogForm({ ...catalogForm, retailPrice: e.target.value })}
                          placeholder="Retail Price Rate"
                          className="w-full px-3 py-2 input-glass text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">Wholesale Price (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={catalogForm.wholesalePrice}
                          onChange={(e) => setCatalogForm({ ...catalogForm, wholesalePrice: e.target.value })}
                          placeholder="Wholesale Price Rate"
                          className="w-full px-3 py-2 input-glass text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">Ganesha Images (Multiple)</label>
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
                          className="w-full text-xs text-[#cbd5e1] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#ffd700]/20 file:text-[#ffd700] hover:file:bg-[#ffd700]/30 cursor-pointer"
                        />
                        {catalogForm.images && catalogForm.images.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {catalogForm.images.map((img, idx) => (
                              <div key={idx} className="relative group w-12 h-12">
                                <img src={img} alt={`Preview ${idx+1}`} className="w-12 h-12 object-cover rounded-lg border border-[#ffd700]/40" />
                                <button
                                  type="button"
                                  onClick={() => setCatalogForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold shadow"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {editingCatalogId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatalogId(null);
                              setCatalogForm({ name: '', size: '', retailPrice: '', wholesalePrice: '', images: [] });
                            }}
                            className="w-1/3 py-2 border border-white/20 rounded-lg text-xs font-bold uppercase text-[#cbd5e1] hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-grow py-2.5 btn-gold text-xs shadow-lg"
                        >
                          {editingCatalogId ? 'Update Item' : 'Add Item'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Catalog List */}
                  <div className="md:col-span-2">
                    {/* Catalog Image Lightbox */}
                    {catalogLightbox && (() => {
                      const lbItem = catalog.find(i => i.id === catalogLightbox.itemId);
                      const lbImages = lbItem ? (lbItem.images && lbItem.images.length > 0 ? lbItem.images : (lbItem.image ? [lbItem.image] : [])) : [];
                      const lbIdx = catalogLightbox.index;
                      return (
                        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setCatalogLightbox(null)}>
                          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                            <img src={lbImages[lbIdx]} alt="Preview" className="w-full max-h-[70vh] object-contain rounded-xl shadow-2xl border border-[#ffd700]/30" />
                            <div className="absolute inset-y-0 left-0 flex items-center">
                              {lbIdx > 0 && (
                                <button onClick={() => setCatalogLightbox({ ...catalogLightbox, index: lbIdx - 1 })} className="ml-2 p-2 bg-black/70 text-[#ffd700] rounded-full shadow hover:bg-black border border-[#ffd700]/30">
                                  <ChevronLeft size={18} />
                                </button>
                              )}
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center">
                              {lbIdx < lbImages.length - 1 && (
                                <button onClick={() => setCatalogLightbox({ ...catalogLightbox, index: lbIdx + 1 })} className="mr-2 p-2 bg-black/70 text-[#ffd700] rounded-full shadow hover:bg-black border border-[#ffd700]/30">
                                  <ChevronRight size={18} />
                                </button>
                              )}
                            </div>
                            <div className="text-center text-[#ffebc2] text-xs mt-3 font-semibold">{lbItem?.name} — Photo {lbIdx + 1} of {lbImages.length}</div>
                            <button onClick={() => setCatalogLightbox(null)} className="absolute top-2 right-2 bg-black/70 text-[#ffd700] rounded-full p-1.5 text-xs font-bold hover:bg-black border border-[#ffd700]/30">✕</button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="overflow-x-auto border border-[#ffd700]/20 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#ffd700]/30 font-cinzel font-bold text-[#ffd700] uppercase bg-[#ffd700]/10 text-[11px]">
                            <th className="py-3 px-3">Photos</th>
                            <th className="py-3 px-3">Model</th>
                            <th className="py-3 px-3">Size</th>
                            <th className="py-3 px-3 text-right">Retail (₹)</th>
                            <th className="py-3 px-3 text-right">Wholesale (₹)</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffd700]/10">
                          {catalog.map(item => {
                            const allImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
                            return (
                              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 px-3">
                                  {allImages.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      {allImages.slice(0, 3).map((img, idx) => (
                                        <button key={idx} onClick={() => setCatalogLightbox({ itemId: item.id, index: idx })} className="relative flex-shrink-0">
                                          <img src={img} alt={`${item.name} ${idx+1}`} className="w-10 h-10 object-cover rounded border border-[#ffd700]/30 hover:border-[#ffd700] transition-all" />
                                        </button>
                                      ))}
                                      {allImages.length > 3 && (
                                        <button onClick={() => setCatalogLightbox({ itemId: item.id, index: 3 })} className="w-10 h-10 bg-[#ffd700]/15 border border-[#ffd700]/30 rounded flex items-center justify-center text-[#ffd700] text-[9px] font-bold">
                                          +{allImages.length - 3}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 bg-white/5 border border-dashed border-[#ffd700]/20 rounded flex items-center justify-center">
                                      <ImageIcon size={14} className="text-[#ffd700]/40" />
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-bold text-white text-sm">{item.name}</td>
                                <td className="py-3 px-3"><span className="bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30 px-2 py-0.5 rounded text-[10px] font-semibold">{item.size}</span></td>
                                <td className="py-3 px-3 text-right font-cinzel font-bold text-[#ffd700]">₹{item.retailPrice?.toLocaleString()}</td>
                                <td className="py-3 px-3 text-right font-cinzel font-bold text-[#ff9933]">₹{item.wholesalePrice?.toLocaleString()}</td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => startEditCatalog(item)}
                                      className="p-1.5 hover:bg-cyan-950/60 rounded-lg text-cyan-300 border border-cyan-500/30"
                                      title="Edit Item"
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      onClick={() => deleteCatalogItem(item.id)}
                                      className="p-1.5 hover:bg-red-950/60 rounded-lg text-red-400 border border-red-500/30"
                                      title="Delete Item"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CUSTOMERS DIRECTORY (ACTIVE & DELETED CUSTOMERS) */}
            {activeTab === 'customers' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-3 border-b border-[#ffd700]/20 gap-3">
                  <div>
                    <h3 className="font-cinzel text-lg font-bold text-gold-gradient uppercase tracking-wide">
                      Customers Directory
                    </h3>
                    <span className="text-xs text-[#cbd5e1] font-medium mt-0.5 block">
                      Showing {displayedCustomers.length} of {baseCustomers.length} profiles
                    </span>
                  </div>

                  {/* Filter Pill Buttons */}
                  <div className="flex items-center gap-1.5 glass-panel-subtle p-1 rounded-xl border border-[#ffd700]/25 text-xs">
                    <button
                      onClick={() => setCustomerFilter('active')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        customerFilter === 'active'
                          ? 'btn-gold shadow-sm'
                          : 'text-[#ffebc2] hover:text-white'
                      }`}
                    >
                      Active ({activeCustomers.length})
                    </button>
                    <button
                      onClick={() => setCustomerFilter('deleted')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        customerFilter === 'deleted'
                          ? 'bg-red-700 text-white shadow-sm'
                          : 'text-red-300 hover:text-white'
                      }`}
                    >
                      <Trash2 size={12} />
                      <span>Deleted ({deletedCustomers.length})</span>
                    </button>
                    <button
                      onClick={() => setCustomerFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        customerFilter === 'all'
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-[#cbd5e1] hover:text-white'
                      }`}
                    >
                      All ({customers.length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#ffd700]/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#ffd700]/30 font-cinzel font-bold text-[#ffd700] uppercase bg-[#ffd700]/10 text-[11px]">
                        <th className="py-3.5 px-3">Customer Profile</th>
                        <th className="py-3.5 px-3">Type</th>
                        <th className="py-3.5 px-3">Joined Date</th>
                        <th className="py-3.5 px-3 text-center">Orders</th>
                        <th className="py-3.5 px-3 text-right">Total Spent</th>
                        <th className="py-3.5 px-3 text-right">Advance Paid</th>
                        <th className="py-3.5 px-3 text-right">Balance Due</th>
                        <th className="py-3.5 px-3 text-center">Status</th>
                        <th className="py-3.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/10">
                      {displayedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-12 text-center text-[#cbd5e1]">
                            {searchQuery ? `No customer profiles matching "${searchQuery}".` : (customerFilter === 'deleted' ? 'No deleted customer profiles found.' : 'No customer profiles found.')}
                          </td>
                        </tr>
                      ) : (
                        displayedCustomers.map(c => {
                          const joinDate = c.registeredAt ? new Date(c.registeredAt).toLocaleDateString() : 'N/A';
                          const latestOrder = c.orders && c.orders.length > 0 ? c.orders[0] : null;

                          return (
                            <tr key={c.id} className={`hover:bg-white/5 transition-colors ${c.deleted ? 'bg-red-950/20' : ''}`}>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                                  <span>{c.name || 'No Name'}</span>
                                  {c.deleted && (
                                    <span className="badge-red text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                                      Deleted
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#ffd700] font-mono mt-0.5">📞 {c.mobile}</div>
                                {c.email && <div className="text-[10px] text-[#cbd5e1]">✉ {c.email}</div>}
                                {c.address && <div className="text-[10px] text-[#cbd5e1] truncate max-w-[150px]">📍 {c.address}</div>}
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  c.customerType === 'wholesale'
                                    ? 'bg-blue-950/60 text-cyan-300 border border-cyan-500/40'
                                    : 'badge-gold'
                                }`}>{c.customerType === 'wholesale' ? '🏭 Wholesale' : '🛍 Retail'}</span>
                              </td>
                              <td className="py-3.5 px-3 text-[#cbd5e1] whitespace-nowrap">{joinDate}</td>
                              <td className="py-3.5 px-3 text-center font-bold text-white">{c.totalOrders}</td>
                              <td className="py-3.5 px-3 text-right font-cinzel font-bold text-[#ffd700]">₹{c.totalSpent?.toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-right font-semibold text-emerald-400">₹{c.advancePaid?.toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-right font-bold text-red-400 font-cinzel">
                                ₹{c.balanceDue?.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {c.deleted ? (
                                  <span className="badge-red text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    Deleted
                                  </span>
                                ) : (
                                  <span className="badge-green text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Bill */}
                                  {latestOrder && (
                                    <button
                                      onClick={() => {
                                        const fullOrder = orders.find(o => o.id === latestOrder.id) || {
                                          ...latestOrder,
                                          customerDetails: { name: c.name, mobile: c.mobile, email: c.email, address: c.address }
                                        };
                                        setViewingBillOrder(fullOrder);
                                      }}
                                      className="p-1.5 text-cyan-300 hover:text-white bg-cyan-950/60 rounded-lg border border-cyan-500/30"
                                      title="View Customer Bill"
                                    >
                                      <Eye size={13} />
                                    </button>
                                  )}

                                  {/* Edit Amounts */}
                                  <button
                                    onClick={() => openAmountEditor(c)}
                                    className="p-1.5 text-[#ffd700] hover:text-white bg-[#ffd700]/15 rounded-lg border border-[#ffd700]/30"
                                    title="Edit Total Amount & Due Amount"
                                  >
                                    <Edit size={13} />
                                  </button>

                                  {/* Delete or Restore */}
                                  {c.deleted ? (
                                    <>
                                      <button
                                        onClick={() => handleRestoreCustomer(c.id, c.name)}
                                        className="p-1.5 text-emerald-400 hover:text-white bg-emerald-950/60 rounded-lg border border-emerald-500/30"
                                        title="Restore Customer Profile"
                                      >
                                        <RotateCcw size={13} />
                                      </button>
                                      <button
                                        onClick={() => handlePermanentDeleteCustomer(c.id, c.name)}
                                        className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-lg border border-red-500"
                                        title="Permanently Delete (Cannot be undone)"
                                      >
                                        <X size={13} />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteCustomer(c.id, c.name)}
                                      className="p-1.5 text-red-400 hover:text-red-200 bg-red-950/60 rounded-lg border border-red-500/30"
                                      title="Move Customer to Deleted List"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
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

            {/* TAB: REVENUE & DUES */}
            {activeTab === 'revenue' && (() => {
              const allOrders = orders || [];
              const activeCustList = customers.filter(c => !c.deleted);
              const activeCustIds = new Set(activeCustList.map(c => c.id));
              const activeCustMobiles = new Set(activeCustList.map(c => c.mobile ? c.mobile.replace(/\D/g, '').slice(-10) : '').filter(Boolean));

              const isOrderForActiveCust = (o) => {
                if (o.customerId && activeCustIds.has(o.customerId)) return true;
                const ordMobile = o.customerDetails?.mobile ? o.customerDetails.mobile.replace(/\D/g, '').slice(-10) : '';
                if (ordMobile && activeCustMobiles.has(ordMobile)) return true;
                return false;
              };

              const finalizedOrders = allOrders.filter(o => o.status === 'finalized' && isOrderForActiveCust(o));
              
              // Total Revenue: sum of grandTotal across finalized orders for active customers
              const totalRevenue = finalizedOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
              
              // Total Still Due Amount across all active customers
              const totalStillDue = activeCustList.reduce((s, c) => s + (c.balanceDue || 0), 0);
              const customersWithDue = activeCustList.filter(c => (c.balanceDue || 0) > 0);

              const revenueDisplayedCustomers = activeCustList.filter(c => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                return (c.name || '').toLowerCase().includes(q) || (c.mobile || '').includes(q) || (c.address || '').toLowerCase().includes(q);
              });

              return (
                <div>
                  <h3 className="font-cinzel text-lg font-bold text-gold-gradient mb-6 pb-3 border-b border-[#ffd700]/20 uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp size={18} /> Revenue & Dues Overview
                  </h3>

                  {/* ONLY 2 CARDS: TOTAL REVENUE & STILL DUE AMOUNT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Card 1: TOTAL REVENUE */}
                    <div className="glass-panel border-2 border-[#ffd700]/50 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                      <div className="text-xs font-bold uppercase tracking-widest text-[#ffd700] mb-2 flex items-center gap-2 font-cinzel">
                        <CreditCard size={16} className="text-[#ff6a00]" />
                        <span>TOTAL REVENUE</span>
                      </div>
                      <div className="font-cinzel text-3xl sm:text-4xl font-extrabold text-gold-gradient tracking-tight">
                        ₹{totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#cbd5e1] mt-2 font-medium">
                        From {finalizedOrders.length} approved & finalized orders
                      </div>
                    </div>

                    {/* Card 2: STILL DUE AMOUNT */}
                    <div className="glass-panel border-2 border-red-500/50 rounded-2xl p-6 relative overflow-hidden shadow-xl">
                      <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-2 font-cinzel">
                        <AlertCircle size={16} className="text-red-400" />
                        <span>STILL DUE AMOUNT</span>
                      </div>
                      <div className="font-cinzel text-3xl sm:text-4xl font-extrabold text-red-400 tracking-tight">
                        ₹{totalStillDue.toLocaleString()}
                      </div>
                      <div className="text-xs text-red-300 mt-2 font-semibold">
                        {customersWithDue.length} customer{customersWithDue.length !== 1 ? 's' : ''} with outstanding balance
                      </div>
                    </div>
                  </div>

                  {/* CUSTOMER DUES & BILL VIEW TABLE */}
                  <div className="rounded-2xl overflow-hidden border border-[#ffd700]/25">
                    <div className="px-5 py-4 border-b border-[#ffd700]/20 bg-[#ffd700]/10 flex justify-between items-center">
                      <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#ffd700] flex items-center gap-2">
                        <FileText size={15} />
                        Customer Dues & Bill Management
                      </h4>
                      <span className="text-[11px] text-[#cbd5e1] font-semibold">
                        Showing {revenueDisplayedCustomers.length} active customer profiles
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-[#ffd700]/5 border-b border-[#ffd700]/20">
                            <th className="py-3 px-4 font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Customer Name</th>
                            <th className="py-3 px-4 font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Phone Number</th>
                            <th className="py-3 px-4 font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Customer Type</th>
                            <th className="py-3 px-4 text-right font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Total Amount</th>
                            <th className="py-3 px-4 text-right font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Advance Paid</th>
                            <th className="py-3 px-4 text-right font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Due Amount</th>
                            <th className="py-3 px-4 text-right font-cinzel font-bold text-[#ffd700] uppercase text-[10px] tracking-wide">Bill Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffd700]/10">
                          {revenueDisplayedCustomers.map((cust) => {
                            const latestOrder = cust.orders && cust.orders.length > 0 ? cust.orders[0] : null;

                            return (
                              <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-3.5 px-4 font-bold text-white text-sm">
                                  {cust.name || 'No Name'}
                                  {cust.address && <span className="block text-[10px] text-[#cbd5e1] font-normal mt-0.5">{cust.address}</span>}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-medium text-[#ffd700]">
                                  📞 {cust.mobile}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    cust.customerType === 'wholesale'
                                      ? 'bg-blue-950/60 text-cyan-300 border border-cyan-500/40'
                                      : 'badge-gold'
                                  }`}>
                                    {cust.customerType === 'wholesale' ? '🏭 Wholesale' : '🛍 Retail'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-cinzel font-bold text-[#ffd700]">
                                  ₹{cust.totalSpent?.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                                  ₹{cust.advancePaid?.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <span className={`font-bold px-2 py-1 rounded text-xs ${
                                    cust.balanceDue > 0 
                                      ? 'badge-red' 
                                      : 'badge-green'
                                  }`}>
                                    ₹{cust.balanceDue?.toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* VIEW BILL BUTTON */}
                                    <button
                                      onClick={() => {
                                        if (latestOrder) {
                                          const fullOrder = orders.find(o => o.id === latestOrder.id) || {
                                            ...latestOrder,
                                            customerDetails: { name: cust.name, mobile: cust.mobile, email: cust.email, address: cust.address }
                                          };
                                          setViewingBillOrder(fullOrder);
                                        } else {
                                          alert('No orders placed yet for this customer.');
                                        }
                                      }}
                                      className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1 shadow-sm"
                                      title="View On-Screen Bill"
                                    >
                                      <Eye size={13} />
                                      <span>View Bill</span>
                                    </button>

                                    {/* EDIT TOTAL & DUE AMOUNT */}
                                    <button
                                      onClick={() => openAmountEditor(cust)}
                                      className="btn-outline-gold px-2.5 py-1.5 text-xs flex items-center gap-1"
                                      title="Edit Total & Due Amount"
                                    >
                                      <Edit size={13} />
                                      <span>Edit Amt</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {revenueDisplayedCustomers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#cbd5e1] text-xs italic">
                                {searchQuery ? `No customer records matching "${searchQuery}".` : 'No registered customers yet.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: CUSTOMER LOGIN ACTIVITY */}
            {activeTab === 'activity' && (
              <div>
                <h3 className="font-cinzel text-lg font-bold text-gold-gradient mb-6 pb-3 border-b border-[#ffd700]/20 uppercase tracking-wide">
                  Customer Login Tracker
                </h3>

                <div className="overflow-x-auto rounded-xl border border-[#ffd700]/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#ffd700]/30 font-cinzel font-bold text-[#ffd700] uppercase bg-[#ffd700]/10 text-[11px]">
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Email Connected</th>
                        <th className="py-3 px-3">Mobile Contact</th>
                        <th className="py-3 px-3">Login Date/Time</th>
                        <th className="py-3 px-3">Device / Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffd700]/10">
                      {filteredActivity.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-[#cbd5e1]">
                            {searchQuery ? `No login logs matching "${searchQuery}".` : 'No customer login activity recorded yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredActivity.map(log => {
                          const dateStr = new Date(log.timestamp).toLocaleString();
                          return (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3.5 px-3 font-bold text-white text-sm">{log.name}</td>
                              <td className="py-3.5 px-3 text-[#cbd5e1]">{log.email || <span className="text-gray-500 italic">None</span>}</td>
                              <td className="py-3.5 px-3 font-mono text-[#ffd700]">📞 {log.mobile}</td>
                              <td className="py-3.5 px-3 font-medium text-[#f8fafc]">{dateStr}</td>
                              <td className="py-3.5 px-3 text-[11px] text-[#cbd5e1] max-w-[200px] truncate" title={log.userAgent}>
                                {log.userAgent}
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

            {/* TAB: ADD ADMIN ACC */}
            {activeTab === 'add_admin' && (
              <div className="max-w-md mx-auto">
                <h3 className="font-cinzel text-xl font-bold text-gold-gradient mb-2 uppercase tracking-wide text-center">
                  Provision New Admin Account
                </h3>
                <p className="text-xs text-[#cbd5e1] text-center mb-6">
                  Add secondary administrators to access details and approve customer bills.
                </p>

                <form onSubmit={handleAdminProvision} className="space-y-4 glass-panel border border-[#ffd700]/30 p-6 rounded-2xl">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                      Admin Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={newAdmin.mobile}
                      onChange={(e) => setNewAdmin({ ...newAdmin, mobile: e.target.value })}
                      placeholder="Mobile number for login ID"
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#ffebc2] mb-1">
                      Secret Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      placeholder="Assign secure password"
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 btn-gold text-xs shadow-lg mt-3"
                  >
                    Create Admin Account
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: CREATE NEW ORDER BY ADMIN */}
      {/* ============================================================ */}
      {isCreateOrderOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel border-2 border-[#ffd700] rounded-2xl shadow-2xl animate-fadeIn relative my-6 text-white">
            
            <div className="bg-[#4a0e17] text-white px-6 py-4 flex justify-between items-center border-b border-[#ffd700]/30 rounded-t-2xl">
              <h3 className="font-cinzel font-bold text-sm tracking-wider uppercase flex items-center gap-2 text-gold-gradient">
                <Plus size={16} className="text-[#ffd700]" />
                Create New Order & Bill
              </h3>
              <button
                onClick={() => setIsCreateOrderOpen(false)}
                className="text-[#ffd700] hover:text-white font-bold text-xs font-cinzel"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Customer Information & Pricing Tier */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[#ffd700]/20 pb-2">
                  <h4 className="font-cinzel font-bold text-xs uppercase text-[#ffd700] flex items-center gap-1.5">
                    <span>1. Customer Details</span>
                  </h4>
                  
                  {/* Select Existing Customer Dropdown */}
                  {customers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#ffebc2] font-semibold">Existing Customer:</span>
                      <select
                        value={newOrderForm.customerId}
                        onChange={(e) => handleSelectCustomerForNewOrder(e.target.value)}
                        className="text-xs px-2.5 py-1 input-glass"
                      >
                        <option value="" className="bg-[#200104] text-white">-- New / Type Details Below --</option>
                        {activeCustomers.map(c => (
                          <option key={c.id} value={c.id} className="bg-[#200104] text-white">
                            {c.name} ({c.mobile}) - {c.customerType === 'wholesale' ? 'Wholesale' : 'Retail'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newOrderForm.name}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={newOrderForm.mobile}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, mobile: e.target.value }))}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@gmail.com"
                      value={newOrderForm.email}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Pricing Tier</label>
                    <select
                      value={newOrderForm.customerType}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, customerType: e.target.value }))}
                      className="w-full px-3 py-2 input-glass text-xs font-semibold"
                    >
                      <option value="retail" className="bg-[#200104] text-white">🛍 Retail Customer</option>
                      <option value="wholesale" className="bg-[#200104] text-white">🏭 Wholesale Dealer</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="e.g. #45, 2nd Cross, Malleshwaram, Bangalore"
                      value={newOrderForm.address}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Add Items to New Order */}
              <div className="space-y-3">
                <h4 className="font-cinzel font-bold text-xs uppercase text-[#ffd700] border-b border-[#ffd700]/20 pb-2 flex items-center justify-between">
                  <span>2. Add Ganesha Items to Order</span>
                  <span className="text-[11px] text-[#cbd5e1] font-normal">{newOrderForm.items.length} item(s) in order</span>
                </h4>

                {/* Item Selector Row */}
                <div className="glass-panel-subtle border border-[#ffd700]/25 p-4 rounded-xl flex flex-wrap items-end gap-3">
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Select Ganesha Model</label>
                    <select
                      value={createOrderNewItem.itemId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const cat = catalog.find(c => c.id === selId);
                        setCreateOrderNewItem({
                          ...createOrderNewItem,
                          itemId: selId,
                          customRate: cat ? (newOrderForm.customerType === 'wholesale' ? cat.wholesalePrice : cat.retailPrice) : ''
                        });
                      }}
                      className="w-full px-3 py-2 input-glass text-xs font-medium"
                    >
                      <option value="" className="bg-[#200104] text-white">-- Choose Ganesha Idol --</option>
                      {catalog.map(item => (
                        <option key={item.id} value={item.id} className="bg-[#200104] text-white">
                          {item.name} ({item.size}) — Retail: ₹{item.retailPrice} | Wholesale: ₹{item.wholesalePrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={createOrderNewItem.quantity}
                      onChange={(e) => setCreateOrderNewItem({ ...createOrderNewItem, quantity: e.target.value })}
                      className="w-full px-2 py-2 input-glass text-xs text-center font-bold"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Rate / Item (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={createOrderNewItem.customRate}
                      onChange={(e) => setCreateOrderNewItem({ ...createOrderNewItem, customRate: e.target.value })}
                      className="w-full px-2 py-2 input-glass text-xs text-right font-bold text-[#ffd700]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToNewOrder}
                    className="btn-gold px-4 py-2 text-xs flex items-center gap-1 shadow"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Items Added Table */}
                {newOrderForm.items.length > 0 ? (
                  <div className="border border-[#ffd700]/25 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-[#ffd700]/15 text-[#ffd700] font-cinzel font-bold border-b border-[#ffd700]/20">
                          <th className="p-2.5">Item Name</th>
                          <th className="p-2.5">Size</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Line Total</th>
                          <th className="p-2.5 text-center">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ffd700]/10">
                        {newOrderForm.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="p-2.5 font-bold text-white text-sm">{item.name}</td>
                            <td className="p-2.5"><span className="bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30 px-2 py-0.5 rounded text-[10px] font-bold">{item.size}</span></td>
                            <td className="p-2.5 text-right font-medium text-[#ffebc2]">₹{item.rate}</td>
                            <td className="p-2.5 text-center font-bold text-white">{item.quantity}</td>
                            <td className="p-2.5 text-right font-cinzel font-bold text-[#ffd700]">₹{item.lineTotal?.toLocaleString()}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItemFromNewOrder(idx)}
                                className="text-red-400 hover:text-red-200 p-1 hover:bg-red-950/40 rounded"
                                title="Remove Item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#cbd5e1] border border-dashed border-[#ffd700]/25 rounded-xl italic">
                    No items added yet. Select a model above and click "Add".
                  </div>
                )}
              </div>

              {/* 3. Payment Totals */}
              <div className="space-y-3">
                <h4 className="font-cinzel font-bold text-xs uppercase text-[#ffd700] border-b border-[#ffd700]/20 pb-2">3. Payment Breakdown</h4>
                {/* Discount & Extra Charges */}
                <div className="grid grid-cols-2 gap-3 text-xs glass-panel-subtle border border-[#ffd700]/25 p-3.5 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">🏷️ Discount / Offer (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.discount}
                      onChange={(e) => {
                        const disc = parseFloat(e.target.value) || 0;
                        const subtotal = newOrderForm.itemsSubtotal || 0;
                        const grandTotal = Math.max(0, subtotal - disc + (Number(newOrderForm.extraCharges) || 0));
                        setNewOrderForm(prev => ({ ...prev, discount: disc, grandTotal, balanceDue: Math.max(0, grandTotal - prev.advancePayment) }));
                      }}
                      className="w-full px-3 py-2 input-glass font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">➕ Extra Charges / Transport (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.extraCharges}
                      onChange={(e) => {
                        const extra = parseFloat(e.target.value) || 0;
                        const subtotal = newOrderForm.itemsSubtotal || 0;
                        const grandTotal = Math.max(0, subtotal - (Number(newOrderForm.discount) || 0) + extra);
                        setNewOrderForm(prev => ({ ...prev, extraCharges: extra, grandTotal, balanceDue: Math.max(0, grandTotal - prev.advancePayment) }));
                      }}
                      className="w-full px-3 py-2 input-glass font-bold text-purple-400"
                    />
                  </div>
                </div>
                {/* Live Tally Summary */}
                {newOrderForm.itemsSubtotal > 0 && (
                  <div className="glass-panel-subtle border border-[#ffd700]/25 rounded-xl p-3 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-[#cbd5e1]"><span>Items Subtotal</span><span>₹{newOrderForm.itemsSubtotal?.toLocaleString()}</span></div>
                    {newOrderForm.discount > 0 && <div className="flex justify-between text-emerald-400"><span>- Discount</span><span>- ₹{Number(newOrderForm.discount)?.toLocaleString()}</span></div>}
                    {newOrderForm.extraCharges > 0 && <div className="flex justify-between text-purple-400"><span>+ Extra Charges</span><span>+ ₹{Number(newOrderForm.extraCharges)?.toLocaleString()}</span></div>}
                    <div className="flex justify-between font-cinzel font-bold text-[#ffd700] border-t border-[#ffd700]/20 pt-1 text-sm"><span>Grand Total</span><span>₹{newOrderForm.grandTotal?.toLocaleString()}</span></div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs glass-panel-subtle border border-[#ffd700]/30 p-4 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Grand Total Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.grandTotal}
                      onChange={(e) => {
                        const tot = parseFloat(e.target.value) || 0;
                        setNewOrderForm(prev => ({ ...prev, grandTotal: tot, balanceDue: Math.max(0, tot - prev.advancePayment) }));
                      }}
                      className="w-full px-3 py-2 input-glass font-cinzel font-bold text-[#ffd700] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Advance Received (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.advancePayment}
                      onChange={(e) => {
                        const adv = parseFloat(e.target.value) || 0;
                        setNewOrderForm(prev => ({ ...prev, advancePayment: adv, balanceDue: Math.max(0, prev.grandTotal - adv) }));
                      }}
                      className="w-full px-3 py-2 input-glass font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-red-400 uppercase mb-1">Balance Due Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.balanceDue}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, balanceDue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 input-glass font-cinzel font-bold text-red-400 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-[#200104] px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-t border-[#ffd700]/30 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsCreateOrderOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase border border-white/20 rounded-xl text-[#cbd5e1] hover:bg-white/10"
              >
                Cancel
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (newOrderForm.items.length === 0) {
                      alert('Please add at least one Ganesha idol to download bill preview.');
                      return;
                    }
                    const tempOrder = {
                      id: 'DRAFT',
                      customerDetails: {
                        name: newOrderForm.name || 'Customer',
                        mobile: newOrderForm.mobile || '',
                        email: newOrderForm.email || '',
                        address: newOrderForm.address || '',
                        customerType: newOrderForm.customerType
                      },
                      items: newOrderForm.items,
                      discount: newOrderForm.discount,
                      extraCharges: newOrderForm.extraCharges,
                      grandTotal: newOrderForm.grandTotal,
                      advancePayment: newOrderForm.advancePayment,
                      balanceDue: newOrderForm.balanceDue,
                      status: 'pending_review'
                    };
                    const doc = generateBillPDF(tempOrder, 'CHECKING BILL', true);
                    downloadPDFBlob(doc, `Bill_Draft_${newOrderForm.name || 'Order'}.pdf`);
                  }}
                  className="btn-outline-gold px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateOrderSubmit(true)}
                  disabled={loading}
                  className="btn-gold px-6 py-2 text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <CheckCircle size={14} />
                  <span>Submit Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT ORDER INTAKE */}
      {/* ============================================================ */}
      {editingOrder && orderEditForm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-3xl glass-panel border-2 border-[#ffd700] rounded-2xl shadow-2xl animate-fadeIn relative my-6 text-white">
            
            <div className="bg-[#4a0e17] text-white px-6 py-4 flex justify-between items-center border-b border-[#ffd700]/30 rounded-t-2xl">
              <h3 className="font-cinzel font-bold text-sm tracking-wider uppercase flex items-center gap-2 text-gold-gradient">
                <Edit size={16} className="text-[#ffd700]" />
                Modify Order ID #{editingOrder.id}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-[#ffd700] hover:text-white font-bold text-xs font-cinzel"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer edit details */}
              <div className="space-y-3">
                <h4 className="font-cinzel font-bold text-xs uppercase text-[#ffd700] border-b border-[#ffd700]/20 pb-2">1. Customer Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={orderEditForm.name}
                      onChange={(e) => handleEditOrderFieldChange('name', e.target.value)}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={orderEditForm.mobile}
                      onChange={(e) => handleEditOrderFieldChange('mobile', e.target.value)}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Email ID</label>
                    <input
                      type="email"
                      value={orderEditForm.email}
                      onChange={(e) => handleEditOrderFieldChange('email', e.target.value)}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Pricing Tier</label>
                    <select
                      value={orderEditForm.customerType}
                      onChange={(e) => handleEditOrderFieldChange('customerType', e.target.value)}
                      className="w-full px-3 py-2 input-glass text-xs font-semibold"
                    >
                      <option value="retail" className="bg-[#200104] text-white">🛍 Retail</option>
                      <option value="wholesale" className="bg-[#200104] text-white">🏭 Wholesale</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={orderEditForm.address}
                      onChange={(e) => handleEditOrderFieldChange('address', e.target.value)}
                      className="w-full px-3 py-2 input-glass text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Items editing table */}
              <div className="space-y-3">
                <h4 className="font-cinzel font-bold text-xs uppercase text-[#ffd700] border-b border-[#ffd700]/20 pb-2 flex justify-between items-center">
                  <span>2. Ordered Items Quantities & Management</span>
                  <span className="text-[11px] text-[#cbd5e1] font-normal">{orderEditForm.items.length} item(s) in order</span>
                </h4>

                {/* Add Item Row */}
                <div className="glass-panel-subtle border border-[#ffd700]/25 p-4 rounded-xl flex flex-wrap items-end gap-3">
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Add Another Ganesha Idol to Order</label>
                    <select
                      value={newItemToAdd.itemId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        const cat = catalog.find(c => c.id === selId);
                        setNewItemToAdd({
                          ...newItemToAdd,
                          itemId: selId,
                          customRate: cat ? (orderEditForm.customerType === 'wholesale' ? cat.wholesalePrice : cat.retailPrice) : ''
                        });
                      }}
                      className="w-full px-3 py-2 input-glass text-xs font-medium"
                    >
                      <option value="" className="bg-[#200104] text-white">-- Choose Ganesha Idol to Add --</option>
                      {catalog.map(item => (
                        <option key={item.id} value={item.id} className="bg-[#200104] text-white">
                          {item.name} ({item.size}) — Retail: ₹{item.retailPrice} | Wholesale: ₹{item.wholesalePrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemToAdd.quantity}
                      onChange={(e) => setNewItemToAdd({ ...newItemToAdd, quantity: e.target.value })}
                      className="w-full px-2 py-2 input-glass text-xs text-center font-bold"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={newItemToAdd.customRate}
                      onChange={(e) => setNewItemToAdd({ ...newItemToAdd, customRate: e.target.value })}
                      className="w-full px-2 py-2 input-glass text-xs text-right font-bold text-[#ffd700]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToExistingOrder}
                    className="btn-gold px-4 py-2 text-xs flex items-center gap-1 shadow"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Current Items List */}
                <div className="space-y-2">
                  {orderEditForm.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 border border-[#ffd700]/20 rounded-xl bg-white/5 text-xs">
                      <div>
                        <span className="font-bold text-white text-sm">{item.name}</span>
                        <span className="text-xs text-[#ffd700] block mt-0.5">Size: {item.size} | Rate: ₹{item.rate}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[11px] font-bold text-[#ffebc2]">Qty:</label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleEditOrderItemQuantity(idx, e.target.value)}
                          className="w-16 text-center py-1 input-glass text-xs font-bold"
                        />
                        <span className="font-cinzel font-bold text-[#ffd700] w-24 text-right">₹{item.lineTotal?.toLocaleString()}</span>
                        
                        {/* Delete Item Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItemFromOrder(idx)}
                          className="text-red-400 hover:text-red-200 p-1 hover:bg-red-950/40 rounded"
                          title="Delete this item from order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {orderEditForm.items?.length === 0 && (
                    <div className="p-4 text-center text-xs text-[#cbd5e1] italic">
                      No items in order. Use the selector above to add items.
                    </div>
                  )}
                </div>
              </div>

              {/* Advance and Balance */}
              <div className="space-y-3">
                <h4 className="font-cinzel font-bold text-xs uppercase text-[#ffd700] border-b border-[#ffd700]/20 pb-2">3. Payment Totals — Discount & Charges</h4>
                {/* Discount & Extra Charges Row */}
                <div className="grid grid-cols-2 gap-3 text-xs glass-panel-subtle border border-[#ffd700]/25 p-3.5 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">🏷️ Discount / Offer (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.discount}
                      onChange={(e) => handleEditOrderFieldChange('discount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 input-glass font-bold text-emerald-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">➕ Extra Charges / Transport (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.extraCharges}
                      onChange={(e) => handleEditOrderFieldChange('extraCharges', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 input-glass font-bold text-purple-400"
                      placeholder="0"
                    />
                  </div>
                </div>
                {/* Live Tally Banner */}
                <div className="glass-panel-subtle border border-[#ffd700]/25 rounded-xl p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-[#cbd5e1]"><span>Items Subtotal</span><span>₹{(orderEditForm.itemsSubtotal || 0).toLocaleString()}</span></div>
                  {(orderEditForm.discount > 0) && <div className="flex justify-between text-emerald-400 font-bold"><span>- Discount</span><span>- ₹{Number(orderEditForm.discount).toLocaleString()}</span></div>}
                  {(orderEditForm.extraCharges > 0) && <div className="flex justify-between text-purple-400 font-bold"><span>+ Extra Charges</span><span>+ ₹{Number(orderEditForm.extraCharges).toLocaleString()}</span></div>}
                  <div className="flex justify-between font-cinzel font-bold text-[#ffd700] border-t border-[#ffd700]/20 pt-1 text-sm"><span>Grand Total</span><span>₹{Number(orderEditForm.grandTotal).toLocaleString()}</span></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs glass-panel-subtle border border-[#ffd700]/30 p-4 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-[#ffebc2] uppercase mb-1">Grand Total Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.grandTotal}
                      readOnly
                      className="w-full px-3 py-2 input-glass font-cinzel font-bold text-[#ffd700] opacity-80 cursor-not-allowed text-sm"
                      title="Auto-calculated from items, discount & extra charges"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase mb-1">Advance Received (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.advancePayment}
                      onChange={(e) => handleEditOrderFieldChange('advancePayment', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 input-glass font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-red-400 uppercase mb-1">Balance Due Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.balanceDue}
                      onChange={(e) => handleEditOrderFieldChange('balanceDue', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 input-glass font-cinzel font-bold text-red-400 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#200104] px-6 py-4 flex justify-between items-center gap-3 border-t border-[#ffd700]/30 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-5 py-2 text-xs font-bold uppercase border border-white/20 rounded-lg text-[#cbd5e1] hover:bg-white/10"
              >
                Discard
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBillPDF({ ...editingOrder, ...orderEditForm, customerDetails: { name: orderEditForm.name, mobile: orderEditForm.mobile, email: orderEditForm.email, address: orderEditForm.address } })}
                  className="btn-outline-gold px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download Bill</span>
                </button>
                <button
                  type="button"
                  onClick={saveEditedOrder}
                  disabled={loading}
                  className="btn-gold px-6 py-2 text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>Submit Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: QUICK EDIT TOTAL & DUE AMOUNTS */}
      {/* ============================================================ */}
      {editingAmounts && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-center p-4">
          <div className="w-full max-w-md glass-panel border-2 border-[#ffd700] rounded-2xl shadow-2xl animate-fadeIn overflow-hidden text-white">
            <div className="bg-[#4a0e17] text-white px-6 py-4 flex justify-between items-center border-b border-[#ffd700]/30">
              <h3 className="font-cinzel font-bold text-sm tracking-wider uppercase flex items-center gap-2 text-gold-gradient">
                <Edit size={16} className="text-[#ffd700]" />
                Edit Amounts: {editingAmounts.customerName}
              </h3>
              <button
                onClick={() => setEditingAmounts(null)}
                className="text-[#ffd700] hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#ffebc2] uppercase mb-1">
                  Total Billed Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingAmounts.grandTotal}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value) || 0;
                    setEditingAmounts(prev => ({
                      ...prev,
                      grandTotal: total,
                      balanceDue: Math.max(0, total - prev.advancePayment)
                    }));
                  }}
                  className="w-full px-3 py-2.5 input-glass font-cinzel font-bold text-sm text-[#ffd700]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">
                  Advance Paid (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingAmounts.advancePayment}
                  onChange={(e) => {
                    const adv = parseFloat(e.target.value) || 0;
                    setEditingAmounts(prev => ({
                      ...prev,
                      advancePayment: adv,
                      balanceDue: Math.max(0, prev.grandTotal - adv)
                    }));
                  }}
                  className="w-full px-3 py-2.5 input-glass font-bold text-sm text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-red-400 uppercase mb-1">
                  Still Due Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingAmounts.balanceDue}
                  onChange={(e) => setEditingAmounts(prev => ({
                    ...prev,
                    balanceDue: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2.5 input-glass font-cinzel font-bold text-sm text-red-400"
                />
              </div>
            </div>

            <div className="bg-[#200104] px-6 py-4 flex justify-end gap-3 border-t border-[#ffd700]/30">
              <button
                type="button"
                onClick={() => setEditingAmounts(null)}
                className="px-4 py-2 text-xs font-bold uppercase border border-white/20 rounded-xl text-[#cbd5e1] hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAmountAdjustment}
                disabled={loading}
                className="btn-gold px-6 py-2 text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50"
              >
                <Save size={14} />
                <span>Save Amounts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: ON-SCREEN VIEW BILL PREVIEW */}
      {/* ============================================================ */}
      {viewingBillOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-gray-900 border-2 border-[#ffd700] rounded-2xl overflow-hidden shadow-2xl animate-fadeIn relative my-8">
            
            {/* Header */}
            <div className="bg-[#4a0e17] text-white px-6 py-4 flex justify-between items-center border-b border-[#ffd700]">
              <h3 className="font-cinzel font-bold text-sm tracking-widest uppercase flex items-center gap-2 text-gold-gradient">
                <FileText size={16} className="text-[#ffd700]" />
                Ganesha Works — Bill #{viewingBillOrder.id}
              </h3>
              <button
                onClick={() => setViewingBillOrder(null)}
                className="text-[#ffd700] hover:text-white font-bold text-xs uppercase tracking-wider font-cinzel"
              >
                ✕ Close
              </button>
            </div>

            {/* Bill Paper Preview */}
            <div className="p-6 md:p-8 bg-[#FFFDF6] border-b border-gray-200 relative text-gray-900">
              <div className="border border-[#4a0e17]/20 p-6 rounded-xl bg-white shadow-sm">
                {/* Header Row */}
                <div className="flex justify-between items-start border-b border-[#4a0e17]/20 pb-4 mb-4">
                  <div>
                    <h2 className="font-cinzel text-lg font-extrabold text-[#4a0e17]">G.KAMAL GANESHA WORKS</h2>
                    <p className="text-[10px] text-[#ff6a00] font-bold uppercase tracking-wider">Bangalore Idol Manufacturer</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-gray-900">G.Kamal Ganesha Works</p>
                    <p className="text-gray-600 font-medium">Saraipalaya, Thanisandra Main Road, Vidyasagar, Bangalore - 560077</p>
                    <p className="text-[#4a0e17] font-mono font-bold">9739142445 / 8792044625</p>
                  </div>
                </div>

                {/* Info Row */}
                <div className="grid grid-cols-2 text-xs gap-4 mb-6">
                  <div>
                    <h4 className="font-bold text-[#4a0e17] uppercase text-[10px] tracking-wide mb-1 font-cinzel">Customer Details:</h4>
                    <p className="font-bold text-gray-900">{viewingBillOrder.customerDetails?.name || 'Customer'}</p>
                    <p className="text-gray-700">Phone: {viewingBillOrder.customerDetails?.mobile || 'N/A'}</p>
                    {viewingBillOrder.customerDetails?.email && <p className="text-gray-700">Email: {viewingBillOrder.customerDetails.email}</p>}
                    {viewingBillOrder.customerDetails?.address && <p className="text-gray-700">Address: {viewingBillOrder.customerDetails.address}</p>}
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-[#4a0e17] uppercase text-[10px] tracking-wide mb-1 font-cinzel">Bill Reference:</h4>
                    <p className="font-bold text-gray-900">Order ID: #{viewingBillOrder.id}</p>
                    <p className="text-gray-700">Date: {viewingBillOrder.createdAt ? new Date(viewingBillOrder.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    <p className={`font-bold uppercase text-[10px] mt-1 ${viewingBillOrder.status === 'finalized' ? 'text-green-700' : 'text-[#ff6a00]'}`}>
                      Status: {viewingBillOrder.status === 'finalized' ? 'APPROVED' : 'CHECKING BILL'}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#4a0e17] text-white font-cinzel font-bold">
                        <th className="p-2.5 rounded-l">Item Description</th>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right rounded-r">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewingBillOrder.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40">
                          <td className="p-2.5 font-bold text-gray-900">{item.name}</td>
                          <td className="p-2.5 text-gray-700">{item.size}</td>
                          <td className="p-2.5 text-right text-gray-800">₹{item.rate}</td>
                          <td className="p-2.5 text-right font-bold text-gray-900">{item.quantity}</td>
                          <td className="p-2.5 text-right font-bold text-gray-900">₹{item.lineTotal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="flex flex-col items-end gap-1.5 pt-3 border-t border-gray-200 text-xs">
                  {/* Items Subtotal */}
                  {(viewingBillOrder.discount > 0 || viewingBillOrder.extraCharges > 0) && (
                    <div className="flex justify-between w-64 pb-1 text-gray-700">
                      <span>Items Subtotal:</span>
                      <span className="font-bold">₹{(viewingBillOrder.items || []).reduce((s, i) => s + (i.lineTotal || 0), 0).toLocaleString()}</span>
                    </div>
                  )}
                  {/* Discount */}
                  {viewingBillOrder.discount > 0 && (
                    <div className="flex justify-between w-64 pb-1 text-green-700 font-semibold">
                      <span>🏷️ Discount:</span>
                      <span className="font-bold">- ₹{Number(viewingBillOrder.discount).toLocaleString()}</span>
                    </div>
                  )}
                  {/* Extra Charges */}
                  {viewingBillOrder.extraCharges > 0 && (
                    <div className="flex justify-between w-64 pb-1 text-purple-700 font-semibold">
                      <span>➕ Extra Charges:</span>
                      <span className="font-bold">+ ₹{Number(viewingBillOrder.extraCharges).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-64 border-b border-gray-200 pb-1 font-semibold text-gray-800">
                    <span>Grand Total:</span>
                    <span className="font-extrabold text-gray-950">₹{viewingBillOrder.grandTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-64 border-b border-gray-100 pb-1 font-semibold text-green-700">
                    <span>Advance Received:</span>
                    <span className="font-extrabold">- ₹{viewingBillOrder.advancePayment?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-64 pt-1 font-bold text-[#4a0e17] text-sm">
                    <span>Balance Due:</span>
                    <span className="font-extrabold text-base">₹{viewingBillOrder.balanceDue?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-t border-gray-200">
              <button
                type="button"
                onClick={() => setViewingBillOrder(null)}
                className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadBillPDF(viewingBillOrder)}
                className="flex items-center gap-2 bg-[#4a0e17] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-[#2b0308] text-xs uppercase tracking-wider shadow"
              >
                <Download size={14} />
                <span>Download PDF Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: REVIEW & FINAL APPROVE ORIGINAL BILL */}
      {/* ============================================================ */}
      {approvingOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-md glass-panel border-2 border-[#ffd700] rounded-2xl shadow-2xl animate-fadeIn relative my-8 text-white">
            
            <div className="bg-[#4a0e17] text-white px-6 py-4 flex justify-between items-center border-b border-[#ffd700]/30 rounded-t-2xl">
              <h3 className="font-cinzel font-bold text-sm tracking-wider uppercase flex items-center gap-1.5 text-gold-gradient">
                <CheckCircle size={17} className="text-[#ffd700]" />
                Accept & Finalize Order #{approvingOrder.id}
              </h3>
              <button
                onClick={() => { setApprovingOrder(null); setModalError(''); }}
                className="text-[#ffd700] hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-red-950/70 border border-red-500 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#ffd700] mb-2">Order Details</h4>
                <div className="glass-panel-subtle p-4 rounded-xl border border-[#ffd700]/25 text-xs text-[#f8fafc] space-y-2">
                  <p><strong>Customer:</strong> {approvingOrder.customerDetails?.name || 'Customer'}</p>
                  <p><strong>Mobile:</strong> <span className="text-[#ffd700] font-mono">📞 {approvingOrder.customerDetails?.mobile}</span></p>
                  <p><strong>Grand Total:</strong> <span className="font-cinzel font-bold text-[#ffd700]">₹{approvingOrder.grandTotal?.toLocaleString()}</span></p>
                  <p><strong>Advance Paid:</strong> <span className="font-semibold text-emerald-400">₹{approvingOrder.advancePayment?.toLocaleString() || 0}</span></p>
                  <p><strong>Balance Due:</strong> <span className="font-cinzel font-bold text-red-400">₹{approvingOrder.balanceDue?.toLocaleString()}</span></p>
                  {approvingOrder.items && approvingOrder.items.length > 0 && (
                    <p className="text-[11px] text-[#cbd5e1] pt-2 border-t border-[#ffd700]/20">
                      <strong>Items ({approvingOrder.items.length}):</strong> {approvingOrder.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* SMS Notification Message */}
              <div className="space-y-2">
                <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#ffd700]">Automated SMS Notification</h4>
                <div className="glass-panel-subtle p-3.5 border border-[#ffd700]/25 rounded-xl text-xs text-[#f8fafc]">
                  <p className="leading-relaxed text-[#cbd5e1]">
                    A finalized <strong className="text-white">Thank You SMS</strong> with secure bill download link will be dispatched to:
                  </p>
                  <p className="font-mono font-bold mt-1.5 text-[#ffd700] text-sm">
                    📞 {approvingOrder.customerDetails?.mobile}
                  </p>
                </div>
              </div>

              <div className="text-center p-3 badge-gold rounded-xl text-[11px] leading-relaxed">
                Approving will finalize this order, apply <strong>"G.kamal ganesha works"</strong> watermark, and unlock Original Bill download for the customer.
              </div>
            </div>

            <div className="bg-[#200104] px-6 py-4 flex justify-between gap-3 border-t border-[#ffd700]/30 rounded-b-2xl">
              <button
                type="button"
                onClick={() => { setApprovingOrder(null); setModalError(''); }}
                className="px-4 py-2.5 text-xs font-bold border border-white/20 rounded-xl text-[#cbd5e1] hover:bg-white/10"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBillPDF(approvingOrder)}
                  className="btn-outline-gold px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Preview PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={loading}
                  className="btn-gold px-5 py-2.5 text-xs flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Accept & Finalize</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: REJECT ORDER DIALOG */}
      {/* ============================================================ */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-md glass-panel border-2 border-red-500 rounded-2xl shadow-2xl animate-fadeIn relative my-8 text-white">
            
            <div className="bg-red-950/80 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl border-b border-red-500/40">
              <h3 className="font-cinzel font-bold text-sm tracking-wider uppercase flex items-center gap-1.5 text-red-300">
                <XCircle size={17} className="text-red-400" />
                Reject Order #{rejectingOrder.id}
              </h3>
              <button
                onClick={() => { setRejectingOrder(null); setRejectModalError(''); }}
                className="text-red-300 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {rejectModalError && (
                <div className="p-3 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-400" />
                  <span>{rejectModalError}</span>
                </div>
              )}

              <div className="glass-panel-subtle p-3.5 rounded-xl border border-red-500/30 text-xs text-[#f8fafc] space-y-1.5">
                <p><strong>Customer:</strong> {rejectingOrder.customerDetails?.name || 'Customer'}</p>
                <p><strong>Mobile:</strong> <span className="font-mono text-[#ffd700]">📞 {rejectingOrder.customerDetails?.mobile}</span></p>
                <p><strong>Amount:</strong> <span className="font-cinzel font-bold text-[#ffd700]">₹{rejectingOrder.grandTotal?.toLocaleString()}</span></p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-2 font-cinzel">
                  Select or Enter Rejection Reason:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    'Out of Stock / Sold Out',
                    'Cannot fulfill by required date',
                    'Customer requested cancellation',
                    'Custom design not feasible',
                    'Contact number unreachable'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        rejectionReason === preset
                          ? 'bg-red-600 text-white border-red-500 font-bold shadow'
                          : 'bg-white/10 text-[#cbd5e1] border-white/20 hover:bg-white/20'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason for customer..."
                  rows={3}
                  className="w-full text-xs p-3 input-glass focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="text-[11px] text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-500/30">
                This rejection note will be displayed in the Customer's Order history and status column.
              </div>
            </div>

            <div className="bg-[#200104] px-6 py-4 flex justify-between gap-3 border-t border-red-500/30 rounded-b-2xl">
              <button
                type="button"
                onClick={() => { setRejectingOrder(null); setRejectModalError(''); }}
                className="px-4 py-2 text-xs font-bold border border-white/20 rounded-xl text-[#cbd5e1] hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM DIALOG MODAL */}
      {/* ============================================================ */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex justify-center items-center p-4">
          <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl border-2 border-[#ffd700] animate-fadeIn text-white overflow-hidden">
            <div className={`px-6 py-4 flex items-center gap-3 ${confirmDialog.isDanger ? 'bg-red-900/80 border-b border-red-500/40' : 'bg-[#4a0e17] border-b border-[#ffd700]/30'}`}>
              <span className="text-2xl">{confirmDialog.isDanger ? '🗑️' : '❓'}</span>
              <h3 className="font-cinzel font-bold text-white text-sm tracking-wide">{confirmDialog.title || 'Confirm Action'}</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-[#cbd5e1] text-sm leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2 text-xs font-semibold border border-white/20 rounded-xl text-[#cbd5e1] hover:bg-white/10 transition-colors uppercase font-cinzel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow uppercase font-cinzel ${
                  confirmDialog.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'btn-gold text-black'
                }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;
