/**
 * noise-processor.js
 * Real-time procedurally generated noise for Tinnitus Therapy.
 */
class NoiseProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.enableAutoMatch = options.processorOptions.enableAutoMatch === 'true'; // Passed from main thread
        this.requestedColor = options.processorOptions.color || 'auto';
        this.color = 'auto'; // Initial value, will be resolved in _initializeNoiseState
        this.targetFreq = parseFloat(options.processorOptions.targetFreq) || 6000;

        // WASM instantiation
        this.wasmInstance = null;
        if (options.processorOptions.wasmModule) {
            // Imports for WASM module must be defined inside the worklet
            const wasmImports = {
                Math: { sin: Math.sin }
            };
            // Instantiating the compiled module synchronously inside the worklet
            this.wasmInstance = new WebAssembly.Instance(options.processorOptions.wasmModule, wasmImports);
            this.wasmHeap = new Float32Array(this.wasmInstance.exports.memory.buffer);
            this.wasmOutIdx = 256; // Static offset (1024 / 4) for processing buffer

            // Clinical Safety: Explicitly zero out all WASM state registers to prevent audio artifacts
            // Memory Layout: Pink (0-28), Red (32-36), Brown (40), Blue (96-104), Violet (108)
            for (let i = 0; i < 7; i++) this.wasmHeap[i] = 0;      // Pink State (b0-b6)
            this.wasmHeap[32 / 4] = 0; this.wasmHeap[36 / 4] = 0; // Red State (l1, l2)
            this.wasmHeap[40 / 4] = 0;                           // Brown State (lastOut)

            this.wasmHeap[96 / 4] = 0;  // c0 (Blue)
            this.wasmHeap[100 / 4] = 0; // c1 (Blue)
            this.wasmHeap[104 / 4] = 0; // c2 (Blue)
            this.wasmHeap[108 / 4] = 0; // lastIn (Violet)
        }
        this.lfoPhase = 0; // For Forest noise (JS Fallback)
        this.lfoVal = 0.5; // For Forest noise (JS Fallback)

        this._initializeNoiseState();

        // Filter states for colors
        this.lastOut = 0;
        this.lastOut2 = 0; // For Red noise
        this.lastRedIn = 0; // HPF input state for Red/Ocean
        this.redHPState = 0; // HPF output state for Red/Ocean
        this.patterState = 0; // For organic rain decay
        this.c0 = 0; // For Blue noise (JS Fallback)
        this.c1 = 0;
        this.c2 = 0;
        this.lastIn = 0; // For Violet noise (JS Fallback)

        // Pre-allocate fallback arrays to avoid allocations in the audio thread
        this.chimeRatios = new Float32Array([1, 1.25, 1.5, 1.875, 2, 2.5]);
        this.fallbackPhases = new Float32Array(8);
        this.fallbackEnvelopes = new Float32Array(8);

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

        // Dynamic peak target mapping to ensure consistent perceived loudness across spectral types.
        // Darker noises (Brown/Red) require higher peak targets to match the perceived volume of White/Blue.
        this.peakMap = {
            'white': 0.35,
            'pink': 0.5,
            'brown': 0.65,
            'red': 0.75,
            'blue': 0.4,
            'violet': 0.45,
            'rain': 0.5,
            'ocean': 0.6,
            'chimes': 0.5,
            'forest': 0.5
        };

        // RMS Limiter State
        this.rmsSq = 0;
        this.dcMean = 0; // Hardware protection: Track DC offset
        this.limiterGain = 1.0;
        this.limiterThreshold = 0.8; // Clinical standard: -2dB headroom for long-term exposure
        const rmsTime = 0.01; // 10ms window for RMS integration
        this.rmsAlpha = 1 - Math.exp(-1 / (sr * rmsTime));
        const gAttack = 0.002; // 2ms attack: Faster protection against transients
        const gRelease = 0.1; // 100ms release
        this.gainAttackAlpha = 1 - Math.exp(-1 / (sr * gAttack));
        this.gainReleaseAlpha = 1 - Math.exp(-1 / (sr * gRelease));

        const dcTime = 0.1; // 100ms window to detect sustained DC bias
        this.dcAlpha = 1 - Math.exp(-1 / (sr * dcTime));
        this.rmsAlphaInv = 1 - this.rmsAlpha;
        this.dcAlphaInv = 1 - this.dcAlpha;

        // Crossfade state management
        this.prevColor = null;
        this.fadePos = 0;
        this.tempBuf1 = new Float32Array(512); // Pre-allocate safe maximum to avoid thread allocations
        this.tempBuf2 = new Float32Array(512);

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_COLOR') {
                this.requestedColor = (e.data.color || 'white').toLowerCase();
                const next = this._resolveColor(this.requestedColor);
                if (next !== this.color) {
                    this.prevColor = this.color;
                    this.color = next;
                    this.fadePos = 0;
                    this._updateBases();
                }
            } else if (e.data.type === 'SET_TARGET_FREQ') {
                this.targetFreq = parseFloat(e.data.targetFreq) || 6000;
                this._updateBases();

                // Re-evaluate spectral auto-selection if in 'auto' mode
                if (this.requestedColor === 'auto') {
                    const next = this._resolveColor('auto');
                    if (next !== this.color) {
                        this.prevColor = this.color;
                        this.color = next;
                        this.fadePos = 0;
                    }
                }
                this.port.postMessage({ type: 'DSP_INFO', message: `Target Freq updated to ${this.targetFreq}Hz` });
            }
        };

        if (sampleRate < 44100) {
            this.port.postMessage({
                type: 'DSP_WARNING',
                message: `Low Sample Rate: ${sampleRate}Hz. Audio quality below clinical standard.`
            });
        }
    }

    _resolveColor(color) {
        const c = color.toLowerCase();
        if (c === 'auto' && this.enableAutoMatch) {
            if (this.targetFreq < 1200) return 'brown';
            if (this.targetFreq > 10000) return 'violet'; // Extreme high focus for ultra-sharp tones
            if (this.targetFreq > 6000) return 'blue'; // Use high-frequency focus for sharp tones
            return 'pink';
        }
        if (c === 'auto') return 'pink';
        return c;
    }

    _updateBases() {
        let base = this.targetFreq;
        while (base > 400) { base /= 2; }
        if (base < 50) { base = this.targetFreq / 4; }
        this.baseFreq = base;

        let chimeBase = this.targetFreq;
        while (chimeBase > 1200) chimeBase /= 2;
        this.chimeBaseFreq = chimeBase;
    }

    _initializeNoiseState() {
        this.color = this._resolveColor(this.requestedColor);

        // Voss-McCartney state for Pink Noise
        this.b0 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0; this.b4 = 0; this.b5 = 0; this.b6 = 0;

        // Filter states
        this.lastOut = 0;
        this.lastOut2 = 0;
        this.lastRedIn = 0;
        this.redHPState = 0;
        this.patterState = 0;
        this.c0 = 0; this.c1 = 0; this.c2 = 0; this.lastIn = 0;

        // Reset Chime fallback states
        this.fallbackPhases.fill(0);
        this.fallbackEnvelopes.fill(0);

        this.surgeVal = 1.0;
        this.amVal = 1.0;
        this.pulsePhase = 0;
        this.surgePhase = 0;

        this._updateBases();
    }

    static get parameterDescriptors() {
        return [{
            name: 'pulseRate',
            defaultValue: 0.0,
            minValue: 0.0,
            maxValue: 10.0,
            automationRate: 'k-rate'
        }, {
            name: 'pulseDepth',
            defaultValue: 0.0,
            minValue: 0.0,
            maxValue: 1.0,
            automationRate: 'k-rate'
        }, {
            name: 'crossfadeDuration',
            defaultValue: 0.1,
            minValue: 0.0,
            maxValue: 5.0,
            automationRate: 'k-rate'
        }];
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || !output[0]) return true;

        const channelL = output[0];
        const pulseRate = parameters.pulseRate ? parameters.pulseRate[0] : 0.0;
        const pulseDepth = parameters.pulseDepth ? parameters.pulseDepth[0] : 0.0;
        const crossfadeSec = parameters.crossfadeDuration ? parameters.crossfadeDuration[0] : 0.1;
        const channelR = output.length > 1 ? output[1] : null;
        const len = channelL.length;
        const sr = sampleRate || 44100;

        this.surgeVal = Math.sin(this.surgePhase) * 0.25 + 0.75;
        this.amVal = (pulseDepth > 0) ? 1.0 - (pulseDepth * (0.5 + 0.5 * Math.sin(this.pulsePhase))) : 1.0;

        // Advance phases
        this.surgePhase = (this.surgePhase + (0.503 * len) / sr) % (2 * Math.PI); // 0.08Hz
        if (pulseDepth > 0) this.pulsePhase = (this.pulsePhase + (2 * Math.PI * pulseRate * len) / sr) % (2 * Math.PI);

        const crossfadeSamples = Math.max(1, Math.floor(crossfadeSec * sr));

        if (this.prevColor) {
            this._fillBuffer(this.prevColor, len, this.tempBuf1);
            this._fillBuffer(this.color, len, this.tempBuf2);
            const p1 = this.peakMap[this.prevColor] || 0.5;
            const p2 = this.peakMap[this.color] || 0.5;
            for (let i = 0; i < len; i++) {
                const alpha = Math.min(1.0, this.fadePos / crossfadeSamples);
                const mixed = (this.tempBuf1[i] * p1 * (1 - alpha)) + (this.tempBuf2[i] * p2 * alpha);

                // Apply safety limiter logic during crossfade
                let val = mixed;
                if (isNaN(val) || !isFinite(val)) {
                    val = 0;
                    this._initializeNoiseState(); // Emergency state reset for recursive filters
                }
                const sq = val * val;
                this.rmsSq = (this.rmsAlpha * sq) + (this.rmsAlphaInv * this.rmsSq);
                this.dcMean = (this.dcAlpha * val) + (this.dcAlphaInv * this.dcMean);
                let targetGain = 1.0;
                if (this.rmsSq > 0.64) targetGain = 0.8 / Math.sqrt(this.rmsSq); // 0.8^2 = 0.64
                const absDc = Math.abs(this.dcMean);
                if (absDc > 0.1) targetGain = Math.min(targetGain, 0.1 / absDc); // Protect transducers from DC bias
                const gAlpha = (targetGain < this.limiterGain) ? this.gainAttackAlpha : this.gainReleaseAlpha;
                this.limiterGain += (targetGain - this.limiterGain) * gAlpha;
                const finalVal = val * this.amVal * this.limiterGain;
                channelL[i] = finalVal;
                if (channelR) channelR[i] = finalVal;

                this.fadePos++;
                if (this.fadePos >= crossfadeSamples) this.prevColor = null;
            }
        } else {
            // High-Performance Path: Process directly into hardware buffer
            this._fillBuffer(this.color, len, channelL);
            const baseGain = (this.peakMap[this.color] || 0.5) * this.amVal;

            // Inlined sample loop to minimize function call overhead in the audio thread
            for (let i = 0; i < len; i++) {
                let val = channelL[i] * baseGain;
                if (isNaN(val) || !isFinite(val)) {
                    val = 0;
                    this._initializeNoiseState(); // Emergency state reset
                }

                const sq = val * val;
                this.rmsSq = (this.rmsAlpha * sq) + (this.rmsAlphaInv * this.rmsSq);
                this.dcMean = (this.dcAlpha * val) + (this.dcAlphaInv * this.dcMean);

                let targetGain = 1.0;
                if (this.rmsSq > 0.64) targetGain = 0.8 / Math.sqrt(this.rmsSq);
                const absDc = Math.abs(this.dcMean);
                if (absDc > 0.1) targetGain = Math.min(targetGain, 0.1 / absDc);

                const gAlpha = (targetGain < this.limiterGain) ? this.gainAttackAlpha : this.gainReleaseAlpha;
                this.limiterGain += (targetGain - this.limiterGain) * gAlpha;

                const finalVal = val * this.limiterGain;
                channelL[i] = finalVal;
                if (channelR) channelR[i] = finalVal;
            }
        }
        return true;
    }

    _fillBuffer(color, len, target) {
        const peak = this.peakMap[color] || 0.5;
        const sr = sampleRate || 44100;
        const phaseConst = (2 * Math.PI) / sr;

        // Use WASM for performance-critical colors
        // Safety: If WASM memory grows, the existing ArrayBuffer is detached.
        // We must refresh the Float32Array view if the buffer reference has changed.
        if (this.wasmInstance && this.wasmHeap.buffer !== this.wasmInstance.exports.memory.buffer) {
            this.wasmHeap = new Float32Array(this.wasmInstance.exports.memory.buffer);
        }

        const outPtr = 1024; // Bytes
        const outIdx = this.wasmOutIdx;

        if (color === 'pink') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillPink(outPtr, len,
                    this.p[0], this.p[1], this.p[2], this.p[3], this.p[4], this.p[5],
                    this.g[0], this.g[1], this.g[2], this.g[3], this.g[4], this.g[5]);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    this.b0 = this.p[0] * this.b0 + white * this.g[0];
                    this.b1 = this.p[1] * this.b1 + white * this.g[1];
                    this.b2 = this.p[2] * this.b2 + white * this.g[2];
                    this.b3 = this.p[3] * this.b3 + white * this.g[3];
                    this.b4 = this.p[4] * this.b4 + white * this.g[4];
                    this.b5 = this.p[5] * this.b5 + white * this.g[5];
                    const raw = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.85;
                    const out = raw - this.lastRedIn + (0.997 * this.redHPState);
                    this.lastRedIn = raw; this.redHPState = out;
                    target[i] = out;
                    this.b6 = white * 0.115926;
                }
            }
        } else if (color === 'red') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillRed(outPtr, len);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    this.lastOut = (this.lastOut * 0.999) + (white * 0.01);
                    this.lastOut2 = (this.lastOut2 * 0.999) + (this.lastOut * 0.01);
                    const raw = this.lastOut2 * 45;
                    const out = raw - this.lastRedIn + (0.997 * this.redHPState);
                    this.lastRedIn = raw; this.redHPState = out;
                    target[i] = out;
                }
            }
        } else if (color === 'chimes') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillChimes(outPtr, len, this.chimeBaseFreq, phaseConst);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                // Original JS implementation for fallback
                const rs = this.chimeRatios;
                for (let h = 0; h < rs.length; h++) {
                    if (Math.random() < 0.0015) { // Roughly 1 strike every 15s per harmonic
                        this.fallbackEnvelopes[h] = 0.7 + Math.random() * 0.3;
                    }
                }

                for (let i = 0; i < len; i++) {
                    let val = 0;
                    for (let h = 0; h < rs.length; h++) {
                        val += Math.sin(this.fallbackPhases[h]) * this.fallbackEnvelopes[h] * (1 / (h + 1));
                        this.fallbackPhases[h] = (this.fallbackPhases[h] + phaseConst * this.chimeBaseFreq * rs[h]) % (2 * Math.PI);
                        this.fallbackEnvelopes[h] *= 0.99996; // Slower, more resonant decay
                    }
                    target[i] = val * 0.4;
                }
            }
        } else if (color === 'rain') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillRain(outPtr, len,
                    this.p[0], this.p[1], this.p[2], this.p[3], this.p[4], this.p[5],
                    this.g[0], this.g[1], this.g[2], this.g[3], this.g[4], this.g[5]);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    this.b0 = this.p[0] * this.b0 + white * this.g[0];
                    this.b1 = this.p[1] * this.b1 + white * this.g[1];
                    this.b2 = this.p[2] * this.b2 + white * this.g[2];
                    this.b3 = this.p[3] * this.b3 + white * this.g[3];
                    this.b4 = this.p[4] * this.b4 + white * this.g[4];
                    this.b5 = this.p[5] * this.b5 + white * this.g[5];
                    const rawPink = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.85;
                    const impulse = Math.random() > 0.9997 ? (Math.random() * 2 - 1) * 0.4 : 0;
                    this.patterState = (this.patterState * 0.995) + impulse;
                    const mixed = (rawPink * 0.85 + this.patterState * 0.15);
                    const out = mixed - this.lastRedIn + (0.997 * this.redHPState);
                    this.lastRedIn = mixed; this.redHPState = out;
                    target[i] = out;
                    this.b6 = white * 0.115926;
                }
            }
        } else if (color === 'ocean') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillOcean(outPtr, len, this.surgeVal);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    this.lastOut = (this.lastOut * 0.999) + (white * 0.01);
                    this.lastOut2 = (this.lastOut2 * 0.999) + (this.lastOut * 0.01);
                    const red = this.lastOut2 * 45;
                    const out = red - this.lastRedIn + (0.997 * this.redHPState);
                    this.lastRedIn = red; this.redHPState = out;
                    target[i] = out * this.surgeVal;
                }
            }
        } else if (color === 'brown') {
            if (this.wasmInstance) {
                // WASM Implementation of Brown noise
                this.wasmInstance.exports.fillBrown(outPtr, len, this.brownPole, this.brownGain);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    const raw = (this.lastOut * this.brownPole) + (white * this.brownGain);
                    this.lastOut = raw;
                    const out = raw - this.lastRedIn + (0.997 * this.redHPState);
                    this.lastRedIn = raw; this.redHPState = out;
                    target[i] = out;
                }
            }
        } else if (color === 'blue') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillBlue(outPtr, len);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    this.c0 = 0.8 * this.c0 + white * 0.2;
                    this.c1 = 0.92 * this.c1 + white * 0.15;
                    this.c2 = 0.99 * this.c2 + white * 0.05;
                    const blue = white - (this.c0 + this.c1 + this.c2) * 0.2;
                    target[i] = blue * 1.5;
                }
            }
        } else if (color === 'violet') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillViolet(outPtr, len);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    const val = white - this.lastIn;
                    this.lastIn = white;
                    target[i] = val * 0.8;
                }
            }
        } else if (color === 'forest') {
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillForest(outPtr, len);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    const white = Math.random() * 2 - 1;
                    // Simple LFO for "whoosh" effect
                    this.lfoPhase = (this.lfoPhase + 0.00005) % (2 * Math.PI); // Very slow LFO
                    this.lfoVal = (Math.sin(this.lfoPhase) * 0.5 + 0.5) * 0.5 + 0.5; // Range 0.5 to 1.0
                    target[i] = white * this.lfoVal;
                }
            }
        } else if (color === 'white') { // Explicitly handle 'white' noise
            if (this.wasmInstance) {
                this.wasmInstance.exports.fillWhite(outPtr, len);
                for (let j = 0; j < len; j++) target[j] = this.wasmHeap[outIdx + j];
            } else {
                for (let i = 0; i < len; i++) {
                    target[i] = (Math.random() * 2 - 1);
                }
            }
        } else { // Fallback for unknown colors, default to white noise
            for (let i = 0; i < len; i++) {
                target[i] = (Math.random() * 2 - 1);
            }
        }
    }
}

registerProcessor('noise-processor', NoiseProcessor);