# AGENTS.md — Muzzle

Guidance for AI coding agents (and humans) working in this repo. Keep this file current; it is the source of truth for how we build Muzzle.

## What we're building

**Muzzle** — a web app that lets people talk to their AI without being overheard. _"Talk to your A.I., not your neighbor."_ You whisper; Muzzle enhances it into clear input for the AI (Whisper-Clear), and optionally emits an acoustic masking layer so bystanders can't make out your words (Privacy Veil). See [PRD.md](PRD.md) for product detail and [tech-stack.md](tech-stack.md) for the stack.

## Stack at a glance (do not drift from this)

- **Framework:** Astro (static-by-default + interactive islands). Deployed on **Vercel** via `@astrojs/vercel`.
- **Interactive islands:** React components hydrated with `client:*` directives. Audio-only components that have no SSR HTML use `client:only="react"`.
- **Audio capture/playback:** Browser **Web Audio API** (`AudioContext`, `AudioWorklet`), `getUserMedia`/`MediaRecorder` for the mic, and audio graph output for masking.
- **AI:** **Vercel AI SDK** (`ai` + provider packages) called from **Astro server endpoints** (`src/pages/api/*.ts`). BYOK key proxy, STT, and realtime relay live server-side.
- **Delivery:** Installable **PWA** (manifest + service worker via `@vite-pwa/astro`).

If a change would move us off this stack, stop and confirm with the user first.

## Repo conventions

- Language: **TypeScript** everywhere (`.astro`, `.ts`, `.tsx`). `strict` on.
- Pages/routes live in `src/pages/`. API routes are `.ts` files under `src/pages/api/` exporting `GET`/`POST` and returning a `Response`.
- UI islands live in `src/components/` (`.tsx` for React islands, `.astro` for static markup).
- Audio engine lives in `src/lib/audio/` (capture, VAD, denoise, masking) — keep it framework-agnostic so islands just call into it.
- AI/provider glue lives in `src/lib/ai/`. Never import provider SDKs into client code.
- Shared types in `src/types/`.

## Hard rules (security & privacy — load-bearing for this product)

1. **Secrets never reach the client.** Provider keys are read from env or per-user secure storage and used **only** inside `src/pages/api/*` endpoints. Never inline a key into an island or `import.meta.env.PUBLIC_*`.
2. **Do not log raw audio or raw API keys.** Redact.
3. **Minimize retention.** Relay audio/prompts; don't persist them server-side beyond the request unless the feature explicitly requires it and the user is informed.
4. **Be honest about masking.** Privacy Veil reduces intelligibility to bystanders; it is NOT encryption. Don't write copy or comments implying secrecy guarantees.
5. **Mic permission UX:** request `getUserMedia` only on explicit user action; handle denial gracefully.

## Astro specifics agents must remember

- Astro strips client JS by default. A component is static unless it has a `client:*` directive. Use `client:load` for the always-on talk button, `client:visible`/`client:idle` for secondary UI.
- `client:only="react"` is required for components that can't server-render (e.g. anything touching `AudioContext`/`navigator.mediaDevices` at module top level).
- Server endpoints require an adapter. We use `output: 'server'` with `@astrojs/vercel`; prerender static marketing pages with `export const prerender = true`.
- Endpoints return a `Response`; stream AI responses with a streamed `Response` body (AI SDK helpers).
- Browser-only APIs (`window`, `navigator`, `AudioContext`) must be guarded so they never execute during SSR.

## Build / run / verify

```bash
npm install
npm run dev        # astro dev (https needed for mic; see below)
npm run build      # astro build (Vercel adapter output)
npm run preview
```

- Mic capture requires a **secure context**. Use `https` locally (e.g. `astro dev --host` behind a tunnel, or Vite https) — `getUserMedia` is blocked on plain http except `localhost`.
- After UI changes, verify the talk → transcript → AI reply flow in a real browser with a mic.
- Run typecheck/lint before declaring done: `npm run astro check` and the linter.

## Definition of done for a feature

- Works in the browser end-to-end (mic → Whisper-Clear → AI → reply), not just compiles.
- No secrets in client bundles; no raw audio/keys logged.
- Types pass (`astro check`), linter clean.
- Honest, accessible UI (one-handed, screen-reader labels on controls).
- PRD/tech-stack docs updated if the change affects scope or stack.

## When unsure about Astro APIs

Consult the **Astro docs MCP** (`search_astro_docs`) for current, accurate APIs rather than guessing. For Vercel AI SDK / deployment, use the Vercel skills/MCP.
