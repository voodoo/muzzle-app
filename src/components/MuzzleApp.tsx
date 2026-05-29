// Muzzle interactive surface — a single client-only island.
//
// The whole surface touches AudioContext / getUserMedia, so per tech-stack §2
// it is hydrated with client:only="react" rather than splitting into several
// SSR'd islands. It composes the talk control, conversation, masking controls,
// and settings, and owns the orchestration between the audio engine, the STT
// endpoint, and the chat endpoint.

import { useCallback, useState } from "react";
import Conversation from "./Conversation";
import TalkButton from "./TalkButton";
import MaskingControls from "./MaskingControls";
import Settings from "./Settings";
import { useChat } from "../lib/react/useChat";
import { useVoiceCapture } from "../lib/react/useVoiceCapture";
import { usePrivacyVeil } from "../lib/react/usePrivacyVeil";
import { useSettings } from "../lib/react/useSettings";

export default function MuzzleApp() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = useSettings();
  const chat = useChat();
  const veil = usePrivacyVeil();

  const capture = useVoiceCapture({
    onTranscript: (text) => void chat.send(text),
    onSpeakingChange: (speaking) => veil.setSpeaking(speaking),
  });

  const handleMaskingToggle = useCallback(
    async (next: boolean) => {
      settings.setVeilEnabled(next);
      if (next) await veil.enable(settings.veilIntensity);
      else await veil.disable();
    },
    [settings, veil],
  );

  const handleIntensity = useCallback(
    (value: number) => {
      settings.setVeilIntensity(value);
      veil.setIntensity(value);
    },
    [settings, veil],
  );

  const handleToggleHandsFree = useCallback(() => {
    if (capture.handsFreeActive) void capture.stopHandsFree();
    else void capture.startHandsFree();
  }, [capture]);

  const talkDisabled = !settings.canTranscribe;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100">
            Muzzle
          </h1>
          <p className="text-[11px] text-slate-500">
            Talk to your A.I., not your neighbor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="rounded-full border border-veil-edge bg-veil-panel p-2 text-slate-300 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-veil-accent"
        >
          <GearGlyph />
        </button>
      </header>

      <Conversation
        messages={chat.messages}
        busy={chat.busy}
        error={chat.error ?? capture.error}
        onSend={(text) => void chat.send(text)}
        onClear={chat.clear}
      />

      <footer className="flex flex-col gap-3 border-t border-veil-edge bg-veil-bg/80 px-4 py-4">
        <MaskingControls
          enabled={veil.running}
          intensity={settings.veilIntensity}
          running={veil.running}
          starting={veil.starting}
          error={veil.error}
          privateOutput={veil.privateOutput}
          onToggle={(next) => void handleMaskingToggle(next)}
          onIntensity={handleIntensity}
        />

        <TalkButton
          mode={settings.talkMode}
          state={capture.state}
          level={capture.level}
          handsFreeActive={capture.handsFreeActive}
          disabled={talkDisabled}
          onPttStart={() => void capture.pttStart()}
          onPttStop={() => void capture.pttStop()}
          onToggleHandsFree={handleToggleHandsFree}
        />

        {talkDisabled && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-center text-xs text-veil-accent underline-offset-2 hover:underline"
          >
            Add an API key in Settings to start whispering →
          </button>
        )}
      </footer>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function GearGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
