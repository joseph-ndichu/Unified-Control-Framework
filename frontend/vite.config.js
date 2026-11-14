import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Django backend runs on port 8000. Proxying keeps the browser on one origin,
// so session cookies and CSRF protection work without extra CORS setup.
const backend = process.env.UCF_BACKEND || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." means "src/...". shadcn components import this way.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: { '/api': backend, '/admin': backend, '/static': backend },
  },
})
