import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrivacyDocument } from './src/privacy/PrivacyDocument';
import { privacyCopies } from './src/privacy/content';
import { privacyConfig } from './src/privacy/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    proxy: { '/api': loadEnv(mode, '.', 'REMORY_').REMORY_API_TARGET ?? 'http://127.0.0.1:8080' },
  },
  build: { rollupOptions: { input: ['index.html', 'account-deletion/index.html', 'password-reset/index.html', 'privacy/index.html'] } },
  plugins: [
    {
      name: 'remory-public-privacy',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replace('<!--privacy-content-->', renderToStaticMarkup(
          createElement(PrivacyDocument, { copy: privacyCopies.ko, config: privacyConfig }),
        )),
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { navigateFallbackDenylist: [/^\/(?:account-deletion|password-reset|privacy)(?:\/|$)/] },
      includeAssets: ['mascot.svg', 'garden.svg', 'icon.svg', 'templates/**/*.xlsx'],
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
}));
