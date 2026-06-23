import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        // 添加 WebSocket 升级请求头处理
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        },
        // 禁用代理请求头，避免干扰 WebSocket 握手
        proxyTimeout: 60000,
        timeout: 60000
      }
    }
  }
})
