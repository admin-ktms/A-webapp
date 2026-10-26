/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#080A0F",
        panel: "#11151D",
        surface: "#1A2230",
        border: "#2A3342",
        text: "#F5F7FA",
        muted: "#A5AFBF",
        cyan: "#00D9FF",
        gold: "#FFC857",
        green: "#42D392",
        coral: "#FF6B75"
      }
    }
  },
  plugins: []
};
