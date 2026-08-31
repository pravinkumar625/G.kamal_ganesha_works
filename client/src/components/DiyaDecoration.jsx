import React from 'react';

const DiyaDecoration = ({ className = "w-10 h-10" }) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Clay base of the diya */}
        <path
          d="M6 34C6 34 8 46 32 46C56 46 58 34 58 34C58 34 52 40 32 40C12 40 6 34 6 34Z"
          fill="#8B5A2B"
          stroke="#5C3A21"
          strokeWidth="1.5"
        />
        <path
          d="M2 30C2 30 10 46 32 46C54 46 62 30 62 30C62 30 50 36 32 36C14 36 2 30 2 30Z"
          fill="#A0522D"
          stroke="#5C3A21"
          strokeWidth="1.5"
        />
        {/* Inside/Rim decoration */}
        <path
          d="M10 32C18 34 46 34 54 32"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Dynamic flickering flame */}
        <g className="animate-flicker origin-bottom" style={{ transformOrigin: '32px 30px' }}>
          {/* Flame outer glow */}
          <path
            d="M32 4C32 4 41 18 36 26C33 30 31 30 28 26C23 18 32 4 32 4Z"
            fill="#FF8C00"
            opacity="0.6"
            className="blur-[0.5px]"
          />
          {/* Flame inner bright core */}
          <path
            d="M32 8C32 8 38 18 35 24C33 27 31 27 29 24C26 18 32 8 32 8Z"
            fill="#FFD700"
          />
          {/* Flame white/blue base */}
          <ellipse cx="32" cy="25" rx="2.5" ry="3.5" fill="#FFFFFF" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
};

export default DiyaDecoration;
