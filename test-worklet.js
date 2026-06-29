const fs = require('fs');
const options = {
    processorOptions: {
        color: 'pink',
        enableAutoMatch: 'true',
        targetFreq: 6000,
        wasmModule: new WebAssembly.Module(fs.readFileSync('noise-generator.wasm'))
    }
};
// Polyfill global for the worklet
global.sampleRate = 44100;
global.AudioWorkletProcessor = class { constructor() {} };

const workletCode = fs.readFileSync('noise-processor.js', 'utf8');
eval(workletCode);

const processor = new NoiseProcessor(options);
const channelL = new Float32Array(128);
const channelR = new Float32Array(128);
processor.process([], [[channelL, channelR]], {});
console.log("With WASM:");
console.log("Left Output:", channelL.slice(0, 5));

// Now test JS fallback
options.processorOptions.wasmModule = null;
const processorJS = new NoiseProcessor(options);
const channelLJS = new Float32Array(128);
const channelRJS = new Float32Array(128);
processorJS.process([], [[channelLJS, channelRJS]], {});
console.log("With JS Fallback:");
console.log("Left Output:", channelLJS.slice(0, 5));
