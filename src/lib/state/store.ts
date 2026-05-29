// Cross-island session/settings state (nanostores), persisted to device storage.
//
// BYOK keys live ONLY on the user's device (localStorage) and are sent
// per-request to the relay endpoints. They are never put into PUBLIC_ env or
// the build (AGENTS.md hard rule #1). localStorage is the browser's "device
// secure storage" available to a PWA; we are honest that it is device-local.

import { atom, type WritableAtom } from "nanostores";
import type { ProviderId, TalkMode } from "../../types";

const isBrowser =
  typeof window !== "undefined" && typeof localStorage !== "undefined";

function persistentAtom<T>(
  key: string,
  initial: T,
  decode: (raw: string) => T = JSON.parse,
  encode: (value: T) => string = JSON.stringify,
): WritableAtom<T> {
  let start = initial;
  if (isBrowser) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        start = decode(raw);
      } catch {
        /* corrupt value — fall back to initial */
      }
    }
  }
  const store = atom<T>(start);
  if (isBrowser) {
    store.subscribe((value) => {
      try {
        localStorage.setItem(key, encode(value));
      } catch {
        /* storage full / blocked */
      }
    });
  }
  return store;
}

const idString = (raw: string) => raw as string;
const identity = <T>(v: T) => v;

// --- BYOK credentials (device-local) ---
export const $chatProvider = persistentAtom<ProviderId>(
  "muzzle.provider",
  "openai",
  (r) => r as ProviderId,
  identity as (v: ProviderId) => string,
);
export const $chatModel = persistentAtom<string>(
  "muzzle.model",
  "gpt-4o-mini",
  idString,
  identity as (v: string) => string,
);
export const $chatKey = persistentAtom<string>(
  "muzzle.key",
  "",
  idString,
  identity as (v: string) => string,
);
/** Optional dedicated OpenAI key for STT when chatting with another provider. */
export const $openAiSttKey = persistentAtom<string>(
  "muzzle.openaiSttKey",
  "",
  idString,
  identity as (v: string) => string,
);

// --- Preferences ---
export const $talkMode = persistentAtom<TalkMode>(
  "muzzle.talkMode",
  "push-to-talk",
  (r) => r as TalkMode,
  identity as (v: TalkMode) => string,
);
export const $veilEnabled = persistentAtom<boolean>(
  "muzzle.veilEnabled",
  false,
);
export const $veilIntensity = persistentAtom<number>(
  "muzzle.veilIntensity",
  0.6,
);

/** The OpenAI key usable for STT, derived from current settings. */
export function effectiveOpenAiKey(): string {
  if ($chatProvider.get() === "openai" && $chatKey.get()) {
    return $chatKey.get();
  }
  return $openAiSttKey.get();
}
