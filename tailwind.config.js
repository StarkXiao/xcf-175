/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cyber: {
          dark: '#0a0a0f',
          darker: '#05050a',
          pink: '#ff0080',
          cyan: '#00ffff',
          purple: '#a855f7',
          yellow: '#ffdd00',
          green: '#00ff88',
          red: '#ff4444',
        }
      },
      fontFamily: {
        cyber: ['"Orbitron"', '"Rajdhani"', 'sans-serif'],
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': {
            textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor',
          boxShadow: '0 0 5px currentColor, 0 0 10px currentColor',
        },
          '50%': {
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor',
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor',
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow': {
          '0%': { filter: 'brightness(1)' },
          '100%': { filter: 'brightness(1.3)' },
        },
      },
    },
  },
  plugins: [],
};
