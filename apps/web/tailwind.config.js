/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        sand: {
          50:  '#fdf8f0',
          100: '#f9edd8',
          200: '#f2d9ae',
          300: '#e8be7d',
          400: '#dc9f4b',
          500: '#d4863a',
          600: '#bc6a2e',
          700: '#9c5027',
          800: '#7e4026',
          900: '#673524',
        },
        rihla: {
          primary:   '#1a1a2e',
          secondary: '#16213e',
          accent:    '#e2b97e',
          gold:      '#d4a853',
          text:      '#f0ece4',
          muted:     '#8b8374',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'slide-right': 'slideRight 0.3s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
