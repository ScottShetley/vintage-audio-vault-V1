// C:/Users/david/Desktop/projects/vintageaudiovault/client/vite.config.js
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig ({
  plugins: [react ()],
  server: {
    proxy: {
      // When a request is made to /api/* from the frontend,
      // Vite's dev server will forward it to http://localhost:5000
      // For example, a frontend request to /api/items/analyze-wild-find
      // will be proxied to http://localhost:5000/api/items/analyze-wild-find
      '/api': {
        target: 'http://localhost:5000', // Your backend server address
        changeOrigin: true, // Recommended for virtual hosted sites and to avoid CORS issues in dev
        // secure: false, // Set to false if your backend is HTTP (not HTTPS). Usually true by default.
        // For localhost development with an HTTP backend, this might not be strictly necessary
        // but can be useful if you encounter SSL-related proxy errors.

        // Optional: rewrite path if your backend API routes don't include the /api prefix
        // For instance, if your backend expects /items/analyze-wild-find instead of /api/items/analyze-wild-find
        // you would uncomment and adjust the following:
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
