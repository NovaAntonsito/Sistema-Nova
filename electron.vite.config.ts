import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  /* ----------  MAIN PROCESS  ---------- */
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['csv-parse']
      }
    }
  },

  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: []
      }
    }
  },
  renderer: {
    resolve: {
      alias: { '@renderer': resolve('src/renderer/src') }
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['csv-parse']
    },
    build: {
      rollupOptions: {
        external: ['csv-parse']
      }
    }
  }
})
