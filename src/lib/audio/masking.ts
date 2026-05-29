// Privacy Veil — acoustic masking output graph (Pro, fast-follow per PRD 5.2).
//
// Runs a SEPARATE AudioContext output graph that plays an informational-
// masking layer (pink/babble blend, generated in an AudioWorklet) through the
// speaker/earbuds while the user talks, with intensity control and auto-duck
// on silence.
//
// HONEST CLAIM (AGENTS.md hard rule #4): this reduces how intelligible your
// speech is to bystanders. It is NOT encryption and provides no guarantee of
// acoustic secrecy.

const WORKLET_URL = "/worklets/masking-processor.js";

export interface PrivacyVeilOptions {
  /** User-facing intensity 0..1; scales the masking output level. */
  intensity?: number;
  /** Output level multiplier while ducked (user is silent). */
  duckLevel?: number;
}

export class PrivacyVeil {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private masterGain: GainNode | null = null;
  private intensity: number;
  private readonly duckLevel: number;
  private speaking = false;
  private started = false;

  constructor(options: PrivacyVeilOptions = {}) {
    this.intensity = options.intensity ?? 0.6;
    this.duckLevel = options.duckLevel ?? 0.12;
  }

  get isRunning(): boolean {
    return this.started;
  }

  /** Build the graph and begin emitting the (ducked) masking layer. */
  async start(): Promise<void> {
    if (this.started) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AudioCtx();
    await this.ctx.audioWorklet.addModule(WORKLET_URL);

    this.node = new AudioWorkletNode(this.ctx, "masking-processor", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;

    this.node.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.started = true;
    this.applyLevel(false);
  }

  /** Auto-duck control: full intensity while speaking, low level when silent. */
  setSpeaking(speaking: boolean): void {
    if (this.speaking === speaking) return;
    this.speaking = speaking;
    this.applyLevel(true);
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.applyLevel(true);
  }

  private applyLevel(ramp: boolean): void {
    if (!this.node || !this.ctx) return;
    const target = this.speaking
      ? this.intensity
      : this.intensity * this.duckLevel;
    const gainParam = this.node.parameters.get("gain");
    if (!gainParam) return;
    const now = this.ctx.currentTime;
    if (ramp) {
      gainParam.cancelScheduledValues(now);
      gainParam.setTargetAtTime(target, now, 0.08);
    } else {
      gainParam.setValueAtTime(target, now);
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.speaking = false;
    try {
      this.node?.disconnect();
      this.masterGain?.disconnect();
      await this.ctx?.close();
    } catch {
      /* already torn down */
    }
    this.node = null;
    this.masterGain = null;
    this.ctx = null;
  }
}

/**
 * Best-effort check for whether audio is likely routing to a private output
 * (earbuds/Bluetooth) vs the loudspeaker, so the UI can warn the user. The
 * web platform exposes little here; treat a non-empty, non-"default" output
 * device label as "private-ish". Returns null when we can't tell.
 */
export async function isLikelyPrivateOutput(): Promise<boolean | null> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return null;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter((d) => d.kind === "audiooutput");
    const label = outputs.map((d) => d.label.toLowerCase()).join(" ");
    if (!label) return null;
    if (/airpod|bluetooth|headphone|headset|earbud/.test(label)) return true;
    if (/speaker/.test(label)) return false;
    return null;
  } catch {
    return null;
  }
}
