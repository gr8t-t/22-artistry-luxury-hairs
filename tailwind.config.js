/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#E4156B',
          dark: '#9C0050',
          light: '#FF6BA8',
          blush: '#FFF0F7',
          black: '#080005',
          card: '#120009',
          border: '#2A0818',
          wine: '#3D0023',
        },
      },
      fontFamily: {
        cormorant: ['"Cormorant Garant"', 'Georgia', 'serif'],
        playfair: ['"Cormorant Garant"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        poppins: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '-.03em',
        wide: '.18em',
        wider: '.28em',
      },
      animation: {
        'fade-up': 'fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in': 'fadeIn 0.6s ease forwards',
        'line-grow': 'lineGrow 1s ease forwards',
        'float': 'float 4s ease-in-out infinite',
        'pulse-pink': 'pulsePink 2.5s ease-in-out infinite',
        'slide-left': 'slideLeft 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(50px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        lineGrow: { '0%': { width: '0' }, '100%': { width: '100%' } },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulsePink: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(228,21,107,0.5)' },
          '50%': { boxShadow: '0 0 0 14px rgba(228,21,107,0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
