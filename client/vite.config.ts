import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path';

// vite.config.ts
import TerminalModule from 'vite-plugin-terminal'

const Terminal =
  (TerminalModule as typeof TerminalModule & { default?: typeof TerminalModule }).default ??
  TerminalModule

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Terminal({
      console: 'terminal'
    })
  ],
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, '../server/src'),
    },
  },
})
