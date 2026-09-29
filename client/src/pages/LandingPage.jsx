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
      name: 'DARBAR', 
      desc: 'Eco-friendly pure mud model sculpted with divine grace for home and family pooja.', 
      tag: 'Ganesha #1',
      priceHint: '₹505'
    },
    { 
      name: '1.5 FEET GOWRI', 
      desc: 'Gracefully crafted sacred clay Gowri idol with natural divine radiance.', 
      tag: 'Gowri #11',
      priceHint: '₹610'
    },
    { 
      name: 'KALVET', 
      desc: 'Grand majestically sculpted traditional clay idol model with exquisite classical detailing.', 
      tag: 'Ganesha #10',
      priceHint: '₹1,200'
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
      title: 'Direct Official Pricing',
      desc: 'Transparent manufacturer rates for all handcrafted Ganesha and Gowri models.'
    },
    {
      icon: ShieldCheck,
      title: 'Instant Checking Bill (PDF)',
      desc: 'Instant pricing calculation, customizable advance payment, and printable Checking Bill PDF.'
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

        {/* Divine Hero Logo Emblem */}
        <div className="relative mb-6 group cursor-pointer" onClick={() => navigate('/catalog')}>
          <div className="absolute -inset-1.5 bg-gradient-to-r from-[#ffd700] via-[#ff6a00] to-[#ffd700] rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
          <img 
            src="/logo.png" 
            alt="G.Kamal Ganesha Works" 
            className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#ffd700] shadow-2xl transform group-hover:scale-105 transition-all duration-500 bg-black" 
          />
        </div>

        {/* Hero Title Group */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-4">
          <DiyaDecoration className="w-8 h-8 sm:w-12 sm:h-12 animate-float" />
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-cinzel font-extrabold tracking-wider text-gold-gradient drop-shadow-2xl glow-text">
            G.Kamal Ganesha Works
          </h1>
          <DiyaDecoration className="w-8 h-8 sm:w-12 sm:h-12 transform scale-x-[-1] animate-float" />
        </div>

        <p className="text-[#ffebc2] text-xs sm:text-base max-w-2xl mx-auto font-medium tracking-wide mb-10 leading-relaxed">
          Celebrating decades of spiritual tradition in Bangalore. Handcrafting divine, 100% natural clay Ganesha and Gowri idols with pure devotion.
        </p>

        {/* Main Hero Action Card */}
        <div className="glass-panel p-8 sm:p-12 max-w-3xl w-full text-center relative overflow-hidden mb-16 border-2 border-[#ffd700]/30 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6a00]/15 rounded-bl-full pointer-events-none blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ffd700]/10 rounded-tr-full pointer-events-none blur-2xl"></div>

          <h2 className="font-cinzel text-xl sm:text-3xl font-extrabold text-[#ffd700] mb-4">
            Bring Home The Auspicious Blessings
          </h2>
          
          <p className="text-sm sm:text-base text-[#ffebc2] leading-relaxed mb-8 max-w-xl mx-auto opacity-95 font-medium">
            Explore our official 2026 catalog, view transparent pricing, configure advance payments, and generate instant Checking Bills in PDF format.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={() => navigate('/catalog')}
              className="w-full sm:w-auto btn-gold px-8 py-4 text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition-transform font-bold"
            >
              <span>✦ View Catalog & Generate Bill</span>
              <ArrowRight size={16} />
            </button>
            
            <button
              onClick={() => navigate('/login/admin')}
              className="w-full sm:w-auto btn-outline-gold px-8 py-4 text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <span>Admin Portal</span>
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
              ✦ Official 2026 Collection Glimpse ✦
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
                  </div>
                  
                  <h4 className="font-cinzel font-bold text-lg text-gold-gradient mb-2 group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  
                  <p className="text-xs text-[#cbd5e1] leading-relaxed mb-4 font-medium">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-[#ffd700]/15 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#ffd700] font-cinzel">{item.priceHint}</span>
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
