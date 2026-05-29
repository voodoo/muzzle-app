// React hook: orchestrates the Whisper-Clear capture pipeline.
//
// Wires together the framework-agnostic audio engine (requestMicrophone,
// WhisperCapture, VoiceActivityDetector) with push-to-talk and hands-free
// (VAD) modes, and posts captured audio to /api/stt for transcription.
//
// Mic permission is requested only inside the start handlers (user gesture),
// per AGENTS.md hard rule #5.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestMicrophone,
  WhisperCapture,
  VoiceActivityDetector,
  haptic,
  HAPTIC_START,
  HAPTIC_STOP,
} from "../audio";
import { effectiveOpenAiKey } from "../state/store";
import type { CaptureState } from "../../types";

export interface UseVoiceCaptureOptions {
  onTranscript: (text: string) => void;
  /** Fired when active speech capture starts/stops (drives Privacy Veil duck). */
  onSpeakingChange?: (speaking: boolean) => void;
}

export interface UseVoiceCaptureResult {
  state: CaptureState;
  level: number;
  error: string | null;
  /** Push-to-talk handlers. */
  pttStart: () => Promise<void>;
  pttStop: () => Promise<void>;
  /** Hands-free (VAD) toggle. */
  handsFreeActive: boolean;
  startHandsFree: () => Promise<void>;
  stopHandsFree: () => Promise<void>;
}

async function transcribe(blob: Blob): Promise<string> {
  if (blob.size === 0) return "";
  const key = effectiveOpenAiKey();
  const form = new FormData();
  form.append("audio", blob, "whisper.webm");
  const headers: Record<string, string> = {};
  if (key) headers["x-openai-key"] = key;

  const res = await fetch("/api/stt", { method: "POST", body: form, headers });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { error?: string }) => d.error)
      .catch(() => null);
    throw new Error(detail || `Transcription failed (${res.status}).`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

export function useVoiceCapture(
  options: UseVoiceCaptureOptions,
): UseVoiceCaptureResult {
  const { onTranscript, onSpeakingChange } = options;

  const [state, setState] = useState<CaptureState>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [handsFreeActive, setHandsFreeActive] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<WhisperCapture | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const recordingRef = useRef(false);
  // Keep latest callbacks without re-creating handlers.
  const cbRef = useRef({ onTranscript, onSpeakingChange });
  cbRef.current = { onTranscript, onSpeakingChange };

  const ensureCapture = useCallback(async (): Promise<WhisperCapture> => {
    if (captureRef.current) return captureRef.current;
    setState("requesting-permission");
    try {
      const stream = await requestMicrophone();
      streamRef.current = stream;
      const capture = new WhisperCapture(stream, {
        onLevel: (rms) => setLevel(rms),
      });
      captureRef.current = capture;
      return capture;
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "SecurityError");
      setState(denied ? "denied" : "error");
      setError(
        denied
          ? "Microphone access was denied. Enable it to talk."
          : err instanceof Error
            ? err.message
            : "Could not access the microphone.",
      );
      throw err;
    }
  }, []);

  const runTranscription = useCallback(async (blob: Blob) => {
    setState("transcribing");
    try {
      const text = await transcribe(blob);
      if (text) cbRef.current.onTranscript(text);
      setState(vadRef.current ? "listening" : "idle");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Transcription failed.");
    }
  }, []);

  const beginSegment = useCallback(() => {
    const capture = captureRef.current;
    if (!capture || recordingRef.current) return;
    recordingRef.current = true;
    capture.startRecording();
    cbRef.current.onSpeakingChange?.(true);
    haptic(HAPTIC_START);
  }, []);

  const endSegment = useCallback(async () => {
    const capture = captureRef.current;
    if (!capture || !recordingRef.current) return;
    recordingRef.current = false;
    cbRef.current.onSpeakingChange?.(false);
    haptic(HAPTIC_STOP);
    const blob = await capture.stopRecording();
    await runTranscription(blob);
  }, [runTranscription]);

  // --- Push-to-talk ---
  const pttStart = useCallback(async () => {
    setError(null);
    try {
      await ensureCapture();
      setState("listening");
      beginSegment();
    } catch {
      /* state already set by ensureCapture */
    }
  }, [ensureCapture, beginSegment]);

  const pttStop = useCallback(async () => {
    await endSegment();
  }, [endSegment]);

  // --- Hands-free (VAD) ---
  const startHandsFree = useCallback(async () => {
    setError(null);
    try {
      const capture = await ensureCapture();
      setState("listening");
      setHandsFreeActive(true);
      const vad = new VoiceActivityDetector(capture.getAnalyser(), {
        onSpeechStart: () => beginSegment(),
        onSpeechEnd: () => void endSegment(),
      });
      vadRef.current = vad;
      vad.start();
    } catch {
      setHandsFreeActive(false);
    }
  }, [ensureCapture, beginSegment, endSegment]);

  const stopHandsFree = useCallback(async () => {
    vadRef.current?.stop();
    vadRef.current = null;
    setHandsFreeActive(false);
    if (recordingRef.current) {
      await endSegment();
    } else {
      setState("idle");
    }
  }, [endSegment]);

  // Tear down the mic + graph on unmount.
  useEffect(() => {
    return () => {
      vadRef.current?.stop();
      void captureRef.current?.dispose();
      captureRef.current = null;
      streamRef.current = null;
    };
  }, []);

  return {
    state,
    level,
    error,
    pttStart,
    pttStop,
    handsFreeActive,
    startHandsFree,
    stopHandsFree,
  };
}
