/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      spacing: {
        4.5: "1.125rem",
      },
      colors: {
        "ig-purple": "#833AB4",
        "ig-blue": "#405DE6",
        "ig-pink": "#FD1D1D",
        "ig-yellow": "#FCAF45",
        facebook: "#1877F2",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        display: ["Sora", "Manrope", "system-ui", "sans-serif"],
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "water-flow": "water-flow 3s linear infinite",
        fadeIn: "fadeIn 0.6s ease-out forwards",
        "fade-in-0": "fadeIn 0.3s ease-out",
        "slide-in-from-top-2": "slideInFromTop 0.3s ease-out",
        "slide-in-from-right-4": "slideInFromRight 0.3s ease-out",
        "spin-slow": "spin 1.4s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "water-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInFromTop: {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInFromRight: {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
