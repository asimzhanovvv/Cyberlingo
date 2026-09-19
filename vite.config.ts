import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  // 5173 занят service worker'ом другого проекта, который перехватывает запросы
  server: { host: true, port: 5180, strictPort: true },
  preview: { port: 5181, strictPort: true },
})
