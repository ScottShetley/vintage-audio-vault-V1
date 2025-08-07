// C:/Users/david/Desktop/projects/vintageaudiovault/client/vite.config.js
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa'; // <-- IMPORT THE PWA PLUGIN

export default defineConfig ({
  // The server proxy remains unchanged
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  // We add the VitePWA plugin here
  plugins: [
    react (),
    VitePWA ({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Vintage Audio Vault',
        short_name: 'VAV',
        description: 'A personal inventory management system for vintage audio enthusiasts.',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        scope: '/',
        start_url: '/discover', // <-- THE FIX: Sets the correct starting page
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
