import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['read-logo-192.png', 'read-logo-512.png', 'read-logo-192.svg', 'read-logo-512.svg'],
      manifest: {
        name: 'Read Me A Story',
        short_name: 'MeAStory',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        orientation: 'any',
        icons: [
          { src: '/read-logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/read-logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/read-logo-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/read-logo-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ],
        shortcuts: [
          { name: 'Start Story Session', short_name: 'Start', url: '/start', icons: [{ src: '/read-logo-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Join by Code', short_name: 'Join', url: '/join', icons: [{ src: '/read-logo-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Invite Page', short_name: 'Invite', url: '/invite/ABC123', icons: [{ src: '/read-logo-192.png', sizes: '192x192', type: 'image/png' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'html-cache' }
          },
          {
            urlPattern: ({ request }: { request: Request }) => ['style', 'script', 'worker'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'asset-cache' }
          },
          {
            urlPattern: ({ request }: { request: Request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'image-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ],
  publicDir: 'public'
})
