// React hook: built-in chat backed by POST /api/chat (BYOK streaming).
//
// Reads the user's device-local BYOK settings and sends them per-request as
// headers. The response is a plain text stream we append incrementally.

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "../../types";
import { $chatProvider, $chatModel, $chatKey } from "../state/store";

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface UseChatResult {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  /** Append a user message and stream the assistant reply. */
  send: (text: string) => Promise<void>;
  clear: () => void;
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  // Mirror of `busy` so `send` can guard re-entry without dependency churn.
  const busyRef = useRef(false);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;

    setError(null);
    const provider = $chatProvider.get();
    const model = $chatModel.get();
    const key = $chatKey.get();

    if (!key) {
      setError("Add your provider API key in Settings to chat.");
      return;
    }

    const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
    const assistantId = uid();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    };

    const history = [...messagesRef.current, userMsg];
    setMessages([...history, assistantMsg]);
    setBusy(true);
    busyRef.current = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-provider": provider,
          "x-provider-key": key,
        },
        body: JSON.stringify({
          provider,
          model,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const detail = await res
          .json()
          .then((d: { error?: string }) => d.error)
          .catch(() => null);
        throw new Error(detail || `Request failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: acc } : m,
          ),
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, pending: false } : m,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      setError(message);
      // Drop the empty pending assistant bubble on failure.
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }, []);

  return { messages, busy, error, send, clear };
}
