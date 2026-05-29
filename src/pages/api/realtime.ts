// POST /api/realtime — relay/broker for the low-latency realtime voice loop.
//
// Mints a SHORT-LIVED ephemeral session token from OpenAI's Realtime API so
// the browser can open a WebRTC session directly without ever seeing the
// standing provider key. The standing key stays server-side (AGENTS.md hard
// rule #1); only the ephemeral, expiring client secret is returned.
//
// Phase status: this token-minting broker is implemented; wiring the browser
// WebRTC client to consume it is a Phase 1 follow-up (see PRD §11).

export const prerender = false;

import type { APIRoute } from "astro";
import { resolveOpenAIKeyForStt } from "../../lib/ai/keys";

const REALTIME_SESSIONS_URL = "https://api.openai.com/v1/realtime/sessions";
const DEFAULT_REALTIME_MODEL = "gpt-4o-realtime-preview";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = resolveOpenAIKeyForStt(request);
  if (!apiKey) {
    return jsonError(
      "Realtime voice needs an OpenAI key. Add one in Settings.",
      401,
    );
  }

  let body: { model?: string; voice?: string } = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    // Empty/invalid body is fine; fall back to defaults.
  }

  try {
    const upstream = await fetch(REALTIME_SESSIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: body.model ?? DEFAULT_REALTIME_MODEL,
        voice: body.voice ?? "alloy",
      }),
    });

    if (!upstream.ok) {
      // Do not forward the raw upstream body (may include sensitive detail).
      return jsonError(
        `Realtime session request failed (${upstream.status}).`,
        502,
      );
    }

    const session = await upstream.json();
    // Return only what the browser needs to start a WebRTC session: the
    // ephemeral client secret and session metadata. The standing key never
    // leaves the server.
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Realtime broker error.";
    return jsonError(`Realtime session failed: ${message}`, 502);
  }
};
