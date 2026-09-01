import React from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../components/DiyaDecoration';
import MapLocationLink from '../components/MapLocationLink';
import Footer from '../components/Footer';
import { Sparkles, Leaf, Award, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const previews = [
    { 
      name: 'Clay Bal Ganesha', 
      size: '1/2 ft to 1.5 ft', 
      desc: 'Eco-friendly pure mud models without toxic paints, ideal for home and family pooja.', 
      tag: 'Most Popular',
      priceHint: 'From ₹450'
    },
    { 
      name: 'Traditional Ganesha', 
      size: '1.5 ft to 2.5 ft', 
      desc: 'Adorned with organic natural colors, featuring classical ornaments and blessing posture.', 
      tag: 'Heritage',
      priceHint: 'From ₹1,800'
    },
    { 
      name: 'Royal Durbar Ganesha', 
      size: '2 ft to 3 ft', 
      desc: 'Grand majestically sculpted idol with an elegant backdrop throne arch and vibrant crown.', 
      tag: 'Grand Royal',
      priceHint: 'From ₹6,500'
    }
  ];

  const features = [
    {
      icon: Leaf,
      title: '100% Pure Natural Clay',
      desc: 'Dissolves easily in water without harming mother nature or aquatic life.'
    },
    {
      icon: Award,
      title: 'Master Sculptor Artistry',
      desc: 'Every idol is handcrafted with divine precision and decades of devotional craftsmanship.'
    },
    {
      icon: ShoppingBag,
      title: 'Wholesale & Retail Tiers',
      desc: 'Special bulk purchase rates for community Mandalis, temples, and retailers.'
    },
    {
      icon: ShieldCheck,
      title: 'Instant Digital Bill & SMS',
      desc: 'Transparent order tracking, PDF bill generation, and automated status SMS.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#f7f9fa]">
      
      <main className="relative z-10 flex-grow max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center justify-center text-center">
        
        {/* Divine Subtitle Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] text-xs font-bold uppercase tracking-widest mb-6 animate-fadeIn">
          <Sparkles size={14} className="text-[#ff6a00]" />
          <span>Divine Eco-Friendly Clay Idols • Bangalore</span>
          <Sparkles size={14} className="text-[#ff6a00]" />
        </div>

        {/* Hero Title Group */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-4">
          <DiyaDecoration className="w-10 h-10 sm:w-14 sm:h-14 animate-float" />
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-cinzel font-extrabold tracking-wider text-gold-gradient drop-shadow-2xl glow-text">
            G.Kamal Ganesha Works
          </h1>
          <DiyaDecoration className="w-10 h-10 sm:w-14 sm:h-14 transform scale-x-[-1] animate-float" />
        </div>

        <p className="text-[#ffebc2] text-xs sm:text-base max-w-2xl mx-auto font-medium tracking-wide mb-10 leading-relaxed">
          Celebrating decades of spiritual tradition in Bangalore. Handcrafting divine, 100% natural clay Ganesha idols from 1/4 feet to 3 feet with pure devotion.
        </p>

        {/* Main Hero Action Card */}
        <div className="glass-panel p-8 sm:p-12 max-w-3xl w-full text-center relative overflow-hidden mb-16 border-2 border-[#ffd700]/30 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6a00]/15 rounded-bl-full pointer-events-none blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ffd700]/10 rounded-tr-full pointer-events-none blur-2xl"></div>

          <h2 className="font-cinzel text-xl sm:text-3xl font-extrabold text-[#ffd700] mb-4">
            Bring Home The Auspicious Blessings
          </h2>
          
          <p className="text-sm sm:text-base text-[#ffebc2] leading-relaxed mb-8 max-w-xl mx-auto opacity-95 font-medium">
            Explore our handcrafted catalog, view transparent retail & wholesale pricing, configure advance payments, and receive automated digital invoices with SMS confirmation.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => navigate('/login/customer')}
              className="w-full sm:w-auto btn-gold px-8 py-4 text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-transform"
            >
              <span>Enter Customer Portal</span>
              <ArrowRight size={16} />
            </button>
            
            <button
              onClick={() => navigate('/login/admin')}
              className="w-full sm:w-auto btn-outline-gold px-8 py-4 text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <span>Admin Management</span>
            </button>
            
            <MapLocationLink className="w-full sm:w-auto" />
          </div>
        </div>

        {/* 4 Feature Cards */}
        <div className="w-full mb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-[1px] w-12 bg-[#ffd700]/30"></div>
            <h3 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient tracking-wider uppercase">
              Why Choose G.Kamal Idols
            </h3>
            <div className="h-[1px] w-12 bg-[#ffd700]/30"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx} 
                  className="glass-panel p-6 border border-[#ffd700]/20 hover:border-[#ffd700]/60 transition-all duration-300 group hover:-translate-y-1.5"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffd700]/20 to-[#ff6a00]/20 border border-[#ffd700]/30 flex items-center justify-center mb-4 text-[#ffd700] group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <h4 className="font-cinzel font-bold text-base text-[#ffd700] mb-2">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Idol Gallery Glimpse */}
        <div className="w-full mb-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-[1px] w-12 bg-[#ffd700]/30"></div>
            <h3 className="font-cinzel text-lg sm:text-xl font-bold text-gold-gradient tracking-wider uppercase">
              ✦ Exclusive Craft Collection ✦
            </h3>
            <div className="h-[1px] w-12 bg-[#ffd700]/30"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {previews.map((item, idx) => (
              <div 
                key={idx} 
                className="glass-panel p-6 text-left border border-[#ffd700]/20 hover:border-[#ffd700]/60 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-2"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full badge-orange">
                      {item.tag}
                    </span>
                    <span className="text-xs text-[#ffd700] font-semibold">{item.size}</span>
                  </div>
                  
                  <h4 className="font-cinzel font-bold text-lg text-gold-gradient mb-2 group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  
                  <p className="text-xs text-[#cbd5e1] leading-relaxed mb-4 font-medium">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-[#ffd700]/15 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ffd700]">{item.priceHint}</span>
                  <span className="text-[11px] text-[#ff6a00] font-semibold flex items-center gap-1">
                    <Leaf size={12} /> 100% Eco Clay
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
