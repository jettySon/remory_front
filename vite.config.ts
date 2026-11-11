import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mascot.svg', 'garden.svg', 'icon.svg'],
      manifest: {
        name: 'Remory — 기억이 피어나는 곳',
        short_name: 'Remory',
        description: '조금씩, 오래 기억하는 나만의 학습 정원',
        theme_color: '#fffafc',
        background_color: '#fffafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ]
});
