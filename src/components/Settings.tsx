// Settings panel: BYOK provider/model/key + talk mode.
//
// Keys are stored on the user's device only (localStorage) and sent
// per-request to the relay endpoints. We say so plainly here.

import type { ProviderId, TalkMode } from "../types";
import { useSettings } from "../lib/react/useSettings";

interface SettingsProps {
  onClose: () => void;
}

const MODEL_HINTS: Record<ProviderId, string> = {
  openai: "e.g. gpt-4o-mini, gpt-4o",
  anthropic: "e.g. claude-3-5-haiku-latest, claude-3-5-sonnet-latest",
};

export default function Settings({ onClose }: SettingsProps) {
  const s = useSettings();

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-veil-edge bg-veil-bg p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-full p-2 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-veil-accent"
          >
            ✕
          </button>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Your AI provider (BYOK)
          </legend>

          <label htmlFor="provider" className="text-sm text-slate-300">
            Provider
          </label>
          <select
            id="provider"
            value={s.provider}
            onChange={(e) => s.setProvider(e.target.value as ProviderId)}
            className="mt-1 mb-3 w-full rounded-lg border border-veil-edge bg-veil-panel px-3 py-2 text-sm text-slate-100 focus:border-veil-accent focus:outline-none"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>

          <label htmlFor="model" className="text-sm text-slate-300">
            Model
          </label>
          <input
            id="model"
            type="text"
            value={s.model}
            onChange={(e) => s.setModel(e.target.value)}
            placeholder={MODEL_HINTS[s.provider]}
            autoComplete="off"
            className="mt-1 mb-3 w-full rounded-lg border border-veil-edge bg-veil-panel px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-veil-accent focus:outline-none"
          />

          <label htmlFor="api-key" className="text-sm text-slate-300">
            {s.provider === "openai" ? "OpenAI" : "Anthropic"} API key
          </label>
          <input
            id="api-key"
            type="password"
            value={s.apiKey}
            onChange={(e) => s.setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-veil-edge bg-veil-panel px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-veil-accent focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Stored only on this device; sent directly to your provider via the
            relay. Never logged or saved on our servers.
          </p>
        </fieldset>

        {s.provider !== "openai" && (
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Speech-to-text
            </legend>
            <label htmlFor="stt-key" className="text-sm text-slate-300">
              OpenAI key for transcription
            </label>
            <input
              id="stt-key"
              type="password"
              value={s.openAiSttKey}
              onChange={(e) => s.setOpenAiSttKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-veil-edge bg-veil-panel px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-veil-accent focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Whisper transcription is OpenAI-only, so quiet-speech capture needs
              an OpenAI key even when you chat with {s.provider}.
            </p>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Talk mode
          </legend>
          <div className="flex gap-2">
            {(["push-to-talk", "hands-free"] as TalkMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => s.setTalkMode(mode)}
                aria-pressed={s.talkMode === mode}
                className={
                  "flex-1 rounded-lg border px-3 py-2 text-sm capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-veil-accent " +
                  (s.talkMode === mode
                    ? "border-veil-accent bg-veil-accent/15 text-veil-accent"
                    : "border-veil-edge bg-veil-panel text-slate-300")
                }
              >
                {mode.replace("-", " ")}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
