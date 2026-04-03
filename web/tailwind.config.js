/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        team: {
          red:     '#f60300',
          black:   '#1c1c1c',
          green:   '#00c000',
          purple:  '#b61bdb',
          surface: '#222222',
          elevated:'#282828',
          border:  '#333333',
          muted:   '#555555',
          sub:     '#999999',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

