/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  // This ensures Tailwind's styles don't interfere with the main app
  corePlugins: {
    preflight: false,
  },
};
