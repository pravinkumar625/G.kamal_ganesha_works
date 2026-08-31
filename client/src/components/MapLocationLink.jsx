import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

const MAP_URL = "https://www.google.com/maps/dir//Ganesha+works+(G+KAMAL),+Geddalahalli,+Ashwath+Nagar,+HBR+Layout,+Bengaluru,+Karnataka+560077/@13.0712493,77.6421572,3393m/data=!3m2!1e3!4b1!4m8!4m7!1m0!1m5!1m1!1s0x3bae17e82795de25:0x44b2a0a92dddf418!2m2!1d77.6344443!2d13.0471012?entry=ttu&g_ep=EgoyMDI2MDgyNi4wIKXMDSoASAFQAw%3D%3D";

const MapLocationLink = ({ className = "" }) => {
  return (
    <a
      href={MAP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 bg-gradient-to-r from-devotional-maroon to-devotional-maroonDark border border-devotional-gold/40 text-devotional-cream px-5 py-3 rounded-lg hover:border-devotional-gold shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 group ${className}`}
    >
      <div className="p-1.5 rounded-full bg-devotional-gold/10 text-devotional-gold group-hover:bg-devotional-gold/20 transition-colors">
        <MapPin size={20} className="animate-bounce" style={{ animationDuration: '3s' }} />
      </div>
      <div className="text-left">
        <div className="text-xs text-devotional-goldLight font-medium tracking-wide uppercase">Manufacturer Workshop</div>
        <div className="text-sm font-semibold flex items-center gap-1.5">
          G.Kamal Ganesha Works Location
          <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    </a>
  );
};

export default MapLocationLink;
