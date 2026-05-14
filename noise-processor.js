/**
 * noise-processor.js
 * Real-time procedurally generated noise for Tinnitus Therapy.
 */
class NoiseProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.color = options.processorOptions.color || 'white';
        
        // Voss-McCartney state for Pink Noise
        this.b0 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0; this.b4 = 0; this.b5 = 0; this.b6 = 0;
        
        // Filter states for Blue/Violet/Brown
        this.lastOut = 0;
        this.lastIn = 0;

        // Calculate scaling factors for non-44.1kHz sample rates
        const sr = sampleRate;
        const ratio = 44100 / sr;

        // Dynamic Paul Kellet Coefficients (Pink Noise)
        const poles = [0.99886, 0.99332, 0.96900, 0.86870, 0.55000, -0.76160];
        const gains = [0.0555179, 0.0750759, 0.1538520, 0.3104856, 0.5329522, -0.0168980];
        
        // Scale poles to maintain Hz corner frequencies, scale gains to preserve DC power
        this.p = poles.map(p => Math.pow(Math.abs(p), ratio) * Math.sign(p));
        this.g = gains.map((g, i) => g * (1 - Math.abs(this.p[i])) / (1 - Math.abs(poles[i])));

        // Scale Brown Noise Pole
        this.brownPole = Math.pow(1 / 1.02, ratio);
        this.brownGain = (1 - this.brownPole) * 50; // Normalize gain relative to white noise input

        if (sampleRate < 44100) {
            this.port.postMessage({
                type: 'DSP_WARNING',
                message: `Low Sample Rate: ${sampleRate}Hz. Audio quality below clinical standard.`
            });
        }

        this._lastPerfReport = 0;
    }

    process(inputs, outputs, parameters) {
        const startTime = performance.now();
        const output = outputs[0];
        const channel = output[0];
        const len = channel.length;
        const color = this.color;

        // Optimization: Pull color switch out of the loop for higher efficiency at 96kHz
        if (color === 'pink') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                this.b0 = this.p[0] * this.b0 + white * this.g[0];
                this.b1 = this.p[1] * this.b1 + white * this.g[1];
                this.b2 = this.p[2] * this.b2 + white * this.g[2];
                this.b3 = this.p[3] * this.b3 + white * this.g[3];
                this.b4 = this.p[4] * this.b4 + white * this.g[4];
                this.b5 = this.p[5] * this.b5 + white * this.g[5];
                channel[i] = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.11;
                this.b6 = white * 0.115926;
            }
        } else if (color === 'brown') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                channel[i] = (this.lastOut * this.brownPole) + (white * this.brownGain);
                this.lastOut = channel[i];
                channel[i] *= 3.5;
            }
        } else if (color === 'blue') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                channel[i] = (white - (0.5 * this.lastIn)) * 0.7;
                this.lastIn = white;
            }
        } else if (color === 'violet') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                channel[i] = (white - this.lastIn);
                this.lastIn = white;
            }
        } else {
            for (let i = 0; i < len; i++) {
                channel[i] = Math.random() * 2 - 1;
            }
        }

        // Mirror to second channel if stereo output is requested
        if (output.length > 1) {
            output[1].set(channel);
        }

        // Performance Monitoring: Calculate load vs the real-time budget (1.33ms @ 96kHz)
        const endTime = performance.now();
        const duration = endTime - startTime;
        const budget = (len / sampleRate) * 1000;
        const load = (duration / budget) * 100;

        // Report performance metrics every 2 seconds
        if (startTime - this._lastPerfReport > 2000) {
            this.port.postMessage({
                type: 'DSP_METRIC',
                load: load.toFixed(1),
                isStable: load < 80,
                sampleRate: sampleRate
            });
            this._lastPerfReport = startTime;
        }

        return true;
    }
}

registerProcessor('noise-processor', NoiseProcessor);