import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: 'src/background.js',
        contentScript: 'src/contentScript.jsx',
        app: 'index.html',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
