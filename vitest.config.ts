import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/safety/**/*.ts', 'lib/plan/**/*.ts', 'lib/nutrition/**/*.ts'],
      thresholds: {
        'lib/safety/**/*.ts': { statements: 100, branches: 95, functions: 100, lines: 100 },
      },
    },
  },
})
