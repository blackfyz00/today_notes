import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import copy from 'rollup-plugin-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    copy({
      targets: [
        { src: 'src/locales/*.json', dest: 'dist/locales' }
      ],
      hook: 'writeBundle'
    })
  ],
  envDir: './backend',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
    
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',  // ← ваш бэкенд
        changeOrigin: true,
        secure: false,
        // Опционально: переписать путь, если нужно
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
