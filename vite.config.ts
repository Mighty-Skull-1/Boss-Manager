import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Custom plugin to support Vite dev mode while keeping root index.html production-ready for GitHub Pages
function devHtmlPlugin() {
  return {
    name: 'dev-html',
    transformIndexHtml(html: string, ctx: { server?: unknown }) {
      if (ctx.server) {
        return html
          .replace(
            /<script type="module" crossorigin src="\.\/assets\/index\.js"><\/script>/,
            '<script type="module" src="/src/main.tsx"></script>'
          )
          .replace(
            /<link rel="stylesheet" crossorigin href="\.\/assets\/index\.css">/,
            ''
          );
      }
      return html;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    devHtmlPlugin(),
    tailwindcss(),
    react()
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
