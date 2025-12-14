
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Create a definition object for Vite's `define` config
  const processEnv: { [key: string]: string } = {};
  
  // We strictly define which variables are allowed to leak to the client bundle.
  // Note: CF_ACCOUNT_ID etc are removed as we now use Server-Side Functions (Bindings) for Cloudflare.
  const allowedKeys = [
    'API_KEY', 
    'ADMIN_PASSWORD', 
    'KV_REST_API_URL',   // Required for Vercel KV / Hybrid Mode
    'KV_REST_API_TOKEN', // Required for Vercel KV / Hybrid Mode
    'CUSTOM_API_KEY_1',
    'CUSTOM_API_KEY_2',
    'CUSTOM_API_KEY_3',
    'CUSTOM_API_KEY_4',
    'CUSTOM_API_KEY_5'
  ];

  for (const key in env) {
    if (key.startsWith('VITE_') || allowedKeys.includes(key)) {
      processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve((process as any).cwd(), './'),
      },
    },
    define: processEnv,
  };
});
