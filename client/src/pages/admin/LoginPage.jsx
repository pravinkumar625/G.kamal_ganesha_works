import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../../components/DiyaDecoration';
import Footer from '../../components/Footer';
import { Phone, Lock, LogIn, AlertCircle, ShieldAlert, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const AdminLoginPage = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!mobile || !password) {
      setError('Mobile number and password are required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Store JWT token and session user information
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));

      // Redirect to admin dashboard
      navigate('/admin/dashboard');
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
          
          {/* Glowing Accents */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#ff6a00]/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#ffd700]/15 rounded-full blur-2xl pointer-events-none"></div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-2xl bg-[#ffd700]/15 border border-[#ffd700]/30 text-[#ffd700] shadow-lg">
                <ShieldAlert size={28} />
              </div>
            </div>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-extrabold text-gold-gradient tracking-wide uppercase">
              Admin Control Center
            </h2>
            <p className="text-xs text-[#ffd700] font-bold tracking-widest uppercase mt-1">
              G.Kamal Ganesha Works
            </p>
            <p className="text-[11px] text-amber-300/80 mt-2 font-medium">
              Authorized Personnel & Management Console
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
            {/* Mobile Field */}
            <div>
              <label htmlFor="adminMobile" className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                Admin Mobile Number <span className="text-[#ff6a00]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#ffd700]/60 pointer-events-none">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  id="adminMobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  placeholder="e.g. 9739142445"
                  className="w-full pl-10 pr-4 py-3 input-glass text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="adminPassword" className="block text-xs font-bold uppercase tracking-wider text-[#ffebc2] mb-1.5 font-cinzel">
                Password <span className="text-[#ff6a00]">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#ffd700]/60 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="adminPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-12 py-3 input-glass text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#ffd700]/60 hover:text-[#ffd700]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-3.5 flex justify-center items-center gap-2 text-sm shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#1a0003] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Authenticate & Enter</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 text-center border-t border-[#ffd700]/15 pt-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-[#ffd700] hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
            >
              <ArrowLeft size={13} />
              <span>Back to Main Page</span>
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminLoginPage;
