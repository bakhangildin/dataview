/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  darkMode: "class",
  daisyui: {
    themes: [
      {
        forest: {
          ...require("daisyui/src/theming/themes")["[data-theme=forest]"],
          "base-100": "#1E1E1E",
          "base-200": "#333333",
          "base-content": "#DDDDDD",
          neutral: "#2C2D35",
          primary: "#2F81F7",
          "primary-focus": "#2F81F7",
          "primary-content": "#FFFFFF",
          info: "#333333",
          "info-content": "#428FDC",
          success: "#333333",
          "success-content": "#2DA160",
          warning: "#333333",
          "warning-content": "#FD7E14",
          error: "#333333",
          "error-content": "#F85149",
          "--btn-focus-scale": "0.95",
          "--rounded-btn": ".25rem",
        },
      },
    ],
    logs: false,
  },
};
