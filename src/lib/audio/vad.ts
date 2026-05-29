// Energy-based voice activity detection for hands-free mode.
//
// This is an intentionally lightweight, dependency-free VAD: it watches the
// RMS of the (already gain-boosted) capture analyser and reports speech
// start/stop with hangover smoothing. A WASM RNNoise-class model running in an
// AudioWorklet is the planned upgrade (see src/lib/audio/README notes / PRD
// Phase 3) for better robustness on whispered input.

export interface VadOptions {
  /** RMS threshold (0..1) above which we consider speech present. */
  threshold?: number;
  /** Milliseconds of continued silence before we declare speech ended. */
  silenceHangoverMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export class VoiceActivityDetector {
  private analyser: AnalyserNode;
  private buffer: Float32Array;
  private raf = 0;
  private speaking = false;
  private lastVoiceTs = 0;
  private readonly threshold: number;
  private readonly silenceHangoverMs: number;
  private readonly onSpeechStart?: () => void;
  private readonly onSpeechEnd?: () => void;

  constructor(analyser: AnalyserNode, options: VadOptions = {}) {
    this.analyser = analyser;
    this.buffer = new Float32Array(analyser.fftSize);
    // Whispered speech is quiet; default threshold is deliberately low.
    this.threshold = options.threshold ?? 0.015;
    this.silenceHangoverMs = options.silenceHangoverMs ?? 900;
    this.onSpeechStart = options.onSpeechStart;
    this.onSpeechEnd = options.onSpeechEnd;
  }

  start(): void {
    const tick = () => {
      this.analyser.getFloatTimeDomainData(this.buffer);
      let sum = 0;
      for (let i = 0; i < this.buffer.length; i++) {
        sum += this.buffer[i] * this.buffer[i];
      }
      const rms = Math.sqrt(sum / this.buffer.length);
      const now = performance.now();

      if (rms >= this.threshold) {
        this.lastVoiceTs = now;
        if (!this.speaking) {
          this.speaking = true;
          this.onSpeechStart?.();
        }
      } else if (
        this.speaking &&
        now - this.lastVoiceTs > this.silenceHangoverMs
      ) {
        this.speaking = false;
        this.onSpeechEnd?.();
      }

      this.raf = requestAnimationFrame(tick);
    };
    this.lastVoiceTs = performance.now();
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.speaking = false;
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }
}
