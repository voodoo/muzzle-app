// Whisper-Clear capture pipeline (browser-only, framework-agnostic).
//
// getUserMedia -> WebAudio graph (gain boost to lift quiet speech) ->
// MediaStreamDestination -> MediaRecorder. The same graph feeds an
// AnalyserNode so the UI can show a live level meter and the VAD can gate
// hands-free mode.
//
// All browser API access lives inside methods so this module never executes
// during SSR.

export interface MicConstraintsOptions {
  /** Extra input gain applied to lift whispered/sub-vocal speech. */
  inputGain?: number;
}

/**
 * Request the microphone. Per AGENTS.md this must only be called from an
 * explicit user gesture. Constraints are tuned for quiet speech: we keep the
 * browser's noise suppression + auto gain on and capture mono.
 */
export async function requestMicrophone(): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    throw new Error("Microphone capture is not supported in this environment.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export interface WhisperCaptureOptions {
  inputGain?: number;
  /** Called ~60x/sec with a 0..1 RMS level while capturing. */
  onLevel?: (rms: number) => void;
}

/**
 * Owns the capture graph for a single mic stream. Boosts gain, records to a
 * Blob for STT, and exposes the analyser + live level for VAD / metering.
 */
export class WhisperCapture {
  private ctx: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private gain: GainNode;
  private analyser: AnalyserNode;
  private destination: MediaStreamAudioDestinationNode;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private levelRaf = 0;
  private levelBuffer: Float32Array;
  private readonly onLevel?: (rms: number) => void;

  constructor(
    private readonly stream: MediaStream,
    options: WhisperCaptureOptions = {},
  ) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AudioCtx();
    this.source = this.ctx.createMediaStreamSource(stream);
    this.gain = this.ctx.createGain();
    this.gain.gain.value = options.inputGain ?? 2.5;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.levelBuffer = new Float32Array(this.analyser.fftSize);
    this.destination = this.ctx.createMediaStreamDestination();
    this.onLevel = options.onLevel;

    // source -> gain -> [analyser, recorder destination]
    this.source.connect(this.gain);
    this.gain.connect(this.analyser);
    this.gain.connect(this.destination);
  }

  /** The analyser tap on the boosted signal — used by the VAD. */
  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  get audioContext(): AudioContext {
    return this.ctx;
  }

  setInputGain(value: number): void {
    this.gain.gain.value = value;
  }

  /** Start recording boosted audio for later STT. */
  startRecording(): void {
    const mimeType = pickRecorderMimeType();
    this.chunks = [];
    this.recorder = new MediaRecorder(
      this.destination.stream,
      mimeType ? { mimeType } : undefined,
    );
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
    this.startLevelLoop();
  }

  /** Stop recording and resolve with the captured audio blob. */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) {
        reject(new Error("Recorder was not started."));
        return;
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        resolve(new Blob(this.chunks, { type }));
      };
      try {
        recorder.stop();
      } catch (err) {
        reject(err);
      }
      this.stopLevelLoop();
    });
  }

  private startLevelLoop(): void {
    if (!this.onLevel) return;
    const tick = () => {
      this.analyser.getFloatTimeDomainData(this.levelBuffer);
      let sum = 0;
      for (let i = 0; i < this.levelBuffer.length; i++) {
        sum += this.levelBuffer[i] * this.levelBuffer[i];
      }
      const rms = Math.sqrt(sum / this.levelBuffer.length);
      this.onLevel?.(Math.min(1, rms));
      this.levelRaf = requestAnimationFrame(tick);
    };
    this.levelRaf = requestAnimationFrame(tick);
  }

  private stopLevelLoop(): void {
    if (this.levelRaf) cancelAnimationFrame(this.levelRaf);
    this.levelRaf = 0;
  }

  /** Release the mic and tear down the graph. */
  async dispose(): Promise<void> {
    this.stopLevelLoop();
    try {
      this.recorder?.state !== "inactive" && this.recorder?.stop();
    } catch {
      /* already stopped */
    }
    this.stream.getTracks().forEach((t) => t.stop());
    try {
      await this.ctx.close();
    } catch {
      /* already closed */
    }
  }
}
