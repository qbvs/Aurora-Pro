
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // This will load .env, .env.local, .env.[mode], .env.[mode].local
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Vite's loadEnv automatically handles merging from process.env, 
  // so we don't need to manually merge anymore.
  // We just need to ensure the variables we use are exposed correctly.
  
  // Vite automatically exposes variables prefixed with VITE_ to `import.meta.env`
  // We can still define `process.env` for compatibility if needed, but it's better
  // to migrate the code to use `import.meta.env`. For now, we'll define them to minimize changes.
  
  // Create a definition object for Vite's `define` config
  const processEnv: { [key: string]: string } = {};
  
  // We iterate over the loaded env variables and create definitions
  // for those we want to expose under `process.env`.
  // It's crucial to prefix them with VITE_ in your .env file or Vercel dashboard.
  for (const key in env) {
    if (key.startsWith('VITE_') || ['API_KEY', 'ADMIN_PASSWORD', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'CF_ACCOUNT_ID', 'CF_NAMESPACE_ID', 'CF_API_TOKEN'].includes(key)) {
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
    // The `define` option will perform a direct string replacement during build.
    define: processEnv,
  };
});
