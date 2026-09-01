import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, ShieldAlert, LogOut, Home, Sparkles, MapPin } from 'lucide-react';
import DiyaDecoration from './DiyaDecoration';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const customerToken = localStorage.getItem('customerToken');
  const adminToken = localStorage.getItem('adminToken');

  const customerUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('customerUser')) || null;
    } catch (e) {
      return null;
    }
  })();

  const adminUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser')) || null;
    } catch (e) {
      return null;
    }
  })();

  const handleCustomerLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerUser');
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setMobileMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-3 z-40 mx-3 sm:mx-6 my-2">
      <nav className="glass-panel px-4 sm:px-6 py-3 flex items-center justify-between border border-[#ffd700]/30 shadow-2xl">
        {/* Brand Logo */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="relative">
            <DiyaDecoration className="w-9 h-9 transform group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 bg-[#ff6a00]/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div>
            <span className="block font-cinzel font-extrabold text-base sm:text-lg text-gold-gradient tracking-wider leading-tight">
              G.Kamal Ganesha Works
            </span>
            <span className="block text-[10px] sm:text-xs font-semibold text-orange-gradient tracking-widest uppercase">
              Eco-Friendly Clay Idols • Bangalore
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              isActive('/') 
                ? 'text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/30' 
                : 'text-[#ffebc2] hover:text-white hover:bg-white/5'
            }`}
          >
            <Home size={14} />
            <span>Home</span>
          </button>

          {/* Customer links */}
          {customerToken ? (
            <>
              <button
                onClick={() => navigate('/customer/dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive('/customer/dashboard') 
                    ? 'text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/30' 
                    : 'text-[#ffebc2] hover:text-white hover:bg-white/5'
                }`}
              >
                <User size={14} className="text-[#ffd700]" />
                <span>My Portal ({customerUser?.name || 'Customer'})</span>
              </button>
              <button
                onClick={handleCustomerLogout}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all font-bold"
                title="Customer Logout"
              >
                <LogOut size={13} />
                <span>Exit</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login/customer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                isActive('/login/customer') 
                  ? 'btn-gold shadow-md' 
                  : 'btn-outline-gold'
              }`}
            >
              <User size={14} />
              <span>Customer Portal</span>
            </button>
          )}

          {/* Admin links */}
          {adminToken ? (
            <>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive('/admin/dashboard') 
                    ? 'text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/30' 
                    : 'text-[#ffebc2] hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldAlert size={14} className="text-[#ffd700]" />
                <span>Admin Dashboard</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all font-bold"
                title="Admin Logout"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login/admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                isActive('/login/admin') 
                  ? 'text-[#ffd700] border border-[#ffd700]/40 font-bold' 
                  : 'text-[#cbd5e1] hover:text-[#ffd700]'
              }`}
            >
              <ShieldAlert size={13} />
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#ffd700] hover:text-white focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 glass-panel p-4 border border-[#ffd700]/30 space-y-3 animate-fadeIn shadow-2xl">
          <button
            onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase ${
              isActive('/') ? 'text-[#ffd700] bg-[#ffd700]/10' : 'text-[#ffebc2]'
            }`}
          >
            <Home size={16} />
            <span>Home</span>
          </button>

          {customerToken ? (
            <>
              <button
                onClick={() => { navigate('/customer/dashboard'); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase text-[#ffd700] bg-[#ffd700]/10"
              >
                <User size={16} />
                <span>My Portal ({customerUser?.name || 'Customer'})</span>
              </button>
              <button
                onClick={handleCustomerLogout}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase text-red-400"
              >
                <LogOut size={16} />
                <span>Customer Exit</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => { navigate('/login/customer'); setMobileMenuOpen(false); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase btn-gold text-[#1a0003]"
            >
              <User size={16} />
              <span>Customer Portal</span>
            </button>
          )}

          {adminToken ? (
            <>
              <button
                onClick={() => { navigate('/admin/dashboard'); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase text-[#ffd700] bg-[#ffd700]/10"
              >
                <ShieldAlert size={16} />
                <span>Admin Dashboard</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase text-red-400"
              >
                <LogOut size={16} />
                <span>Admin Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => { navigate('/login/admin'); setMobileMenuOpen(false); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase text-[#ffebc2] hover:text-[#ffd700]"
            >
              <ShieldAlert size={16} />
              <span>Admin Portal</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
