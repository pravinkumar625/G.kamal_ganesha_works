import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../../components/DiyaDecoration';
import Footer from '../../components/Footer';
import { Mail, Phone, LogIn, AlertCircle, ShoppingBag, Store, Sparkles, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md glass-panel p-8 sm:p-10 border-2 border-[#ffd700]/30 shadow-2xl relative overflow-hidden animate-fadeIn">
          
          {/* Subtle background glow accents */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#ff6a00]/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#ffd700]/15 rounded-full blur-2xl pointer-events-none"></div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <DiyaDecoration className="w-12 h-12 animate-float" />
            </div>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-gold-gradient tracking-wide uppercase">
              Customer Portal
            </h2>
            <p className="text-xs text-[#ffd700] font-bold tracking-widest uppercase mt-1">
              G.Kamal Ganesha Works
            </p>
            <p className="text-xs text-[#b3999c] mt-2">
              Enter your mobile number to view transparent pricing & place orders.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-start gap-2.5 animate-pulse">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Account Type / Pricing Tier Selector Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-2 font-cinzel">
                Select Pricing Tier <span className="text-[#ff6a00]">*</span>
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setCustomerType('retail')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center select-none ${
                    customerType === 'retail'
                      ? 'bg-[#ffd700]/15 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.25)] scale-[1.02]'
                      : 'bg-white/5 border-[#ffd700]/20 hover:border-[#ffd700]/40 opacity-70'
                  }`}
                >
                  <ShoppingBag size={20} className={customerType === 'retail' ? 'text-[#ffd700]' : 'text-gray-400'} />
                  <span className="font-cinzel font-bold text-xs mt-1 text-[#ffd700]">Retailer</span>
                  <span className="text-[10px] text-[#b3999c] mt-0.5">Single / Few Idols</span>
                </div>

                <div 
                  onClick={() => setCustomerType('wholesale')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center select-none ${
                    customerType === 'wholesale'
                      ? 'bg-[#ffd700]/15 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.25)] scale-[1.02]'
                      : 'bg-white/5 border-[#ffd700]/20 hover:border-[#ffd700]/40 opacity-70'
                  }`}
                >
                  <Store size={20} className={customerType === 'wholesale' ? 'text-[#ffd700]' : 'text-gray-400'} />
                  <span className="font-cinzel font-bold text-xs mt-1 text-[#ffd700]">Wholesaler</span>
                  <span className="text-[10px] text-[#b3999c] mt-0.5">Bulk Purchase</span>
                </div>
              </div>
            </div>

            {/* Mobile Field */}
            <div>
              <label htmlFor="mobile" className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                Mobile Number <span className="text-[#ff6a00]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#ffd700]/60 pointer-events-none">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  placeholder="e.g. 9739142445"
                  className="w-full pl-10 pr-4 py-3 input-glass text-sm"
                />
              </div>
              <p className="text-[10px] text-[#b3999c] mt-1">If unregistered, a customer profile will be created automatically.</p>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                Email Address (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#ffd700]/60 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 input-glass text-sm"
                />
              </div>
              <p className="text-[10px] text-[#b3999c] mt-1">Used to email your finalized invoice.</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-3.5 flex justify-center items-center gap-2 text-sm shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#1a0003] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Enter Customer Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-8 text-center border-t border-[#ffd700]/15 pt-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-[#ffd700] hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLoginPage;
