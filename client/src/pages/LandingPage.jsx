import React from 'react';
import { useNavigate } from 'react-router-dom';
import DiyaDecoration from '../components/DiyaDecoration';
import MapLocationLink from '../components/MapLocationLink';
import Footer from '../components/Footer';

const LandingPage = () => {
  const navigate = useNavigate();

  // Mock idol preview list for premium gallery representation
  const previews = [
    { name: 'Clay Bal Ganesha', size: '1/2 ft to 1.5 ft', desc: 'Eco-friendly pure mud models without chemicals, perfect for home pooja.', tag: 'Popular' },
    { name: 'Traditional Ganesha', size: '1 ft to 2.5 ft', desc: 'Decorated with natural colors, featuring traditional ornaments and posture.', tag: 'Traditional' },
    { name: 'Royal Durbar Ganesha', size: '2 ft to 3 ft', desc: 'Grand design with an elegant background throne arch and vibrant styling.', tag: 'Premium' }
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-devotional-cream text-devotional-maroon">
      {/* Top Temple Arch Ornament */}
      <div className="w-full bg-devotional-maroon h-3 relative z-10 border-b border-devotional-gold">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-repeat-x opacity-40" style={{
          backgroundImage: 'radial-gradient(circle, #D4AF37 2px, transparent 2px)',
          backgroundSize: '10px 4px'
        }}></div>
      </div>

      <main className="relative z-10 flex-grow max-w-6xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
        {/* Title Group with Diya */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <DiyaDecoration className="w-12 h-12" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-devotional-maroon via-[#a52a2a] to-devotional-maroonDark bg-clip-text text-transparent drop-shadow-sm">
            G.Kamal Ganesha Works
          </h1>
          <DiyaDecoration className="w-12 h-12 transform scale-x-[-1]" />
        </div>

        <p className="text-devotional-gold font-bold tracking-widest text-xs md:text-sm uppercase mb-8">
          ✦ Premium Divine Idol Manufacturer in Bangalore ✦
        </p>

        {/* Hero Section Card */}
        <div className="bg-white/80 backdrop-blur-sm border border-devotional-gold/30 rounded-2xl p-8 md:p-12 max-w-3xl shadow-xl glow-gold mb-12 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-devotional-marigold/10 blur-xl"></div>
          <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-devotional-gold/10 blur-xl"></div>

          <h2 className="text-xl md:text-2xl font-bold mb-4 border-b border-devotional-gold/20 pb-2">
            Bring Home The Divine Blessings
          </h2>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-6">
            Welcome to G.Kamal Ganesha Works! Celebrating decades of traditional craftsmanship in Bangalore, we design premium, eco-friendly clay Ganesha idols. Every idol is hand-sculpted by master artisans using organic clay, offering pure, natural elegance ranging from 1/4 feet up to 3 feet in size.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
            <button
              onClick={() => navigate('/login/customer')}
              className="w-full sm:w-auto bg-gradient-to-r from-devotional-orange to-red-600 text-white font-bold px-8 py-3.5 rounded-xl hover:from-devotional-marigold hover:to-devotional-orange transition-all duration-300 shadow-lg hover:shadow-orange-300/40 text-center tracking-wide"
            >
              Customer Portal
            </button>
            
            <button
              onClick={() => navigate('/login/admin')}
              className="w-full sm:w-auto bg-gradient-to-r from-devotional-maroon to-devotional-maroonDark border border-devotional-gold/30 text-devotional-cream font-bold px-8 py-3.5 rounded-xl hover:bg-devotional-maroonDark/90 transition-all duration-300 shadow-lg text-center tracking-wide"
            >
              Admin Portal
            </button>
            
            <MapLocationLink className="w-full sm:w-auto" />
          </div>
        </div>

        {/* Preview Gallery Section */}
        <div className="w-full mt-4">
          <h3 className="text-lg md:text-xl font-bold mb-6 flex items-center justify-center gap-2">
            <span className="text-devotional-gold">✦</span> Preview Glimpse <span className="text-devotional-gold">✦</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {previews.map((item, idx) => (
              <div key={idx} className="bg-white/70 border border-devotional-gold/20 rounded-xl p-6 text-left hover:border-devotional-gold transition-all duration-300 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs bg-devotional-maroon/10 text-devotional-maroon px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {item.tag}
                    </span>
                    <span className="text-xs text-devotional-gold font-semibold">{item.size}</span>
                  </div>
                  <h4 className="font-bold text-base mb-2 text-devotional-maroonDark">{item.name}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                  <span className="text-xs text-devotional-orange font-bold">100% Eco-friendly</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Admin Access Trigger */}
        <button
          onClick={() => navigate('/login/admin')}
          className="mt-8 text-[10px] text-devotional-gold/10 hover:text-devotional-gold/50 transition-colors duration-300"
          title="Admin Access"
        >
          ✦ Admin Login
        </button>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
