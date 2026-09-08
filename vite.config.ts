import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        index: 'index.html',
        editor: 'editor.html',
        'rich-blocks': 'rich-blocks.html',
        about: 'about.html',
      },
    },
  },
});
