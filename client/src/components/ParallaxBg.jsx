import React, { useEffect, useState } from 'react';

const ParallaxBg = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      // Normalize mouse between -1 and 1
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Background Radial Glow */}
      <div 
        className="absolute w-[800px] h-[800px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-transform duration-700 ease-out"
        style={{
          background: 'radial-gradient(circle, #ff6a00 0%, #4a0e17 60%, transparent 80%)',
          top: '20%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${mousePos.x * 25}px, ${mousePos.y * 25}px)`
        }}
      />

      {/* Central Large Rotating Mandala */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(-50%, -50%) translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`
        }}
      >
        <svg
          className="w-[85vmax] h-[85vmax] text-[#ffd700] opacity-[0.06] animate-spin-slow"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="95" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="90" />
          {[...Array(36)].map((_, i) => {
            const angle = (i * 10 * Math.PI) / 180;
            const x = 100 + 90 * Math.cos(angle);
            const y = 100 + 90 * Math.sin(angle);
            return <circle key={`scallop-${i}`} cx={x} cy={y} r="2.5" fill="currentColor" opacity="0.6" />;
          })}
          <circle cx="100" cy="100" r="70" strokeWidth="0.4" />
          <circle cx="100" cy="100" r="50" strokeWidth="0.5" strokeDasharray="6 3" />
          <circle cx="100" cy="100" r="30" />
          <circle cx="100" cy="100" r="10" fill="currentColor" opacity="0.2" />
          {[...Array(24)].map((_, i) => {
            const angle = (i * 15 * Math.PI) / 180;
            const x1 = 100 + 10 * Math.cos(angle);
            const y1 = 100 + 10 * Math.sin(angle);
            const x2 = 100 + 90 * Math.cos(angle);
            const y2 = 100 + 90 * Math.sin(angle);
            return <line key={`spoke-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.4" />;
          })}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const rx = 100 + 20 * Math.cos(angle);
            const ry = 100 + 20 * Math.sin(angle);
            return <circle key={`petal-${i}`} cx={rx} cy={ry} r="4" strokeWidth="0.3" />;
          })}
        </svg>
      </div>

      {/* Top Left Floating Mandala */}
      <div 
        className="absolute top-12 left-10 opacity-15 transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`
        }}
      >
        <svg className="w-48 h-48 text-[#ffd700] animate-spin-slow" viewBox="0 0 100 100" fill="none" stroke="currentColor">
          <circle cx="50" cy="50" r="45" strokeWidth="0.5" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="30" strokeWidth="0.5" />
          <polygon points="50,10 62,38 90,50 62,62 50,90 38,62 10,50 38,38" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Top Right Floating Diya Glow */}
      <div 
        className="absolute top-20 right-16 opacity-20 transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * -25}px, ${mousePos.y * 25}px)`
        }}
      >
        <svg className="w-32 h-32 animate-float" viewBox="0 0 100 100" fill="none">
          <path d="M20,65 Q50,90 80,65 Q50,75 20,65" fill="#ffd700" opacity="0.6" />
          <path d="M50,25 Q55,45 50,55 Q45,45 50,25" fill="#ff6a00" className="animate-flicker" />
        </svg>
      </div>

      {/* Bottom Left Floating Motifs */}
      <div 
        className="absolute bottom-20 left-16 opacity-15 transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`
        }}
      >
        <svg className="w-40 h-40 animate-float" viewBox="0 0 100 100" fill="none" stroke="#ffd700">
          <circle cx="50" cy="50" r="40" strokeWidth="0.5" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="25" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="10" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Bottom Right Floating Star & Sparkles */}
      <div 
        className="absolute bottom-28 right-20 opacity-20 transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * 30}px, ${mousePos.y * -20}px)`
        }}
      >
        <svg className="w-28 h-28 text-[#ffd700] animate-pulse" viewBox="0 0 100 100" fill="currentColor">
          <polygon points="50,0 58,38 96,50 58,62 50,100 42,62 4,50 42,38" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
};

export default ParallaxBg;
