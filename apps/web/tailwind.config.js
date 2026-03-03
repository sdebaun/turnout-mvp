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
        terracotta: '#D95F3B',
        forest: '#243D30',
        offwhite: '#FAFAF7',
        warm: '#F0EDE8',
        muted: '#7A6E65',
        sand: '#B5ADA8',
        tiletext: '#6B6966',
        separator: '#E5E0D8',
      },
      fontFamily: {
        heading: ['var(--font-zilla-slab)', 'serif'],
        sans: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
        syne: ['var(--font-syne)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
