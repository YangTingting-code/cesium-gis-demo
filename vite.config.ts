import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/tianditu': {
        target: 'http://t4.tianditu.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/tianditu/, '')
      }
    }
  },
  define: {
    // 关键：取消 Vite 默认的 ImageData freeze
    __VUE_PROD_DEVTOOLS__: 'false'
  },
  optimizeDeps: {
    // 强制预构建 heatmap.js，避免缓存旧包
    include: ['heatmap.js']
  }
})
