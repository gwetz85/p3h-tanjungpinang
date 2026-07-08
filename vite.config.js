import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vite 8/Rolldown requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Firebase — largest dep, separate chunk
            if (id.includes('firebase')) return 'firebase';
            // PDF/export — only needed on print
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'export-tools';
            // Animation & icons
            if (id.includes('framer-motion')) return 'framer-motion';
            if (id.includes('lucide-react')) return 'lucide';
            // Router
            if (id.includes('react-router')) return 'router';
            // Everything else from node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
