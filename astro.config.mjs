import { defineConfig } from 'astro/config';

// Deployed to GitHub Pages at the apex custom domain (public/CNAME =
// giaccioproperties.com). Served from the domain root, so base is '/'.
export default defineConfig({
  site: 'https://giaccioproperties.com',
  base: '/',
  trailingSlash: 'ignore',
});
