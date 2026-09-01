/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          maroon: '#4a0e17',
          maroonDark: '#2b0308',
          orange: '#ff6a00',
          gold: '#ffd700',
          goldLight: '#ffe066',
          textLight: '#f7f9fa',
          textGold: '#ffebc2',
          textMuted: '#b3999c',
        },
        devotional: {
          maroon: '#4a0e17',
          maroonDark: '#2b0308',
          orange: '#ff6a00',
          marigold: '#f5b041',
          gold: '#ffd700',
          goldLight: '#ffebc2',
          cream: '#200104',
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin-slow 50s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'flicker': 'flicker 1.5s ease-in-out infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.85 },
          '50%': { transform: 'scale(1.12) rotate(-1deg)', opacity: 1, filter: 'drop-shadow(0 0 10px rgba(255, 106, 0, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
