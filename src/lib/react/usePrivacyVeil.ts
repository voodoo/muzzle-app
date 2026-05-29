// React hook: manages the Privacy Veil masking graph lifecycle.
//
// Honest framing (AGENTS.md hard rule #4): the veil reduces how intelligible
// your speech is to bystanders. It is NOT encryption.

import { useCallback, useEffect, useRef, useState } from "react";
import { PrivacyVeil, isLikelyPrivateOutput } from "../audio";

export interface UsePrivacyVeilResult {
  running: boolean;
  starting: boolean;
  error: string | null;
  /** null = unknown, true = earbuds/BT likely, false = loudspeaker likely. */
  privateOutput: boolean | null;
  enable: (intensity: number) => Promise<void>;
  disable: () => Promise<void>;
  setIntensity: (intensity: number) => void;
  /** Drive the auto-duck: full while speaking, ducked when silent. */
  setSpeaking: (speaking: boolean) => void;
}

export function usePrivacyVeil(): UsePrivacyVeilResult {
  const veilRef = useRef<PrivacyVeil | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateOutput, setPrivateOutput] = useState<boolean | null>(null);

  const enable = useCallback(async (intensity: number) => {
    setError(null);
    setStarting(true);
    try {
      const veil = new PrivacyVeil({ intensity });
      await veil.start();
      veilRef.current = veil;
      setRunning(true);
      setPrivateOutput(await isLikelyPrivateOutput());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start the masking layer.",
      );
    } finally {
      setStarting(false);
    }
  }, []);

  const disable = useCallback(async () => {
    await veilRef.current?.stop();
    veilRef.current = null;
    setRunning(false);
  }, []);

  const setIntensity = useCallback((intensity: number) => {
    veilRef.current?.setIntensity(intensity);
  }, []);

  const setSpeaking = useCallback((speaking: boolean) => {
    veilRef.current?.setSpeaking(speaking);
  }, []);

  useEffect(() => {
    return () => {
      void veilRef.current?.stop();
      veilRef.current = null;
    };
  }, []);

  return {
    running,
    starting,
    error,
    privateOutput,
    enable,
    disable,
    setIntensity,
    setSpeaking,
  };
}
