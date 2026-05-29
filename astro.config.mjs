// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import AstroPWA from "@vite-pwa/astro";
import tailwindcss from "@tailwindcss/vite";

// Muzzle runs as an on-demand-rendered Astro app on Vercel so that the
// BYOK relay endpoints in `src/pages/api/*` can execute server-side and keep
// provider keys off the client. Static marketing/legal pages opt back in with
// `export const prerender = true`.
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [
    react(),
    AstroPWA({
      registerType: "autoUpdate",
      // Cache only the static app shell. The live AI loop always needs the
      // network; we never try to serve cached audio or AI responses offline.
      workbox: {
        navigateFallback: "/",
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
      },
      manifest: {
        name: "Muzzle",
        short_name: "Muzzle",
        description: "Talk to your A.I., not your neighbor.",
        theme_color: "#0b0f17",
        background_color: "#0b0f17",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "utilities"],
        icons: [
          {
            src: "/icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        // Keep the SW out of the way during `astro dev`; enable to test installs.
        enabled: false,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
