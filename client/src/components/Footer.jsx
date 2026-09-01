import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Heart, Sparkles, MapPin } from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="relative z-10 w-full mt-16 pb-8 pt-6 px-4">
      <div className="max-w-6xl mx-auto glass-panel p-6 sm:p-8 text-center border border-[#ffd700]/25 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Top Accent */}
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#ffd700]"></div>
          <span className="text-[#ffd700] text-sm animate-pulse">✦ ॐ ✦</span>
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#ffd700]"></div>
        </div>

        {/* Brand Name */}
        <h3 className="font-cinzel text-lg sm:text-xl font-extrabold text-gold-gradient tracking-widest mb-1">
          G.Kamal Ganesha Works
        </h3>
        <p className="text-xs text-[#ffebc2] tracking-wider uppercase mb-6 font-medium">
          Bengaluru's Premier Eco-Friendly Clay Ganesha Idols
        </p>

        {/* Contact Numbers */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-10 text-xs sm:text-sm text-[#ffebc2] font-semibold mb-6">
          <a 
            href="tel:9739142445" 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[#ffd700]/20 hover:border-[#ffd700] hover:bg-[#ffd700]/10 transition-all text-[#ffd700]"
          >
            <Phone size={14} className="text-[#ff6a00]" />
            <span>G.Kamal: <strong>9739142445</strong></span>
          </a>

          <a 
            href="tel:8792044625" 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-[#ffd700]/20 hover:border-[#ffd700] hover:bg-[#ffd700]/10 transition-all text-[#ffd700]"
          >
            <Phone size={14} className="text-[#ff6a00]" />
            <span>Pravin Kumar: <strong>8792044625</strong></span>
          </a>
        </div>

        {/* Bottom Copyright & Admin Secret Trigger */}
        <div className="border-t border-[#ffd700]/15 pt-4 flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#b3999c] gap-2">
          <p>
            © {new Date().getFullYear()} G.Kamal Ganesha Works. All traditional craftsmanship rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[#ffd700]/60">Handcrafted with pure clay & devotion</span>
            <button
              onClick={() => navigate('/login/admin')}
              className="text-[#ffd700]/30 hover:text-[#ffd700] transition-colors"
              title="Admin Console"
            >
              ✦
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
