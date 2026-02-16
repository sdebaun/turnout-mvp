/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true, // Allow imports from outside app directory (../../lib)
  },
}

module.exports = nextConfig
