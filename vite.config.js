import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    build: { rollupOptions: { input: { main: resolve('index.html'), admin: resolve('admin.html') } } },
    plugins: [{ name: 'family-api-local', configureServer(server) {
      server.middlewares.use('/api/family', async (req, res) => {
        try {
          req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
          let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 16384) { res.statusCode = 413; res.end(); return; } }
          if (body) req.body = JSON.parse(body);
          res.status = code => { res.statusCode = code; return res; };
          res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
          const { default: handler } = await import('./api/family.js');
          await handler(req, res);
        } catch { res.statusCode = 500; res.end(JSON.stringify({ error: 'No se pudo completar la solicitud.' })); }
      });
    } }]
  };
});
