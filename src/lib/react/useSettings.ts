// React hook over the nanostores settings atoms, with typed setters.

import { useStore } from "@nanostores/react";
import type { ProviderId, TalkMode } from "../../types";
import {
  $chatProvider,
  $chatModel,
  $chatKey,
  $openAiSttKey,
  $talkMode,
  $veilEnabled,
  $veilIntensity,
} from "../state/store";

export function useSettings() {
  const provider = useStore($chatProvider);
  const model = useStore($chatModel);
  const apiKey = useStore($chatKey);
  const openAiSttKey = useStore($openAiSttKey);
  const talkMode = useStore($talkMode);
  const veilEnabled = useStore($veilEnabled);
  const veilIntensity = useStore($veilIntensity);

  return {
    provider,
    model,
    apiKey,
    openAiSttKey,
    talkMode,
    veilEnabled,
    veilIntensity,
    setProvider: (v: ProviderId) => $chatProvider.set(v),
    setModel: (v: string) => $chatModel.set(v),
    setApiKey: (v: string) => $chatKey.set(v),
    setOpenAiSttKey: (v: string) => $openAiSttKey.set(v),
    setTalkMode: (v: TalkMode) => $talkMode.set(v),
    setVeilEnabled: (v: boolean) => $veilEnabled.set(v),
    setVeilIntensity: (v: number) => $veilIntensity.set(v),
    /** Whether we have enough to transcribe whispered speech. */
    canTranscribe: provider === "openai" ? Boolean(apiKey) : Boolean(openAiSttKey),
  };
}
