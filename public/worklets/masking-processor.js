// Privacy Veil masking source — AudioWorkletProcessor.
//
// Generates an informational-masking layer: a pink-ish noise bed amplitude-
// modulated by slow, smoothed random envelopes to approximate the "babble"
// that makes nearby speech hard to parse. This is NOT encryption and does not
// guarantee secrecy — it only reduces intelligibility to bystanders.
//
// Honest scope note: real informational masking blends multi-talker babble.
// This generator is a lightweight stand-in for the MVP; a babble-sample blend
// is a planned upgrade.

class MaskingProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "gain",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }

  constructor() {
    super();
    // Pink noise state (Paul Kellet's economy filter).
    this.b0 = this.b1 = this.b2 = this.b3 = this.b4 = this.b5 = this.b6 = 0;
    // Slow amplitude-modulation envelope state.
    this.env = 0.5;
    this.envTarget = 0.5;
    this.envCounter = 0;
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0];
    const gain = parameters.gain.length > 1 ? null : parameters.gain[0];

    for (let ch = 0; ch < output.length; ch++) {
      const channel = output[ch];
      for (let i = 0; i < channel.length; i++) {
        // Retarget the slow modulation envelope a few times per second.
        if (this.envCounter <= 0) {
          this.envTarget = 0.35 + Math.random() * 0.65;
          this.envCounter = (sampleRate / 8) | 0;
        }
        this.envCounter--;
        this.env += (this.envTarget - this.env) * 0.0008;

        const white = Math.random() * 2 - 1;
        this.b0 = 0.99886 * this.b0 + white * 0.0555179;
        this.b1 = 0.99332 * this.b1 + white * 0.0750759;
        this.b2 = 0.969 * this.b2 + white * 0.153852;
        this.b3 = 0.8665 * this.b3 + white * 0.3104856;
        this.b4 = 0.55 * this.b4 + white * 0.5329522;
        this.b5 = -0.7616 * this.b5 - white * 0.016898;
        const pink =
          this.b0 +
          this.b1 +
          this.b2 +
          this.b3 +
          this.b4 +
          this.b5 +
          this.b6 +
          white * 0.5362;
        this.b6 = white * 0.115926;

        const g =
          gain !== null ? gain : parameters.gain[i] ?? parameters.gain[0];
        channel[i] = pink * 0.11 * this.env * g;
      }
    }
    return true;
  }
}

registerProcessor("masking-processor", MaskingProcessor);
