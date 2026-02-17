import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.sst/**',
      'tests/e2e/**',
    ],
  },
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, './lib'),
    },
  },
})
