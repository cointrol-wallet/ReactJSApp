/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#effcf6",
          100: "#d9f7e9",
          200: "#b4efcf",
          300: "#86e4b2",
          400: "#4fd690",
          500: "#10b981",   // emerald vibe
          600: "#0ea371",
          700: "#0c865e",
          800: "#0a6a4c",
          900: "#064036",
        },
      },
    },
  },
  plugins: [],
}

