import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  appType: 'spa',
  plugins: [
    {
      name: 'rewrite-html',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // If the request is for an html file, not index.html, and not a fragment in /pages/
          if (req.url.endsWith('.html') && req.url !== '/index.html' && !req.url.startsWith('/pages/')) {
            req.url = '/index.html';
          }
          next();
        });
      }
    }
  ]
});
