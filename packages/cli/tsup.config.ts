import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli/index.ts'],
  format: ['cjs'],
  outDir: 'dist/cli',
  external: ['better-sqlite3'],
  noExternal: ['@openply/core'],
})
