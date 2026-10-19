import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Components fall back to http://localhost:5000 when VITE_API_URL is missing,
  // which must never ship in a production build. An empty value means same-origin.
  if (command === 'build' && mode === 'production' && env.VITE_API_URL === undefined) {
    throw new Error('VITE_API_URL must be set for production builds (e.g. https://academy.example.com).')
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
