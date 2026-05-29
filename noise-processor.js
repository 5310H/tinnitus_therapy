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
        const sr = typeof sampleRate === 'number' ? sampleRate : 44100;
        const ratio = 44100 / (sr > 0 ? sr : 44100);

        // Dynamic Paul Kellet Coefficients (Pink Noise)
        const poles = [0.99886, 0.99332, 0.96900, 0.86870, 0.55000, -0.76160];
        const gains = [0.0555179, 0.0750759, 0.1538520, 0.3104856, 0.5329522, -0.0168980];
        
        // Scale poles to maintain Hz corner frequencies, scale gains to preserve DC power
        this.p = poles.map(p => Math.pow(Math.abs(p), ratio) * Math.sign(p));
        this.g = gains.map((g, i) => g * (1 - Math.abs(this.p[i])) / (1 - Math.abs(poles[i])));

        // Scale Brown Noise Pole
        this.brownPole = Math.pow(1 / 1.02, ratio);
        // Calibrate gain to produce ~0.9 peak to match nature sound levels
        this.brownGain = (1 - this.brownPole) * 30.0; // Increased for audibility

        this.outputPeakTarget = 0.5; // Standardize output peak for all noises
        if (sampleRate < 44100) {
            this.port.postMessage({
                type: 'DSP_WARNING',
                message: `Low Sample Rate: ${sampleRate}Hz. Audio quality below clinical standard.`
            });
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || !output[0]) return true;
        
        const channelL = output[0];
        const channelR = output.length > 1 ? output[1] : null;
        const len = channelL.length;
        const color = this.color;

        // Helper to set sample for both channels simultaneously to ensure stereo presence
        const setSample = (i, val) => {
            channelL[i] = val;
            if (channelR) channelR[i] = val;
        };

        // Optimization: Pull color switch out of the loop for higher efficiency at 96kHz
        if (color === 'pink') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                this.b0 = this.p[0] * this.b0 + white * this.g[0]; // Pink noise coefficients are already scaled
                this.b1 = this.p[1] * this.b1 + white * this.g[1];
                this.b2 = this.p[2] * this.b2 + white * this.g[2];
                this.b3 = this.p[3] * this.b3 + white * this.g[3];
                this.b4 = this.p[4] * this.b4 + white * this.g[4];
                this.b5 = this.p[5] * this.b5 + white * this.g[5];
                setSample(i, (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.85); // Balanced Pink Gain
                this.b6 = white * 0.115926;
            } // Pink noise output is already balanced with the 0.11 multiplier
        } else if (color === 'brown') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                const val = (this.lastOut * this.brownPole) + (white * this.brownGain);
                this.lastOut = val;
                setSample(i, val * 0.5); // Balanced Brown Gain
            }
        } else if (color === 'blue') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                setSample(i, (white - (0.5 * this.lastIn)) * this.outputPeakTarget); // Scale blue noise to target 0.5 peak
                this.lastIn = white;
            }
        } else if (color === 'violet') {
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                setSample(i, (white - this.lastIn) * this.outputPeakTarget); // Scale violet noise to target 0.5 peak
                this.lastIn = white;
            }
        } else {
            for (let i = 0; i < len; i++) {
                setSample(i, (Math.random() * 2 - 1) * this.outputPeakTarget); // Scale white noise to target 0.3 peak
            }
        }
        return true;
    }
}

registerProcessor('noise-processor', NoiseProcessor);