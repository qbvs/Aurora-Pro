import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the application code
      'process.env': {
        API_KEY: env.API_KEY,
        ADMIN_PASSWORD: env.ADMIN_PASSWORD,
        KV_REST_API_URL: env.KV_REST_API_URL,
        KV_REST_API_TOKEN: env.KV_REST_API_TOKEN
      }
    }
  };
});