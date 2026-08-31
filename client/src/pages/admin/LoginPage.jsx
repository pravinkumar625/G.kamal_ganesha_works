import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../../components/DiyaDecoration';
import Footer from '../../components/Footer';
import { Phone, Lock, LogIn, AlertCircle } from 'lucide-react';

const AdminLoginPage = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex flex-col justify-between relative bg-devotional-cream text-devotional-maroon">
      {/* Top Border Arch Decor */}
      <div className="w-full bg-devotional-maroon h-3 relative z-10 border-b border-devotional-gold"></div>

      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm border-2 border-devotional-gold rounded-2xl p-8 shadow-xl relative overflow-hidden">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-2">
              <DiyaDecoration className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-wide uppercase text-devotional-maroonDark">
              Admin Control Center
            </h2>
            <p className="text-xs text-devotional-gold font-bold tracking-wider uppercase mt-1">
              G.Kamal Ganesha Works
            </p>
            <p className="text-xs text-red-500 mt-1 font-semibold">
              Restricted Area — Authorized Personnel Only
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
            {/* Mobile Field */}
            <div>
              <label htmlFor="mobile" className="block text-xs font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1.5">
                Admin Mobile Number
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
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="mobile" className="block text-xs font-bold uppercase tracking-wider text-devotional-maroon/80 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-devotional-cream/30 border border-devotional-gold/20 rounded-xl focus:border-devotional-orange focus:ring-1 focus:ring-devotional-orange outline-none text-sm transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-devotional-maroon to-devotional-maroonDark text-white font-bold py-3.5 rounded-xl hover:bg-gradient-to-r hover:from-devotional-maroonDark hover:to-red-950 transition-all duration-300 shadow-lg flex justify-center items-center gap-2 tracking-wide disabled:opacity-50 border border-devotional-gold/40"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Admin Secure Login</span>
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

export default AdminLoginPage;
