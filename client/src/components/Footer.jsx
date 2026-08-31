import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="relative z-10 w-full bg-devotional-maroon text-devotional-cream py-6 mt-12 border-t-4 border-devotional-gold">
      <div className="max-w-6xl mx-auto px-4 text-center">
        {/* Subtle decorative border element */}
        <div className="flex justify-center items-center gap-2 mb-3">
          <div className="h-[1px] w-12 bg-devotional-gold opacity-50"></div>
          <span className="text-devotional-gold text-lg">✦</span>
          <div className="h-[1px] w-12 bg-devotional-gold opacity-50"></div>
        </div>

        <p className="font-semibold text-sm tracking-wide md:text-base mb-3 select-none">
          All rights reserved by{' '}
          <span
            onClick={() => navigate('/login/admin')}
            className="cursor-default hover:text-devotional-goldLight transition-colors duration-150"
            title="G.Kamal Ganesha Works"
          >
            G.Kamal
          </span>{' '}
          Ganesha Works
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 text-xs md:text-sm text-devotional-goldLight font-medium">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
            <Phone size={14} className="text-devotional-gold" />
            <span>G.Kamal — <a href="tel:9739142445" className="hover:underline">9739142445</a></span>
          </div>
          <div className="hidden sm:block text-devotional-gold opacity-30">|</div>
          <div className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
            <Phone size={14} className="text-devotional-gold" />
            <span>Pravin Kumar — <a href="tel:8792044625" className="hover:underline">8792044625</a></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
