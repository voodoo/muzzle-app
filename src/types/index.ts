// Shared types for Muzzle. Keep framework-agnostic.

export type ProviderId = "openai" | "anthropic";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Set while an assistant message is still streaming in. */
  pending?: boolean;
}

/**
 * BYOK credential held on the user's device. Never logged, never persisted
 * server-side. Sent per-request to the relay endpoints via header.
 */
export interface ProviderCredentials {
  provider: ProviderId;
  apiKey: string;
  /** Model id, e.g. "gpt-4o-mini" or "claude-3-5-haiku-latest". */
  model: string;
}

export type TalkMode = "push-to-talk" | "hands-free";

export type CaptureState =
  | "idle"
  | "requesting-permission"
  | "denied"
  | "listening"
  | "transcribing"
  | "error";

/** Request body for POST /api/chat. */
export interface ChatRequest {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  provider: ProviderId;
  model: string;
}

/** Request body for POST /api/realtime (mint an ephemeral session). */
export interface RealtimeSessionRequest {
  model?: string;
  voice?: string;
}
