import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // All test files share one Neon DB — run them sequentially to prevent
    // one file's cleanup from nuking another file's data mid-test.
    fileParallelism: false,
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
