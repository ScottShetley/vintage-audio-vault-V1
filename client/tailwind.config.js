// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // Scan all JS, TS, JSX, TSX files in src/
  ],
  theme: {
    extend: {
      colors: {
        'vav-background': '#1A1A1A',
        'vav-content-card': '#2C2C2C',
        'vav-text': '#E0E0E0',
        'vav-accent-primary': '#C2B280', // Muted, elegant gold
        'vav-accent-secondary': '#800020', // Deep burgundy
        'vav-text-secondary': '#B0B0B0', // Example: Medium gray for secondary text
      },
      fontFamily: {
        sans: ['Open Sans', 'Lato', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
