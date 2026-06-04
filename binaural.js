/**
 * BinauralVisualizer
 * Specialized real-time visualization for Binaural Beat therapy.
 * Displays dual waveforms and a Lissajous phase pattern to visualize the 'beat'.
 */
class BinauralVisualizer {
    constructor(canvas, analyserL, analyserR) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.analyserL = analyserL;
        this.analyserR = analyserR;

        this.bufferLength = analyserL.frequencyBinCount;
        this.dataL = new Uint8Array(this.bufferLength);
        this.dataR = new Uint8Array(this.bufferLength);

        this.animationId = null;
    }

    start() {
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);
            this.render();
        };
        draw();
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;

        this.analyserL.getByteTimeDomainData(this.dataL);
        this.analyserR.getByteTimeDomainData(this.dataR);

        // Fade background for motion trail effect
        const isLight = document.documentElement.classList.contains('light-mode');
        ctx.fillStyle = isLight ? 'rgba(240, 242, 245, 0.2)' : 'rgba(0, 11, 24, 0.2)';
        ctx.fillRect(0, 0, width, height);

        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00bfa5';

        // 1. Draw Lissajous Phase Pattern (Center)
        // This visualizes the binaural 'drift' as a rotating/shifting shape
        ctx.beginPath();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;

        const centerX = width / 2;
        const centerY = height / 2;
        const scale = height * 0.4;

        for (let i = 0; i < this.bufferLength; i++) {
            const x = centerX + ((this.dataL[i] / 128.0) - 1) * scale;
            const y = centerY + ((this.dataR[i] / 128.0) - 1) * scale;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 2. Draw Waveforms (Background)
        this.drawWaveform(this.dataL, 'rgba(66, 165, 245, 0.3)', height * 0.25); // Left (Blue)
        this.drawWaveform(this.dataR, 'rgba(239, 83, 80, 0.3)', height * 0.75);  // Right (Red)

        ctx.globalAlpha = 1.0;
    }

    drawWaveform(data, color, yOffset) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const sliceWidth = width / this.bufferLength;
        const amp = 30;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        let x = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const v = data[i] / 128.0;
            const y = yOffset + (v - 1) * amp;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
        }
        ctx.stroke();
    }
}

// Integration helper for the Binaural page
window.initBinauralVisualizer = (canvasId, nodeL, nodeR) => {
    if (!window.audioCtx) return null;
    const analyserL = window.audioCtx.createAnalyser();
    const analyserR = window.audioCtx.createAnalyser();
    analyserL.fftSize = 1024; // Ensure sufficient detail for visualization
    analyserR.fftSize = 1024;
    nodeL.connect(analyserL);
    nodeR.connect(analyserR);

    const canvas = document.getElementById(canvasId);
    return new BinauralVisualizer(canvas, analyserL, analyserR);
};