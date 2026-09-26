/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surveillance: {
          dark: '#0d1117',
          panel: '#161b22',
          border: '#30363d',
          accent: '#238636',
          danger: '#da3633',
          warning: '#d29922',
          cyan: '#38bdf8'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
