/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: '#3D6B52',
        cream: '#FAF4E8',
        amber: '#C8831A',
        skeleton: '#DDD8D0',
        charcoal: '#1E2420',
      },
      fontFamily: {
        heading: ['var(--font-zilla-slab)', 'serif'],
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
