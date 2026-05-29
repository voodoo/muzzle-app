// The primary "hold/tap to talk" control. One-handed, large hit target,
// screen-reader labelled (AGENTS.md: honest, accessible UI).

import { useCallback } from "react";
import type { CaptureState, TalkMode } from "../types";

interface TalkButtonProps {
  mode: TalkMode;
  state: CaptureState;
  level: number;
  handsFreeActive: boolean;
  disabled?: boolean;
  onPttStart: () => void;
  onPttStop: () => void;
  onToggleHandsFree: () => void;
}

function statusLabel(state: CaptureState, mode: TalkMode): string {
  switch (state) {
    case "requesting-permission":
      return "Requesting microphone…";
    case "denied":
      return "Microphone blocked";
    case "listening":
      return mode === "hands-free" ? "Listening (hands-free)" : "Listening…";
    case "transcribing":
      return "Transcribing…";
    case "error":
      return "Something went wrong";
    default:
      return mode === "hands-free"
        ? "Tap to start hands-free"
        : "Hold to talk";
  }
}

export default function TalkButton({
  mode,
  state,
  level,
  handsFreeActive,
  disabled,
  onPttStart,
  onPttStop,
  onToggleHandsFree,
}: TalkButtonProps) {
  const active = state === "listening" || state === "transcribing";

  // Pointer events cover mouse + touch + pen for push-to-talk.
  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "push-to-talk" || disabled) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      onPttStart();
    },
    [mode, disabled, onPttStart],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      if (mode !== "push-to-talk") return;
      e.preventDefault();
      onPttStop();
    },
    [mode, onPttStop],
  );

  const handleClick = useCallback(() => {
    if (mode === "hands-free" && !disabled) onToggleHandsFree();
  }, [mode, disabled, onToggleHandsFree]);

  // Scale the glow ring with the live input level.
  const ringScale = 1 + Math.min(0.6, level * 4);
  const isHotMic = active || handsFreeActive;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center">
        {isHotMic && (
          <span
            aria-hidden
            className="absolute h-24 w-24 rounded-full bg-veil-accent/30 transition-transform duration-75"
            style={{ transform: `scale(${ringScale})` }}
          />
        )}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={handleDown}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={mode === "push-to-talk" && active ? handleUp : undefined}
          onClick={handleClick}
          aria-pressed={isHotMic}
          aria-label={statusLabel(state, mode)}
          className={
            "relative grid h-24 w-24 touch-none select-none place-items-center rounded-full border-2 text-slate-900 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-veil-accent/60 disabled:opacity-40 " +
            (isHotMic
              ? "border-veil-accent bg-veil-accent"
              : "border-veil-edge bg-veil-panel text-veil-accent")
          }
        >
          <MicGlyph muted={state === "denied"} />
        </button>
      </div>
      <p
        className="text-center text-sm font-medium text-slate-300"
        role="status"
        aria-live="polite"
      >
        {statusLabel(state, mode)}
      </p>
    </div>
  );
}

function MicGlyph({ muted }: { muted: boolean }) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}
