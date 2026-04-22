import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Cache Firebase & API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        id: '/',
        start_url: '/dashboard',
        name: 'Meal Manager - মেস ম্যানেজার',
        short_name: 'Meal Manager',
        description: 'আপনার মেসের সম্পূর্ণ ডিজিটাল ম্যানেজমেন্ট সিস্টেম। মিল, বাজার, বিল, এবং সদস্য তথ্য এক জায়গায় পরিচালনা করুন।',
        theme_color: '#4f46e5',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        lang: 'bn',
        categories: ['productivity', 'utilities', 'lifestyle'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: []
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('firebase/firestore')) return 'firebase-firestore';
          if (id.includes('firebase/auth')) return 'firebase-auth';
          if (id.includes('firebase/app')) return 'firebase-core';
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'react-core';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
})

