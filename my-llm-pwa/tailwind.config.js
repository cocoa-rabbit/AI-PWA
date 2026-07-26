/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pinktheme: {
          50: '#fff0f5',
          100: '#ffe4e1',
          200: '#ffc0cb',
          500: '#ff69b4',
          600: '#ff1493',
          900: '#8b008b',
        }
      }
    },
  },
  plugins: [],
}
