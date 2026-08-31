import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../../components/DiyaDecoration';
import Footer from '../../components/Footer';
import { Mail, Phone, LogIn, AlertCircle } from 'lucide-react';

const CustomerLoginPage = () => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [customerType, setCustomerType] = useState('retail');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (token) {
      navigate('/customer/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!mobile) {
      setError('Mobile number is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile, customerType })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store JWT token and session user information
      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerUser', JSON.stringify(data.user));

      // Redirect to customer dashboard
      navigate('/customer/dashboard');
    } catch (err) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-devotional-cream text-devotional-maroon">
      {/* Top Border Arch Decor */}
      <div className="w-full bg-devotional-maroon h-3 relative z-10 border-b border-devotional-gold"></div>

      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm border border-devotional-gold/30 rounded-2xl p-8 shadow-xl glow-gold relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2">
              <DiyaDecoration className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-wide uppercase text-devotional-maroonDark">
              Customer Portal
            </h2>
            <p className="text-xs text-devotional-gold font-bold tracking-wider uppercase mt-1">
              G.Kamal Ganesha Works
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Enter your mobile number to view pricing & place orders.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border-l-4 border-red-500 rounded-r text-red-700 text-sm flex items-start gap-2 animate-pulse">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1.5">
                Email Address (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-devotional-cream/30 border border-devotional-gold/20 rounded-xl focus:border-devotional-orange focus:ring-1 focus:ring-devotional-orange outline-none text-sm transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Used to email your finalized bill</p>
            </div>

            {/* Mobile Field */}
            <div>
              <label htmlFor="mobile" className="block text-xs font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  placeholder="e.g. 9739142445"
                  className="w-full pl-10 pr-4 py-3 bg-devotional-cream/30 border border-devotional-gold/20 rounded-xl focus:border-devotional-orange focus:ring-1 focus:ring-devotional-orange outline-none text-sm transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">If unregistered, a new account will be created automatically</p>
            </div>

            {/* Wholesaler or Retailer Selector */}
            <div>
              <label htmlFor="customerType" className="block text-xs font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1.5">
                Account Type / Pricing Tier <span className="text-red-500">*</span>
              </label>
              <select
                id="customerType"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full px-3 py-3 bg-white border border-devotional-gold/20 rounded-xl focus:border-devotional-orange outline-none text-sm transition-all"
              >
                <option value="retail">Retailer (Single/Few Idols)</option>
                <option value="wholesale">Wholesaler (Bulk Purchase)</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-devotional-orange to-red-600 text-white font-bold py-3.5 rounded-xl hover:from-devotional-marigold hover:to-devotional-orange transition-all duration-300 shadow-lg hover:shadow-orange-300/40 flex justify-center items-center gap-2 tracking-wide disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Enter Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 text-center border-t border-gray-100 pt-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-devotional-maroon hover:underline font-semibold"
            >
              ← Back to Main Page
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLoginPage;
