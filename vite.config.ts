import { defineConfig } from 'vite';

// base: './' -> relative Pfade, damit das Build-Ergebnis überall funktioniert
// (GitHub Pages, Unterverzeichnis, file://)
export default defineConfig({
  base: './',
});
