/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D0C13',
          card: '#110D10',
          'card-alt': '#1B151A',
          elevated: '#222222',
        },
        border: {
          card: '#3D2C2A',
          'card-alt': '#856966',
          subtle: 'rgba(255, 255, 255, 0.15)',
        },
        accent: {
          blue: '#007AFF',
          green: '#34C759',
          red: '#FF453A',
          orange: '#FF9F0A',
        },
        perf: {
          positive: '#BED26F',
          negative: '#E8845C',
        },
        asset: {
          equity: '#6B9BF2',
          crypto: '#9B8FD4',
          'real-estate': '#D4956A',
          'fixed-income': '#5BBAB3',
          commodity: '#C9B458',
          sector: '#6DC47E',
          defensive: '#C97B8B',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#555555',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        'card-lg': '24px',
      },
    },
  },
  plugins: [],
}
