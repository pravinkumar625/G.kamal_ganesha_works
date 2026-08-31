import React, { useState, useEffect } from 'react';
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

  // View Bill Modal
  const [viewingBillOrder, setViewingBillOrder] = useState(null);

  // In-App Confirm Dialog Modal
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      localStorage.clear();
      navigate('/login/admin');
      return;
    }

    fetchAllData();
  }, [activeTab, navigate]);

  const fetchAllData = async () => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
    try {
      const [ordersRes, catalogRes, customersRes, activityRes] = await Promise.all([
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/catalog', { headers }),
        fetch('/api/admin/customers', { headers }),
        fetch('/api/admin/login-activity', { headers })
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (catalogRes.ok) setCatalog(await catalogRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (activityRes.ok) setLoginActivity(await activityRes.json());
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

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
    setApprovingOrder(order);
  };

  const handleConfirmApproval = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const doc = generateBillPDF(approvingOrder, 'G.kamal ganesha works', false);
      const pdfBase64 = doc.output('datauristring');

      const response = await fetch(`/api/admin/orders/${approvingOrder.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ pdfBase64 })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Order #${approvingOrder.id} approved & submitted successfully!`);
      setApprovingOrder(null);
      fetchAllData();
    } catch (err) {
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

  const handleRejectOrder = async (orderId) => {
    const reason = window.prompt('Enter rejection reason (optional):', 'Cannot fulfill order at this time / Out of stock');
    if (reason === null) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject order');
      setSuccess(`Order #${orderId} marked as Rejected.`);
      fetchAllData();
    } catch (err) {
      setError(err.message || 'Failed to reject order.');
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
    <div className="min-h-screen flex flex-col justify-between relative bg-devotional-cream text-devotional-maroon">
      <div className="w-full bg-devotional-maroon h-3 relative z-10 border-b border-devotional-gold"></div>

      <main className="relative z-10 flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-[#5a1414] to-devotional-maroonDark border border-devotional-gold/30 rounded-2xl p-6 shadow-lg mb-8 gap-4 text-devotional-cream">
          <div className="flex items-center gap-3">
            <DiyaDecoration className="w-10 h-10" />
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-wide text-devotional-gold">
                Admin Control Dashboard
              </h2>
              <p className="text-xs text-devotional-cream/80 font-medium">
                G.Kamal Ganesha Works Workshop Manager
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Create Order Trigger */}
            <button
              onClick={handleOpenCreateOrder}
              className="flex items-center gap-2 bg-gradient-to-r from-devotional-orange to-red-600 hover:from-devotional-marigold hover:to-devotional-orange text-white px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md"
            >
              <Plus size={15} />
              <span>+ Create Order</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-100 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Global Live Search Bar */}
        <div className="mb-6 bg-white/90 backdrop-blur-sm border border-devotional-gold/30 p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-grow w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-devotional-maroon/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer Name, Phone Number, Order ID (e.g. 2026-001), or Date (e.g. 2026-08-31)..."
              className="w-full pl-10 pr-10 py-2 bg-devotional-cream/25 border border-devotional-gold/25 rounded-xl text-xs outline-none focus:border-devotional-orange text-gray-800 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-bold text-devotional-maroon whitespace-nowrap bg-devotional-gold/15 px-3 py-1.5 rounded-lg border border-devotional-gold/20">
              Filtering by: "{searchQuery}"
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'orders'
                  ? 'bg-devotional-maroon text-white border-devotional-maroon shadow-md'
                  : 'bg-white text-devotional-maroon border-gray-100 hover:border-devotional-gold/25'
              }`}
            >
              <Inbox size={16} />
              <span>Orders Intake</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'catalog'
                  ? 'bg-devotional-maroon text-white border-devotional-maroon shadow-md'
                  : 'bg-white text-devotional-maroon border-gray-100 hover:border-devotional-gold/25'
              }`}
            >
              <Database size={16} />
              <span>Catalog Manager</span>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'customers'
                  ? 'bg-devotional-maroon text-white border-devotional-maroon shadow-md'
                  : 'bg-white text-devotional-maroon border-gray-100 hover:border-devotional-gold/25'
              }`}
            >
              <Users size={16} />
              <span>Customers List</span>
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'revenue'
                  ? 'bg-devotional-maroon text-white border-devotional-maroon shadow-md'
                  : 'bg-white text-devotional-maroon border-gray-100 hover:border-devotional-gold/25'
              }`}
            >
              <TrendingUp size={16} />
              <span>Revenue & Dues</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'activity'
                  ? 'bg-devotional-maroon text-white border-devotional-maroon shadow-md'
                  : 'bg-white text-devotional-maroon border-gray-100 hover:border-devotional-gold/25'
              }`}
            >
              <Activity size={16} />
              <span>Login Activity</span>
            </button>
            <button
              onClick={() => setActiveTab('add_admin')}
              className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                activeTab === 'add_admin'
                  ? 'bg-devotional-maroon text-white border-devotional-maroon shadow-md'
                  : 'bg-white text-devotional-maroon border-gray-100 hover:border-devotional-gold/25'
              }`}
            >
              <UserPlus size={16} />
              <span>Add Admin</span>
            </button>
          </div>

          <div className="lg:col-span-4 bg-white/80 backdrop-blur-sm border border-devotional-gold/20 rounded-2xl p-6 shadow-md min-h-[50vh]">
            
            {/* TAB: ORDERS INTAKE */}
            {activeTab === 'orders' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-devotional-gold/10 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-devotional-maroonDark uppercase tracking-wide">
                      Order Queue & Processing
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Showing {filteredOrders.length} of {orders.length} orders
                    </span>
                  </div>

                  <button
                    onClick={handleOpenCreateOrder}
                    className="flex items-center gap-1.5 bg-devotional-maroon text-white hover:bg-devotional-maroonDark px-3 py-1.5 rounded-xl text-xs font-bold shadow transition-all"
                  >
                    <Plus size={14} />
                    <span>Create New Order</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-devotional-gold/30 font-bold text-devotional-maroon uppercase bg-devotional-gold/5">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">Customer Details</th>
                        <th className="py-3 px-3">Items Summary</th>
                        <th className="py-3 px-3 text-right">Grand Total</th>
                        <th className="py-3 px-3 text-right">Advance Paid</th>
                        <th className="py-3 px-3 text-right">Balance Due</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-gray-400">
                            {searchQuery ? `No orders found matching "${searchQuery}".` : 'No orders placed yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(order => {
                          const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
                          const itemsSummary = order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'No items';

                          return (
                            <tr key={order.id} className="hover:bg-amber-50/10">
                              <td className="py-4 px-3 font-mono text-[11px] font-bold">
                                #{order.id}
                                <span className="block text-[9px] text-gray-400 font-normal mt-0.5">{dateStr}</span>
                              </td>
                              <td className="py-4 px-3">
                                <div className="font-semibold text-gray-800">{order.customerDetails?.name || 'Customer'}</div>
                                <div className="text-[10px] text-gray-500 font-mono">📞 {order.customerDetails?.mobile}</div>
                                {order.customerDetails?.address && (
                                  <div className="text-[9px] text-gray-400 max-w-[130px] truncate" title={order.customerDetails?.address}>
                                    📍 {order.customerDetails?.address}
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-3 max-w-[150px] truncate" title={itemsSummary}>
                                {itemsSummary}
                              </td>
                              <td className="py-4 px-3 text-right font-semibold text-gray-700">₹{order.grandTotal?.toLocaleString()}</td>
                              <td className="py-4 px-3 text-right font-semibold text-green-700">₹{order.advancePayment?.toLocaleString() || 0}</td>
                              <td className="py-4 px-3 text-right text-devotional-maroon font-bold">₹{order.balanceDue?.toLocaleString()}</td>
                              
                              <td className="py-4 px-3 text-center">
                                {order.status === 'finalized' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="bg-green-50 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                                      Approved
                                    </span>
                                    <span className="text-[8px] text-blue-600 font-bold flex items-center gap-0.5">
                                      <MessageSquare size={9} /> SMS Sent
                                    </span>
                                  </div>
                                ) : order.status === 'rejected' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="bg-red-50 text-red-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                                      Rejected
                                    </span>
                                    {order.rejectionReason && (
                                      <span className="text-[8px] text-gray-500 max-w-[100px] truncate" title={order.rejectionReason}>
                                        {order.rejectionReason}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-1 rounded-full border border-amber-200">
                                    Pending Review
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Bill Preview */}
                                  <button
                                    onClick={() => setViewingBillOrder(order)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100"
                                    title="View Full Bill on Screen"
                                  >
                                    <Eye size={13} />
                                  </button>

                                  {/* Edit Order Items & Amounts */}
                                  <button
                                    onClick={() => startEditOrder(order)}
                                    className="p-1.5 text-gray-500 hover:text-devotional-maroon bg-gray-50 hover:bg-gray-100 rounded border border-gray-100"
                                    title="Modify Order Items & Amounts"
                                  >
                                    <Edit size={13} />
                                  </button>

                                  {order.status === 'finalized' ? (
                                    <button
                                      onClick={() => downloadBillPDF(order)}
                                      className="flex items-center gap-1 bg-devotional-gold/15 text-devotional-maroon hover:bg-devotional-gold/30 px-2 py-1.5 rounded border border-devotional-gold/20 font-bold"
                                      title="Download PDF Bill"
                                    >
                                      <Download size={12} />
                                      <span>PDF</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => startApproveOrder(order)}
                                        className="flex items-center gap-1 bg-devotional-maroon text-white hover:bg-devotional-maroonDark px-2.5 py-1.5 rounded font-bold"
                                        title="Approve and Send Original Bill via SMS"
                                      >
                                        <CheckCircle size={12} />
                                        <span>Finalize</span>
                                      </button>
                                      {order.status !== 'rejected' && (
                                        <button
                                          onClick={() => handleRejectOrder(order.id)}
                                          className="flex items-center gap-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded font-bold text-xs"
                                          title="Reject Order"
                                        >
                                          <XCircle size={12} />
                                          <span>Reject</span>
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {/* Delete Order Button */}
                                  <button
                                    onClick={() => deleteOrder(order.id)}
                                    className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-100"
                                    title="Delete Order"
                                  >
                                    <Trash2 size={13} />
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
                <h3 className="text-base font-bold text-devotional-maroonDark mb-4 pb-2 border-b border-devotional-gold/10 uppercase tracking-wide">
                  Catalog Manager
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Add / Edit Form */}
                  <div className="md:col-span-1 bg-devotional-cream/30 border border-devotional-gold/20 p-5 rounded-2xl">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-devotional-maroon mb-4">
                      {editingCatalogId ? 'Edit Model' : 'Add Ganesha Model'}
                    </h4>
                    <form onSubmit={handleCatalogSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Item Name</label>
                        <input
                          type="text"
                          required
                          value={catalogForm.name}
                          onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                          placeholder="e.g. Clay Bal Ganesha"
                          className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Size Option</label>
                        <input
                          type="text"
                          required
                          value={catalogForm.size}
                          onChange={(e) => setCatalogForm({ ...catalogForm, size: e.target.value })}
                          placeholder="e.g. 1/4 ft, 1 ft, 2.5 ft"
                          className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Retail Price (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={catalogForm.retailPrice}
                          onChange={(e) => setCatalogForm({ ...catalogForm, retailPrice: e.target.value })}
                          placeholder="Retail Price Rate"
                          className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Wholesale Price (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={catalogForm.wholesalePrice}
                          onChange={(e) => setCatalogForm({ ...catalogForm, wholesalePrice: e.target.value })}
                          placeholder="Wholesale Price Rate"
                          className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 font-semibold">Ganesha Images (Multiple)</label>
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
                          className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-devotional-maroon/10 file:text-devotional-maroon hover:file:bg-devotional-maroon/20 cursor-pointer"
                        />
                        {catalogForm.images && catalogForm.images.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {catalogForm.images.map((img, idx) => (
                              <div key={idx} className="relative group w-12 h-12">
                                <img src={img} alt={`Preview ${idx+1}`} className="w-12 h-12 object-cover rounded-lg border border-devotional-gold/40" />
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
                            className="w-1/3 py-2 border border-gray-300 rounded-lg text-xs font-bold uppercase text-gray-500 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-grow py-2 bg-devotional-maroon text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-devotional-maroonDark"
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
                        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setCatalogLightbox(null)}>
                          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
                            <img src={lbImages[lbIdx]} alt="Preview" className="w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" />
                            <div className="absolute inset-y-0 left-0 flex items-center">
                              {lbIdx > 0 && (
                                <button onClick={() => setCatalogLightbox({ ...catalogLightbox, index: lbIdx - 1 })} className="ml-2 p-2 bg-white/80 rounded-full shadow hover:bg-white">
                                  <ChevronLeft size={18} />
                                </button>
                              )}
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center">
                              {lbIdx < lbImages.length - 1 && (
                                <button onClick={() => setCatalogLightbox({ ...catalogLightbox, index: lbIdx + 1 })} className="mr-2 p-2 bg-white/80 rounded-full shadow hover:bg-white">
                                  <ChevronRight size={18} />
                                </button>
                              )}
                            </div>
                            <div className="text-center text-white text-xs mt-3 font-semibold">{lbItem?.name} — Photo {lbIdx + 1} of {lbImages.length}</div>
                            <button onClick={() => setCatalogLightbox(null)} className="absolute top-2 right-2 bg-white/80 text-gray-700 rounded-full p-1 text-xs font-bold hover:bg-white">✕</button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse bg-white">
                        <thead>
                          <tr className="border-b border-gray-200 font-bold text-devotional-maroon uppercase bg-devotional-cream/20">
                            <th className="py-2.5 px-3">Photos</th>
                            <th className="py-2.5 px-3">Model</th>
                            <th className="py-2.5 px-3">Size</th>
                            <th className="py-2.5 px-3 text-right">Retail (₹)</th>
                            <th className="py-2.5 px-3 text-right">Wholesale (₹)</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {catalog.map(item => {
                            const allImages = item.images && item.images.length > 0 ? item.images : (item.image ? [item.image] : []);
                            return (
                              <tr key={item.id} className="hover:bg-amber-50/10">
                                <td className="py-3 px-3">
                                  {allImages.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                      {allImages.slice(0, 3).map((img, idx) => (
                                        <button key={idx} onClick={() => setCatalogLightbox({ itemId: item.id, index: idx })} className="relative flex-shrink-0">
                                          <img src={img} alt={`${item.name} ${idx+1}`} className="w-10 h-10 object-cover rounded border border-devotional-gold/20 hover:border-devotional-maroon transition-all" />
                                        </button>
                                      ))}
                                      {allImages.length > 3 && (
                                        <button onClick={() => setCatalogLightbox({ itemId: item.id, index: 3 })} className="w-10 h-10 bg-devotional-maroon/10 border border-devotional-maroon/20 rounded flex items-center justify-center text-devotional-maroon text-[9px] font-bold">
                                          +{allImages.length - 3}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 bg-devotional-cream/40 border border-dashed rounded flex items-center justify-center">
                                      <ImageIcon size={12} className="text-gray-300" />
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-bold text-gray-700">{item.name}</td>
                                <td className="py-3 px-3"><span className="bg-devotional-gold/10 text-devotional-maroon px-2 py-0.5 rounded text-[10px] font-semibold">{item.size}</span></td>
                                <td className="py-3 px-3 text-right font-medium text-gray-800">₹{item.retailPrice?.toLocaleString()}</td>
                                <td className="py-3 px-3 text-right font-medium text-devotional-orange">₹{item.wholesalePrice?.toLocaleString()}</td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => startEditCatalog(item)}
                                      className="p-1 hover:bg-gray-100 rounded text-blue-600"
                                      title="Edit Item"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={() => deleteCatalogItem(item.id)}
                                      className="p-1 hover:bg-gray-100 rounded text-red-600"
                                      title="Delete Item"
                                    >
                                      <Trash2 size={12} />
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-devotional-gold/10 gap-3">
                  <div>
                    <h3 className="text-base font-bold text-devotional-maroonDark uppercase tracking-wide">
                      Customers Directory
                    </h3>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Showing {displayedCustomers.length} of {baseCustomers.length} profiles
                    </span>
                  </div>

                  {/* Filter Pill Buttons */}
                  <div className="flex items-center gap-1.5 bg-devotional-cream/40 p-1 rounded-xl border border-devotional-gold/20 text-xs">
                    <button
                      onClick={() => setCustomerFilter('active')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        customerFilter === 'active'
                          ? 'bg-devotional-maroon text-white shadow-sm'
                          : 'text-gray-600 hover:text-devotional-maroon'
                      }`}
                    >
                      Active ({activeCustomers.length})
                    </button>
                    <button
                      onClick={() => setCustomerFilter('deleted')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                        customerFilter === 'deleted'
                          ? 'bg-red-700 text-white shadow-sm'
                          : 'text-red-700 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={12} />
                      <span>Deleted ({deletedCustomers.length})</span>
                    </button>
                    <button
                      onClick={() => setCustomerFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        customerFilter === 'all'
                          ? 'bg-gray-700 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      All ({customers.length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-devotional-gold/30 font-bold text-devotional-maroon uppercase bg-devotional-gold/5">
                        <th className="py-3 px-3">Customer Profile</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Joined Date</th>
                        <th className="py-3 px-3 text-center">Orders</th>
                        <th className="py-3 px-3 text-right">Total Spent</th>
                        <th className="py-3 px-3 text-right">Advance Paid</th>
                        <th className="py-3 px-3 text-right">Balance Due</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="py-8 text-center text-gray-400">
                            {searchQuery ? `No customer profiles matching "${searchQuery}".` : (customerFilter === 'deleted' ? 'No deleted customer profiles found.' : 'No customer profiles found.')}
                          </td>
                        </tr>
                      ) : (
                        displayedCustomers.map(c => {
                          const joinDate = c.registeredAt ? new Date(c.registeredAt).toLocaleDateString() : 'N/A';
                          const latestOrder = c.orders && c.orders.length > 0 ? c.orders[0] : null;

                          return (
                            <tr key={c.id} className={`hover:bg-amber-50/10 ${c.deleted ? 'bg-red-50/20' : ''}`}>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                  <span>{c.name || 'No Name'}</span>
                                  {c.deleted && (
                                    <span className="bg-red-100 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                                      Deleted
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">📞 {c.mobile}</div>
                                {c.email && <div className="text-[9px] text-gray-400">✉ {c.email}</div>}
                                {c.address && <div className="text-[9px] text-gray-400 truncate max-w-[150px]">📍 {c.address}</div>}
                              </td>
                              <td className="py-3.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  c.customerType === 'wholesale'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>{c.customerType === 'wholesale' ? '🏭 Wholesale' : '🛍 Retail'}</span>
                              </td>
                              <td className="py-3.5 px-3 text-gray-500 whitespace-nowrap">{joinDate}</td>
                              <td className="py-3.5 px-3 text-center font-semibold text-gray-700">{c.totalOrders}</td>
                              <td className="py-3.5 px-3 text-right font-semibold text-gray-800">₹{c.totalSpent?.toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-right font-semibold text-green-700">₹{c.advancePaid?.toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-right font-bold" style={{color: c.balanceDue > 0 ? '#8B0000' : '#16a34a'}}>
                                ₹{c.balanceDue?.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {c.deleted ? (
                                  <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                                    Deleted
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">
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
                                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100"
                                      title="View Customer Bill"
                                    >
                                      <Eye size={12} />
                                    </button>
                                  )}

                                  {/* Edit Amounts */}
                                  <button
                                    onClick={() => openAmountEditor(c)}
                                    className="p-1.5 text-devotional-orange hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                                    title="Edit Total Amount & Due Amount"
                                  >
                                    <Edit size={12} />
                                  </button>

                                  {/* Delete or Restore */}
                                  {c.deleted ? (
                                    <>
                                      <button
                                        onClick={() => handleRestoreCustomer(c.id, c.name)}
                                        className="p-1.5 text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 rounded border border-green-200"
                                        title="Restore Customer Profile"
                                      >
                                        <RotateCcw size={12} />
                                      </button>
                                      <button
                                        onClick={() => handlePermanentDeleteCustomer(c.id, c.name)}
                                        className="p-1.5 text-white bg-red-600 hover:bg-red-800 rounded border border-red-700"
                                        title="Permanently Delete (Cannot be undone)"
                                      >
                                        <X size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteCustomer(c.id, c.name)}
                                      className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-100"
                                      title="Move Customer to Deleted List"
                                    >
                                      <Trash2 size={12} />
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

            {/* TAB: REVENUE & DUES (ONLY TOTAL REVENUE & STILL DUE AMOUNT + CUSTOMER DUES TABLE) */}
            {activeTab === 'revenue' && (() => {
              const allOrders = orders || [];
              const activeCustIds = new Set(customers.filter(c => !c.deleted).map(c => c.id));
              const finalizedOrders = allOrders.filter(o => o.status === 'finalized' && activeCustIds.has(o.customerId));
              
              // Total Revenue: sum of grandTotal across finalized orders for active customers
              const totalRevenue = finalizedOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
              
              // Total Still Due Amount across all customers/orders
              const totalStillDue = customers.filter(c => !c.deleted).reduce((s, c) => s + (c.balanceDue || 0), 0);
              const customersWithDue = customers.filter(c => !c.deleted && c.balanceDue > 0);

              const revenueDisplayedCustomers = activeCustomers.filter(c => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase().trim();
                return (c.name || '').toLowerCase().includes(q) || (c.mobile || '').includes(q) || (c.address || '').toLowerCase().includes(q);
              });

              return (
                <div>
                  <h3 className="text-base font-bold text-devotional-maroonDark mb-5 pb-2 border-b border-devotional-gold/10 uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp size={16} /> Revenue & Dues Overview
                  </h3>

                  {/* ONLY 2 CARDS: TOTAL REVENUE & STILL DUE AMOUNT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Card 1: TOTAL REVENUE */}
                    <div className="bg-white border-2 border-devotional-gold/40 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/30 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1.5">
                        <CreditCard size={14} className="text-devotional-orange" />
                        <span>TOTAL REVENUE</span>
                      </div>
                      <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        ₹{totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 font-medium">
                        From {finalizedOrders.length} approved & finalized orders
                      </div>
                    </div>

                    {/* Card 2: STILL DUE AMOUNT */}
                    <div className="bg-white border-2 border-red-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/30 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-red-600 mb-1.5 flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-red-600" />
                        <span>STILL DUE AMOUNT</span>
                      </div>
                      <div className="text-3xl font-extrabold text-[#8B0000] tracking-tight">
                        ₹{totalStillDue.toLocaleString()}
                      </div>
                      <div className="text-xs text-red-600 mt-2 font-semibold">
                        {customersWithDue.length} customer{customersWithDue.length !== 1 ? 's' : ''} with outstanding balance
                      </div>
                    </div>
                  </div>

                  {/* CUSTOMER DUES & BILL VIEW TABLE */}
                  <div className="bg-white border border-devotional-gold/20 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 bg-devotional-cream/20 flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-devotional-maroon flex items-center gap-2">
                        <FileText size={14} />
                        Customer Dues & Bill Management
                      </h4>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        Showing {revenueDisplayedCustomers.length} active customer profiles
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-devotional-gold/5 border-b border-gray-200">
                            <th className="py-3 px-4 font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Customer Name</th>
                            <th className="py-3 px-4 font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Phone Number</th>
                            <th className="py-3 px-4 font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Customer Type</th>
                            <th className="py-3 px-4 text-right font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Total Amount</th>
                            <th className="py-3 px-4 text-right font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Advance Paid</th>
                            <th className="py-3 px-4 text-right font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Due Amount</th>
                            <th className="py-3 px-4 text-right font-bold text-devotional-maroon uppercase text-[10px] tracking-wide">Bill Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {revenueDisplayedCustomers.map((cust) => {
                            const latestOrder = cust.orders && cust.orders.length > 0 ? cust.orders[0] : null;

                            return (
                              <tr key={cust.id} className="hover:bg-amber-50/10">
                                <td className="py-3.5 px-4 font-bold text-gray-800">
                                  {cust.name || 'No Name'}
                                  {cust.address && <span className="block text-[9px] text-gray-400 font-normal">{cust.address}</span>}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-medium text-gray-700">
                                  📞 {cust.mobile}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    cust.customerType === 'wholesale'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {cust.customerType === 'wholesale' ? '🏭 Wholesale' : '🛍 Retail'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                                  ₹{cust.totalSpent?.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right font-semibold text-green-700">
                                  ₹{cust.advancePaid?.toLocaleString()}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <span className={`font-bold px-2 py-1 rounded text-xs ${
                                    cust.balanceDue > 0 
                                      ? 'bg-red-50 text-red-700 border border-red-200' 
                                      : 'bg-green-50 text-green-700 border border-green-200'
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
                                      className="flex items-center gap-1 bg-devotional-maroon text-white hover:bg-devotional-maroonDark px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                                      title="View On-Screen Bill"
                                    >
                                      <Eye size={12} />
                                      <span>View Bill</span>
                                    </button>

                                    {/* EDIT TOTAL & DUE AMOUNT */}
                                    <button
                                      onClick={() => openAmountEditor(cust)}
                                      className="flex items-center gap-1 bg-amber-50 text-devotional-orange hover:bg-amber-100 border border-amber-200 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                                      title="Edit Total & Due Amount"
                                    >
                                      <Edit size={12} />
                                      <span>Edit Amt</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {revenueDisplayedCustomers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-400 text-xs italic">
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
                <h3 className="text-base font-bold text-devotional-maroonDark mb-4 pb-2 border-b border-devotional-gold/10 uppercase tracking-wide">
                  Customer Login Tracker
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-devotional-gold/30 font-bold text-devotional-maroon uppercase bg-devotional-gold/5">
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Email Connected</th>
                        <th className="py-2.5 px-3">Mobile Contact</th>
                        <th className="py-2.5 px-3">Login Date/Time</th>
                        <th className="py-2.5 px-3">Device / Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredActivity.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-gray-400">
                            {searchQuery ? `No login logs matching "${searchQuery}".` : 'No customer login activity recorded yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredActivity.map(log => {
                          const dateStr = new Date(log.timestamp).toLocaleString();
                          return (
                            <tr key={log.id} className="hover:bg-amber-50/10">
                              <td className="py-3 px-3 font-bold text-gray-700">{log.name}</td>
                              <td className="py-3 px-3 text-gray-600">{log.email || <span className="text-gray-300 italic">None</span>}</td>
                              <td className="py-3 px-3 font-mono">{log.mobile}</td>
                              <td className="py-3 px-3 font-medium text-gray-600">{dateStr}</td>
                              <td className="py-3 px-3 text-[10px] text-gray-400 max-w-[180px] truncate" title={log.userAgent}>
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
                <h3 className="text-base font-bold text-devotional-maroonDark mb-2 uppercase tracking-wide text-center">
                  Provision New Admin Account
                </h3>
                <p className="text-xs text-gray-500 text-center mb-6">
                  Add secondary administrators to access details and approve customer bills.
                </p>

                <form onSubmit={handleAdminProvision} className="space-y-4 bg-devotional-cream/35 border border-devotional-gold/20 p-6 rounded-2xl">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Admin Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={newAdmin.mobile}
                      onChange={(e) => setNewAdmin({ ...newAdmin, mobile: e.target.value })}
                      placeholder="Mobile number for login ID"
                      className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Secret Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      placeholder="Assign secure password"
                      className="w-full px-3 py-2 border border-devotional-gold/20 bg-white rounded-lg focus:border-devotional-orange outline-none text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-devotional-maroon text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-devotional-maroonDark transition-all border border-devotional-gold/30 mt-2"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border-2 border-devotional-gold rounded-2xl shadow-2xl animate-fadeIn relative my-6">
            
            <div className="bg-gradient-to-r from-devotional-maroon to-devotional-maroonDark text-devotional-cream px-6 py-4 flex justify-between items-center border-b border-devotional-gold">
              <h3 className="font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                <Plus size={16} className="text-devotional-gold" />
                Create New Order & Bill
              </h3>
              <button
                onClick={() => setIsCreateOrderOpen(false)}
                className="text-devotional-goldLight hover:text-white font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. Customer Information & Pricing Tier */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-1.5">
                  <h4 className="font-bold text-xs uppercase text-devotional-maroon flex items-center gap-1.5">
                    <span>1. Customer Details</span>
                  </h4>
                  
                  {/* Select Existing Customer Dropdown */}
                  {customers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-semibold">Existing Customer:</span>
                      <select
                        value={newOrderForm.customerId}
                        onChange={(e) => handleSelectCustomerForNewOrder(e.target.value)}
                        className="text-[11px] px-2 py-1 border border-devotional-gold/30 rounded-lg bg-devotional-cream/30 text-gray-800 outline-none"
                      >
                        <option value="">-- New / Type Details Below --</option>
                        {activeCustomers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.mobile}) - {c.customerType === 'wholesale' ? 'Wholesale' : 'Retail'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={newOrderForm.name}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-devotional-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={newOrderForm.mobile}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, mobile: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-devotional-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@gmail.com"
                      value={newOrderForm.email}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-devotional-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Pricing Tier</label>
                    <select
                      value={newOrderForm.customerType}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, customerType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-devotional-orange bg-white font-semibold"
                    >
                      <option value="retail">🛍 Retail Customer</option>
                      <option value="wholesale">🏭 Wholesale Dealer</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Delivery Address</label>
                    <input
                      type="text"
                      placeholder="e.g. #45, 2nd Cross, Malleshwaram, Bangalore"
                      value={newOrderForm.address}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:border-devotional-orange"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Add Items to New Order */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-devotional-maroon border-b pb-1.5 flex items-center justify-between">
                  <span>2. Add Ganesha Items to Order</span>
                  <span className="text-[10px] text-gray-400 font-normal">{newOrderForm.items.length} item(s) in order</span>
                </h4>

                {/* Item Selector Row */}
                <div className="bg-devotional-cream/30 border border-devotional-gold/20 p-3.5 rounded-xl flex flex-wrap items-end gap-3">
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Select Ganesha Model</label>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-none focus:border-devotional-orange font-medium"
                    >
                      <option value="">-- Choose Ganesha Idol --</option>
                      {catalog.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.size}) — Retail: ₹{item.retailPrice} | Wholesale: ₹{item.wholesalePrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={createOrderNewItem.quantity}
                      onChange={(e) => setCreateOrderNewItem({ ...createOrderNewItem, quantity: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-center font-bold bg-white"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Rate / Item (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={createOrderNewItem.customRate}
                      onChange={(e) => setCreateOrderNewItem({ ...createOrderNewItem, customRate: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-right font-bold bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToNewOrder}
                    className="bg-devotional-maroon text-white font-bold px-4 py-2 rounded-lg text-xs uppercase hover:bg-devotional-maroonDark flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Items Added Table */}
                {newOrderForm.items.length > 0 ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-devotional-gold/10 text-devotional-maroon font-bold border-b">
                          <th className="p-2.5">Item Name</th>
                          <th className="p-2.5">Size</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Line Total</th>
                          <th className="p-2.5 text-center">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {newOrderForm.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/10">
                            <td className="p-2.5 font-bold text-gray-800">{item.name}</td>
                            <td className="p-2.5"><span className="bg-devotional-gold/10 text-devotional-maroon px-2 py-0.5 rounded text-[10px] font-bold">{item.size}</span></td>
                            <td className="p-2.5 text-right font-medium">₹{item.rate}</td>
                            <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                            <td className="p-2.5 text-right font-bold text-gray-900">₹{item.lineTotal?.toLocaleString()}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItemFromNewOrder(idx)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                title="Remove Item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-gray-400 border border-dashed rounded-xl italic">
                    No items added yet. Select a model above and click "Add".
                  </div>
                )}
              </div>

              {/* 3. Payment Totals */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-devotional-maroon border-b pb-1.5">3. Payment Breakdown</h4>
                {/* Discount & Extra Charges */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-amber-50/20 border border-devotional-gold/20 p-3 rounded-xl">
                  <div>
                    <label className="block text-[9px] font-bold text-green-700 uppercase mb-1">🏷️ Discount / Offer (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.discount}
                      onChange={(e) => {
                        const disc = parseFloat(e.target.value) || 0;
                        const subtotal = newOrderForm.itemsSubtotal || 0;
                        const grandTotal = Math.max(0, subtotal - disc + (Number(newOrderForm.extraCharges) || 0));
                        setNewOrderForm(prev => ({ ...prev, discount: disc, grandTotal, balanceDue: Math.max(0, grandTotal - prev.advancePayment) }));
                      }}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg bg-white font-bold text-green-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-purple-700 uppercase mb-1">➕ Extra Charges / Transport (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.extraCharges}
                      onChange={(e) => {
                        const extra = parseFloat(e.target.value) || 0;
                        const subtotal = newOrderForm.itemsSubtotal || 0;
                        const grandTotal = Math.max(0, subtotal - (Number(newOrderForm.discount) || 0) + extra);
                        setNewOrderForm(prev => ({ ...prev, extraCharges: extra, grandTotal, balanceDue: Math.max(0, grandTotal - prev.advancePayment) }));
                      }}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white font-bold text-purple-700"
                    />
                  </div>
                </div>
                {/* Live Tally Summary */}
                {newOrderForm.itemsSubtotal > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-gray-600"><span>Items Subtotal</span><span>₹{newOrderForm.itemsSubtotal?.toLocaleString()}</span></div>
                    {newOrderForm.discount > 0 && <div className="flex justify-between text-green-600"><span>- Discount</span><span>- ₹{Number(newOrderForm.discount)?.toLocaleString()}</span></div>}
                    {newOrderForm.extraCharges > 0 && <div className="flex justify-between text-purple-600"><span>+ Extra Charges</span><span>+ ₹{Number(newOrderForm.extraCharges)?.toLocaleString()}</span></div>}
                    <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Grand Total</span><span>₹{newOrderForm.grandTotal?.toLocaleString()}</span></div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-amber-50/30 border border-devotional-gold/30 p-4 rounded-xl">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Grand Total Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.grandTotal}
                      onChange={(e) => {
                        const tot = parseFloat(e.target.value) || 0;
                        setNewOrderForm(prev => ({ ...prev, grandTotal: tot, balanceDue: Math.max(0, tot - prev.advancePayment) }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Advance Received (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.advancePayment}
                      onChange={(e) => {
                        const adv = parseFloat(e.target.value) || 0;
                        setNewOrderForm(prev => ({ ...prev, advancePayment: adv, balanceDue: Math.max(0, prev.grandTotal - adv) }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-green-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-red-700 uppercase mb-1">Balance Due Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={newOrderForm.balanceDue}
                      onChange={(e) => setNewOrderForm({ ...newOrderForm, balanceDue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white font-bold text-red-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-t">
              <button
                type="button"
                onClick={() => setIsCreateOrderOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100"
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
                  className="px-4 py-2 text-xs font-bold uppercase border border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download size={14} />
                  <span>Download Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateOrderSubmit(true)}
                  disabled={loading}
                  className="bg-gradient-to-r from-devotional-orange to-red-600 text-white font-bold px-6 py-2 rounded-xl hover:from-devotional-marigold hover:to-devotional-orange text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md disabled:opacity-50"
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
      {/* MODAL 2: EDIT ORDER INTAKE (ADD & DELETE ITEMS + CUSTOM AMOUNTS) */}
      {/* ============================================================ */}
      {editingOrder && orderEditForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border-2 border-devotional-gold rounded-2xl shadow-2xl animate-fadeIn relative my-6">
            
            <div className="bg-devotional-maroon text-devotional-cream px-6 py-4 flex justify-between items-center border-b border-devotional-gold">
              <h3 className="font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                <Edit size={16} className="text-devotional-gold" />
                Modify Order ID #{editingOrder.id}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-devotional-goldLight hover:text-white font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer edit details */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-devotional-maroon border-b pb-1.5">1. Customer Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={orderEditForm.name}
                      onChange={(e) => handleEditOrderFieldChange('name', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={orderEditForm.mobile}
                      onChange={(e) => handleEditOrderFieldChange('mobile', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Email ID</label>
                    <input
                      type="email"
                      value={orderEditForm.email}
                      onChange={(e) => handleEditOrderFieldChange('email', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Pricing Tier</label>
                    <select
                      value={orderEditForm.customerType}
                      onChange={(e) => handleEditOrderFieldChange('customerType', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none bg-white font-semibold"
                    >
                      <option value="retail">🛍 Retail</option>
                      <option value="wholesale">🏭 Wholesale</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-4">
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={orderEditForm.address}
                      onChange={(e) => handleEditOrderFieldChange('address', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items editing table: Add & Delete Items */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-devotional-maroon border-b pb-1.5 flex justify-between items-center">
                  <span>2. Ordered Items Quantities & Management</span>
                  <span className="text-[10px] text-gray-400 font-normal">{orderEditForm.items.length} item(s) in order</span>
                </h4>

                {/* Add Item to this Existing Order Row */}
                <div className="bg-devotional-cream/30 border border-devotional-gold/20 p-3.5 rounded-xl flex flex-wrap items-end gap-3">
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Add Another Ganesha Idol to Order</label>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white outline-none font-medium"
                    >
                      <option value="">-- Choose Ganesha Idol to Add --</option>
                      {catalog.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.size}) — Retail: ₹{item.retailPrice} | Wholesale: ₹{item.wholesalePrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={newItemToAdd.quantity}
                      onChange={(e) => setNewItemToAdd({ ...newItemToAdd, quantity: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-center font-bold bg-white"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[9px] font-bold text-gray-600 uppercase mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={newItemToAdd.customRate}
                      onChange={(e) => setNewItemToAdd({ ...newItemToAdd, customRate: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs text-right font-bold bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToExistingOrder}
                    className="bg-devotional-maroon text-white font-bold px-4 py-2 rounded-lg text-xs uppercase hover:bg-devotional-maroonDark flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Current Items List */}
                <div className="space-y-2">
                  {orderEditForm.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border rounded-xl bg-gray-50 text-xs">
                      <div>
                        <span className="font-bold text-devotional-maroonDark">{item.name}</span>
                        <span className="text-[10px] text-gray-500 block">Size: {item.size} | Rate: ₹{item.rate}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] font-bold text-gray-500">Qty:</label>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleEditOrderItemQuantity(idx, e.target.value)}
                          className="w-14 text-center py-1 border rounded bg-white text-xs font-semibold"
                        />
                        <span className="font-bold text-gray-800 w-24 text-right">₹{item.lineTotal?.toLocaleString()}</span>
                        
                        {/* Delete Item Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItemFromOrder(idx)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="Delete this item from order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {orderEditForm.items?.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 italic">
                      No items in order. Use the selector above to add items.
                    </div>
                  )}
                </div>
              </div>

              {/* Advance and Balance - Fully Editable by Admin */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-devotional-maroon border-b pb-1.5">3. Payment Totals — Discount & Charges</h4>
                {/* Discount & Extra Charges Row */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-amber-50/20 border border-devotional-gold/20 p-3 rounded-xl">
                  <div>
                    <label className="block text-[9px] font-bold text-green-700 uppercase mb-1">🏷️ Discount / Offer (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.discount}
                      onChange={(e) => handleEditOrderFieldChange('discount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg bg-white font-bold text-green-700"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-purple-700 uppercase mb-1">➕ Extra Charges / Transport (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.extraCharges}
                      onChange={(e) => handleEditOrderFieldChange('extraCharges', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white font-bold text-purple-700"
                      placeholder="0"
                    />
                  </div>
                </div>
                {/* Live Tally Banner */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-gray-600"><span>Items Subtotal</span><span>₹{(orderEditForm.itemsSubtotal || 0).toLocaleString()}</span></div>
                  {(orderEditForm.discount > 0) && <div className="flex justify-between text-green-700 font-bold"><span>- Discount</span><span>- ₹{Number(orderEditForm.discount).toLocaleString()}</span></div>}
                  {(orderEditForm.extraCharges > 0) && <div className="flex justify-between text-purple-700 font-bold"><span>+ Extra Charges</span><span>+ ₹{Number(orderEditForm.extraCharges).toLocaleString()}</span></div>}
                  <div className="flex justify-between font-extrabold text-gray-900 border-t pt-1 text-sm"><span>Grand Total</span><span>₹{Number(orderEditForm.grandTotal).toLocaleString()}</span></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-amber-50/30 border border-devotional-gold/30 p-4 rounded-xl">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Grand Total Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.grandTotal}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-bold text-gray-900 cursor-not-allowed"
                      title="Auto-calculated from items, discount & extra charges"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-700 uppercase mb-1">Advance Received (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.advancePayment}
                      onChange={(e) => handleEditOrderFieldChange('advancePayment', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-green-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-red-700 uppercase mb-1">Balance Due Amount (₹)</label>
                    <input
                      type="number" min="0"
                      value={orderEditForm.balanceDue}
                      onChange={(e) => handleEditOrderFieldChange('balanceDue', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white font-bold text-red-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center gap-3 border-t">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-5 py-2 text-xs font-bold uppercase border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                Discard
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBillPDF({ ...editingOrder, ...orderEditForm, customerDetails: { name: orderEditForm.name, mobile: orderEditForm.mobile, email: orderEditForm.email, address: orderEditForm.address } })}
                  className="px-5 py-2 text-xs font-bold uppercase border border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Download size={14} />
                  <span>Download Bill</span>
                </button>
                <button
                  type="button"
                  onClick={saveEditedOrder}
                  disabled={loading}
                  className="bg-devotional-maroon text-white font-bold px-6 py-2 rounded-lg hover:bg-devotional-maroonDark text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-devotional-gold rounded-2xl shadow-2xl animate-fadeIn overflow-hidden">
            <div className="bg-devotional-maroon text-devotional-cream px-6 py-4 flex justify-between items-center border-b border-devotional-gold">
              <h3 className="font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                <Edit size={16} className="text-devotional-gold" />
                Edit Amounts: {editingAmounts.customerName}
              </h3>
              <button
                onClick={() => setEditingAmounts(null)}
                className="text-devotional-goldLight hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white font-bold text-sm text-gray-900 outline-none focus:border-devotional-orange"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white font-bold text-sm text-green-700 outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-red-700 uppercase mb-1">
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
                  className="w-full px-3 py-2.5 border border-red-300 rounded-xl bg-white font-bold text-sm text-red-700 outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={() => setEditingAmounts(null)}
                className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAmountAdjustment}
                disabled={loading}
                className="bg-devotional-maroon text-white font-bold px-6 py-2 rounded-xl hover:bg-devotional-maroonDark text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#FFFDF6] border-2 border-devotional-gold rounded-2xl overflow-hidden shadow-2xl animate-fadeIn relative my-8">
            
            {/* Header */}
            <div className="bg-devotional-maroon text-devotional-cream px-6 py-4 flex justify-between items-center border-b border-devotional-gold">
              <h3 className="font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                <FileText size={16} className="text-devotional-gold" />
                Ganesha Works — Bill #{viewingBillOrder.id}
              </h3>
              <button
                onClick={() => setViewingBillOrder(null)}
                className="text-devotional-goldLight hover:text-white font-bold text-xs uppercase tracking-wider"
              >
                ✕ Close
              </button>
            </div>

            {/* Bill Paper Preview */}
            <div className="p-6 md:p-8 bg-white border-b border-gray-100 relative">
              <div className="border border-devotional-gold/30 p-6 rounded-xl bg-[#FFFDF6]/60">
                {/* Header Row */}
                <div className="flex justify-between items-start border-b border-devotional-maroon/20 pb-4 mb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-devotional-maroon">G.KAMAL GANESHA WORKS</h2>
                    <p className="text-[10px] text-devotional-gold font-bold uppercase tracking-wider">Bangalore Idol Manufacturer</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-gray-800">G.Kamal Ganesha Works</p>
                    <p className="text-gray-500 font-semibold">Saraipalaya, Thanisandra Main Road, Vidyasagar, Bangalore - 560077</p>
                    <p className="text-devotional-maroon font-mono font-bold">9739142445 / 8792044625</p>
                  </div>
                </div>

                {/* Info Row */}
                <div className="grid grid-cols-2 text-xs gap-4 mb-6">
                  <div>
                    <h4 className="font-bold text-devotional-maroon uppercase text-[10px] tracking-wide mb-1">Customer Details:</h4>
                    <p className="font-bold text-gray-800">{viewingBillOrder.customerDetails?.name || 'Customer'}</p>
                    <p className="text-gray-600">Phone: {viewingBillOrder.customerDetails?.mobile || 'N/A'}</p>
                    {viewingBillOrder.customerDetails?.email && <p className="text-gray-600">Email: {viewingBillOrder.customerDetails.email}</p>}
                    {viewingBillOrder.customerDetails?.address && <p className="text-gray-600">Address: {viewingBillOrder.customerDetails.address}</p>}
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-devotional-maroon uppercase text-[10px] tracking-wide mb-1">Bill Reference:</h4>
                    <p className="font-bold text-gray-800">Order ID: #{viewingBillOrder.id}</p>
                    <p className="text-gray-600">Date: {viewingBillOrder.createdAt ? new Date(viewingBillOrder.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                    <p className={`font-bold uppercase text-[10px] mt-1 ${viewingBillOrder.status === 'finalized' ? 'text-green-700' : 'text-devotional-orange'}`}>
                      Status: {viewingBillOrder.status === 'finalized' ? 'APPROVED' : 'CHECKING BILL'}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-devotional-maroon text-devotional-cream font-bold">
                        <th className="p-2 rounded-l">Item Description</th>
                        <th className="p-2">Size</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right rounded-r">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingBillOrder.items?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20">
                          <td className="p-2 font-semibold text-devotional-maroonDark">{item.name}</td>
                          <td className="p-2">{item.size}</td>
                          <td className="p-2 text-right">₹{item.rate}</td>
                          <td className="p-2 text-right font-bold">{item.quantity}</td>
                          <td className="p-2 text-right font-bold">₹{item.lineTotal?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="flex flex-col items-end gap-1.5 pt-3 border-t border-gray-200 text-xs">
                  {/* Items Subtotal */}
                  {(viewingBillOrder.discount > 0 || viewingBillOrder.extraCharges > 0) && (
                    <div className="flex justify-between w-64 pb-1 text-gray-600">
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
                  <div className="flex justify-between w-64 border-b border-gray-200 pb-1 font-semibold text-gray-700">
                    <span>Grand Total:</span>
                    <span className="font-extrabold text-gray-900">₹{viewingBillOrder.grandTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-64 border-b border-gray-100 pb-1 font-semibold text-green-700">
                    <span>Advance Received:</span>
                    <span className="font-extrabold">- ₹{viewingBillOrder.advancePayment?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between w-64 pt-1 font-bold text-devotional-maroon text-sm">
                    <span>Balance Due:</span>
                    <span className="font-extrabold text-base">₹{viewingBillOrder.balanceDue?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
              <button
                type="button"
                onClick={() => setViewingBillOrder(null)}
                className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadBillPDF(viewingBillOrder)}
                className="flex items-center gap-2 bg-devotional-maroon text-white font-bold px-5 py-2.5 rounded-xl hover:bg-devotional-maroonDark text-xs uppercase tracking-wider shadow"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border-2 border-devotional-gold rounded-2xl shadow-2xl animate-fadeIn relative my-8">
            
            <div className="bg-devotional-maroon text-devotional-cream px-6 py-4 flex justify-between items-center border-b border-devotional-gold">
              <h3 className="font-bold text-sm tracking-wider uppercase flex items-center gap-1.5">
                <FileText size={16} className="text-devotional-gold" />
                Approve & Finalize Bill
              </h3>
              <button
                onClick={() => setApprovingOrder(null)}
                className="text-devotional-goldLight hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-devotional-maroonDark mb-1">Confirming Order details:</h4>
                <div className="bg-devotional-cream/30 p-3 rounded-xl border border-devotional-gold/15 text-xs text-gray-600 space-y-1">
                  <p><strong>Customer:</strong> {approvingOrder.customerDetails?.name}</p>
                  <p><strong>Mobile:</strong> {approvingOrder.customerDetails?.mobile}</p>
                  <p><strong>Grand Total:</strong> ₹{approvingOrder.grandTotal?.toLocaleString()}</p>
                  <p><strong>Balance Due:</strong> ₹{approvingOrder.balanceDue?.toLocaleString()}</p>
                </div>
              </div>

              {/* SMS Notification Message */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">SMS Notification Dispatch</h4>
                <div className="bg-devotional-cream/20 p-4 border border-devotional-gold/25 rounded-xl text-xs text-gray-700">
                  <p className="leading-relaxed">
                    An automated <strong>Thank You SMS</strong> containing a secure bill download link will be dispatched to the customer's mobile number:
                  </p>
                  <p className="font-bold mt-2 text-devotional-maroonDark text-sm">
                    {approvingOrder.customerDetails?.mobile}
                  </p>
                </div>
              </div>

              <div className="text-center p-3.5 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[10px] leading-relaxed">
                <strong>Attention:</strong> Approving will watermark the PDF with <strong>"G.kamal ganesha works"</strong>, remove the checking note, and unlock the customer download button.
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-between gap-3 border-t">
              <button
                type="button"
                onClick={() => setApprovingOrder(null)}
                className="px-5 py-2.5 text-xs font-bold border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBillPDF(approvingOrder)}
                  className="px-5 py-2.5 text-xs font-bold uppercase border border-amber-600 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Download size={14} />
                  <span>Download Bill</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  disabled={loading}
                  className="bg-gradient-to-r from-devotional-orange to-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:from-devotional-marigold hover:to-devotional-orange transition-all duration-300 text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Approval</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM DIALOG MODAL - for all delete/destructive actions */}
      {/* ============================================================ */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex justify-center items-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border-2 border-red-200 animate-fadeIn">
            <div className={`px-6 py-4 rounded-t-2xl flex items-center gap-3 ${confirmDialog.isDanger ? 'bg-red-600' : 'bg-devotional-maroon'}`}>
              <span className="text-2xl">{confirmDialog.isDanger ? '🗑️' : '❓'}</span>
              <h3 className="font-bold text-white text-sm tracking-wide">{confirmDialog.title || 'Confirm Action'}</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="px-6 pb-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-5 py-2 text-sm font-semibold border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}
                className={`px-5 py-2 text-sm font-bold rounded-xl text-white transition-all shadow ${
                  confirmDialog.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-devotional-maroon hover:bg-devotional-maroonDark'
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
