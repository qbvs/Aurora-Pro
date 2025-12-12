import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Explicitly define process.env variables with JSON.stringify
      // Core Variables
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.ADMIN_PASSWORD': JSON.stringify(env.ADMIN_PASSWORD || ''),
      'process.env.KV_REST_API_URL': JSON.stringify(env.KV_REST_API_URL || ''),
      'process.env.KV_REST_API_TOKEN': JSON.stringify(env.KV_REST_API_TOKEN || ''),
      
      // Reserved Slots for Custom Providers (Allows mapping in UI without rebuilding code for every new key)
      'process.env.CUSTOM_API_KEY_1': JSON.stringify(env.CUSTOM_API_KEY_1 || ''),
      'process.env.CUSTOM_API_KEY_2': JSON.stringify(env.CUSTOM_API_KEY_2 || ''),
      'process.env.CUSTOM_API_KEY_3': JSON.stringify(env.CUSTOM_API_KEY_3 || ''),
      'process.env.CUSTOM_API_KEY_4': JSON.stringify(env.CUSTOM_API_KEY_4 || ''),
      'process.env.CUSTOM_API_KEY_5': JSON.stringify(env.CUSTOM_API_KEY_5 || '')
    }
  };
});