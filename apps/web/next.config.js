/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true, // Allow imports from outside app directory (../../lib)
  },
  // TODO (prd0001): Add security headers before user input handling lands.
  // Once phone auth introduces user-facing forms, we need these to prevent
  // XSS and clickjacking on the OTP and RSVP flows.
  // headers: async () => [
  //   {
  //     source: '/:path*',
  //     headers: [
  //       { key: 'X-Frame-Options', value: 'DENY' },
  //       { key: 'X-Content-Type-Options', value: 'nosniff' },
  //       { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  //     ],
  //   },
  // ],
}

module.exports = nextConfig
