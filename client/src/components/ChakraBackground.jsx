import React from 'react';

const ChakraBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
      {/* Slow spinning chakra mandala */}
      <svg
        className="w-[85vmax] h-[85vmax] text-devotional-maroon opacity-[0.035] animate-spin-slow"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer ring */}
        <circle cx="100" cy="100" r="95" strokeDasharray="3 3" />
        <circle cx="100" cy="100" r="90" />
        
        {/* Scalloped outer edge */}
        {[...Array(36)].map((_, i) => {
          const angle = (i * 10 * Math.PI) / 180;
          const x = 100 + 90 * Math.cos(angle);
          const y = 100 + 90 * Math.sin(angle);
          return (
            <circle key={`scallop-${i}`} cx={x} cy={y} r="2.5" fill="currentColor" opacity="0.7" />
          );
        })}

        {/* Inner concentric rings */}
        <circle cx="100" cy="100" r="70" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="50" strokeWidth="0.5" strokeDasharray="6 3" />
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="10" fill="currentColor" opacity="0.1" />

        {/* Sunbeams / Spokes of the Chakra */}
        {[...Array(24)].map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180;
          const x1 = 100 + 10 * Math.cos(angle);
          const y1 = 100 + 10 * Math.sin(angle);
          const x2 = 100 + 90 * Math.cos(angle);
          const y2 = 100 + 90 * Math.sin(angle);
          return (
            <line key={`spoke-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.4" />
          );
        })}

        {/* Decorative central petals */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const rx = 100 + 20 * Math.cos(angle);
          const ry = 100 + 20 * Math.sin(angle);
          return (
            <circle key={`petal-${i}`} cx={rx} cy={ry} r="4" strokeWidth="0.3" />
          );
        })}
      </svg>
    </div>
  );
};

export default ChakraBackground;
