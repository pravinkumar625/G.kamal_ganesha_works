/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        devotional: {
          maroon: '#6B1F1F',
          maroonDark: '#451010',
          orange: '#E76F51',
          marigold: '#F4A261',
          gold: '#D4AF37',
          goldLight: '#E8D490',
          cream: '#FFFDF6',
        }
      },
      animation: {
        'spin-slow': 'spin 120s linear infinite',
        'flicker': 'flicker 1.5s ease-in-out infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.8 },
          '50%': { transform: 'scale(1.15) rotate(-1deg)', opacity: 1, filter: 'drop-shadow(0 0 8px rgba(244, 162, 97, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
