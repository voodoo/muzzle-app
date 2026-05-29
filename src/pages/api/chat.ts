// POST /api/chat — streams an LLM response via the Vercel AI SDK (BYOK).
//
// The provider key never reaches the client bundle: it travels per-request
// from the user's device in a header, is used here, and is never logged or
// persisted (AGENTS.md hard rules). The response is a plain text stream that
// the Conversation island reads incrementally.

export const prerender = false;

import type { APIRoute } from "astro";
import { streamText } from "ai";
import { getLanguageModel, isProviderId, DEFAULT_MODELS } from "../../lib/ai/providers";
import { resolveChatCredentials } from "../../lib/ai/keys";

const SYSTEM_PROMPT = [
  "You are the assistant inside Muzzle, an app people use to talk to AI in",
  "public by whispering. Input may come from quiet/whispered speech that was",
  "transcribed, so it can be slightly garbled — infer intent charitably.",
  "Keep replies concise and easy to listen to, since they may be read aloud",
  "privately through earbuds.",
].join(" ");

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const { messages, provider, model } = (body ?? {}) as {
    messages?: Array<{ role?: string; content?: unknown }>;
    provider?: unknown;
    model?: unknown;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError("`messages` must be a non-empty array.", 400);
  }
  if (!isProviderId(provider)) {
    return jsonError("`provider` must be 'openai' or 'anthropic'.", 400);
  }

  const resolvedModel =
    typeof model === "string" && model.length > 0
      ? model
      : DEFAULT_MODELS[provider];

  const cred = resolveChatCredentials(request, provider, resolvedModel);
  if (!cred) {
    return jsonError(
      "No API key available. Add your provider key in Settings.",
      401,
    );
  }

  const modelMessages = messages
    .filter((m) => m && typeof m.content === "string")
    .map((m) => ({
      role: (m.role === "assistant" || m.role === "system"
        ? m.role
        : "user") as "user" | "assistant" | "system",
      content: String(m.content),
    }));

  try {
    const result = streamText({
      model: getLanguageModel(cred),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
    });
    // Plain text stream — robust across AI SDK versions and trivial to read on
    // the client without coupling to the UI-message wire protocol.
    return result.toTextStreamResponse();
  } catch (err) {
    // Redact: never echo the key or raw provider payloads.
    const message =
      err instanceof Error ? err.message : "Upstream provider error.";
    return jsonError(`Chat request failed: ${message}`, 502);
  }
};
