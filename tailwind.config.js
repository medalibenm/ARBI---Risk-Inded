/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAFAFA',
        ink: '#1A1A1A',
        muted: '#79695A',
        divider: '#E1DCD3',
        card: '#F2F1EE',
        predict: '#E7C596',
        predictDark: '#D9AE6E',
        primary: '#C96442',
        risk: '#D5372E',
        signal: {
          pink: '#F9D9D6',
          pinkIcon: '#D5372E',
          peach: '#F3E1C4',
          peachIcon: '#C9791F',
          blue: '#DCE3F0',
          blueIcon: '#33507A',
          green: '#DCEBDD',
          greenIcon: '#3E7A4D',
          purple: '#E6DEF2',
          purpleIcon: '#6B4FA0',
        },
      },
      fontFamily: {
        sans: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 20px 45px -16px rgba(26, 26, 26, 0.28), 0 4px 14px rgba(26, 26, 26, 0.09)',
      },
    },
  },
  plugins: [],
}
