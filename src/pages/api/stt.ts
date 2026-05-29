// POST /api/stt — speech-to-text for whispered audio (Whisper-class, OpenAI).
//
// Accepts a multipart form with an `audio` file (the boosted whisper capture
// from the browser). Transcribes via the Vercel AI SDK and returns the text.
// The audio is relayed for this single request and never persisted; we never
// log the raw audio or the key (AGENTS.md hard rules #2, #3).

export const prerender = false;

import type { APIRoute } from "astro";
import { experimental_transcribe as transcribe } from "ai";
import { getTranscriptionModel } from "../../lib/ai/providers";
import { resolveOpenAIKeyForStt } from "../../lib/ai/keys";

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
      "Speech-to-text needs an OpenAI key. Add one in Settings (Whisper is OpenAI-only).",
      401,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data with an `audio` file.", 400);
  }

  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Missing `audio` file.", 400);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await transcribe({
      model: getTranscriptionModel(apiKey),
      audio: bytes,
    });
    return new Response(JSON.stringify({ text: result.text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcription failed.";
    return jsonError(`Transcription failed: ${message}`, 502);
  }
};
