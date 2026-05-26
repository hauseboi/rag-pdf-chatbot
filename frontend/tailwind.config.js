/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pearl:          '#f5f4ff',
        'cyber-violet': '#9b2ff7',
        'cyber-pink':   '#e8739c',
        'cyber-mint':   '#00cda8',
        'cyber-blue':   '#3db9e8',
        'cyber-dim':    '#4a4060',
        'cyber-dark':   '#16102a',
        'cyber-border': '#ede9f8',
      },
      fontFamily: {
        display: ['Oxanium', 'monospace'],
        body:    ['Outfit', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-violet': '0 0 0 1px rgba(155,47,247,0.2), 0 0 28px rgba(155,47,247,0.12)',
        'glow-pink':   '0 0 0 1px rgba(232,115,156,0.25), 0 0 28px rgba(232,115,156,0.13)',
        'glow-mint':   '0 0 0 1px rgba(0,205,168,0.25), 0 0 28px rgba(0,205,168,0.12)',
        'card':        '0 2px 12px rgba(22,16,42,0.06), 0 1px 3px rgba(22,16,42,0.04)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'spin-slow':  'spin 1.2s linear infinite',
        'fade-up':    'fadeUp 0.35s ease-out',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}