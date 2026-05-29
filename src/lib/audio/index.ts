// Public surface of the framework-agnostic audio engine.
export {
  requestMicrophone,
  WhisperCapture,
  type WhisperCaptureOptions,
} from "./capture";
export { VoiceActivityDetector, type VadOptions } from "./vad";
export {
  PrivacyVeil,
  isLikelyPrivateOutput,
  type PrivacyVeilOptions,
} from "./masking";
export { haptic, HAPTIC_START, HAPTIC_STOP } from "./haptics";
