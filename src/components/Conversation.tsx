// Built-in chat transcript + typed-input fallback. Pure presentational React.

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";

interface ConversationProps {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onClear: () => void;
}

export default function Conversation({
  messages,
  busy,
  error,
  onSend,
  onClear,
}: ConversationProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Conversation">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Conversation
        </h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-veil-accent"
          >
            Clear
          </button>
        )}
      </div>

      <ol
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.length === 0 && (
          <li className="m-auto max-w-sm text-center text-sm text-slate-500">
            Hold the talk button and whisper. Muzzle enhances your quiet speech
            into clear input for your AI.
          </li>
        )}
        {messages.map((m) => (
          <li
            key={m.id}
            className={
              m.role === "user"
                ? "self-end max-w-[85%]"
                : "self-start max-w-[85%]"
            }
          >
            <div
              className={
                "whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed " +
                (m.role === "user"
                  ? "bg-veil-accent-dim/20 text-slate-100"
                  : "bg-veil-panel text-slate-200")
              }
            >
              <span className="sr-only">
                {m.role === "user" ? "You said: " : "Assistant replied: "}
              </span>
              {m.content || (m.pending ? "…" : "")}
              {m.pending && (
                <span className="ml-1 inline-block animate-pulse" aria-hidden>
                  ▍
                </span>
              )}
            </div>
          </li>
        ))}
        <div ref={endRef} />
      </ol>

      {error && (
        <p
          role="alert"
          className="mx-4 mb-2 rounded-lg bg-veil-danger/15 px-3 py-2 text-xs text-veil-danger"
        >
          {error}
        </p>
      )}

      <form onSubmit={submit} className="flex gap-2 px-4 pb-3">
        <label htmlFor="chat-input" className="sr-only">
          Type a message
        </label>
        <input
          id="chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Or type a message…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-veil-edge bg-veil-panel px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-veil-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          className="rounded-full bg-veil-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-veil-accent"
        >
          Send
        </button>
      </form>
    </section>
  );
}
