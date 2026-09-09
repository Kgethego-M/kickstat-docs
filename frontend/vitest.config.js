// AI assistance: drafted with Claude (Sonnet 5) via claude.ai; reviewed and tested by the project team.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:5001'),
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify('pk_test_mock'),
  },
})
