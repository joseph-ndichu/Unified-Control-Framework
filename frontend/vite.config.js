import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Django backend runs on port 8000. Proxying keeps the browser on one origin,
// so session cookies and CSRF protection work without extra CORS setup.
const backend = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': backend, '/admin': backend, '/static': backend },
  },
})
