
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const processEnv: { [key: string]: string } = {};
  
  const allowedKeys = [
    'API_KEY', 'ADMIN_PASSWORD', 
    'KV_REST_API_URL', 'KV_REST_API_TOKEN', 
    'CUSTOM_API_KEY_1', 'CUSTOM_API_KEY_2', 'CUSTOM_API_KEY_3', 'CUSTOM_API_KEY_4', 'CUSTOM_API_KEY_5'
  ];

  for (const key in env) {
    if (key.startsWith('VITE_') || allowedKeys.includes(key)) {
      processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Aurora Pro 导航',
          short_name: 'Aurora',
          description: 'AI 驱动的个人极客仪表盘',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
            // 缓存策略: 增强离线能力
            runtimeCaching: [
                // 1. 缓存 Lucide 图标 (CDN)
                {
                    urlPattern: /^https:\/\/unpkg\.com\/lucide-static/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'static-icons',
                        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
                    }
                },
                // 2. 缓存 ESM 模块 (核心依赖 React, ReactDOM 等)
                {
                    urlPattern: /^https:\/\/esm\.sh\//,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'esm-modules',
                        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 },
                        cacheableResponse: { statuses: [0, 200] }
                    }
                },
                // 3. 缓存 Tailwind CDN
                {
                    urlPattern: /^https:\/\/cdn\.tailwindcss\.com/,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'tailwind-cdn',
                        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                        cacheableResponse: { statuses: [0, 200] }
                    }
                },
                // 4. 缓存 Google Fonts
                {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'google-fonts-stylesheets',
                    }
                },
                {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'google-fonts-webfonts',
                        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    }
                }
            ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve((process as any).cwd(), './'),
      },
    },
    define: processEnv,
  };
});
