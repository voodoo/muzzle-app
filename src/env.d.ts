/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /**
   * Optional server-side fallback key for the built-in metered option.
   * NEVER expose provider keys via `PUBLIC_*` — these stay server-only.
   */
  readonly OPENAI_API_KEY?: string;
  readonly ANTHROPIC_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
