#!/usr/bin/env python3
"""
Tinnitus Therapy WAV Generator
Generates calibrated therapy audio files for offline use.

Usage:
  python tinnitus_generator.py --type notch --freq 6000 --duration 1800
  python tinnitus_generator.py --type decorrelated --color pink --duration 900
  python tinnitus_generator.py --type tone --freq 4500 --duration 30

Requires: numpy, scipy
"""

import argparse
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

def generate_white_noise(n_samples):
    return np.random.randn(n_samples)

def generate_pink_noise(n_samples):
    """Voss-McCartney algorithm for pink noise."""
    white = np.random.randn(n_samples)
    b = [0.99886, 0.99332, 0.96900, 0.86870, 0.55000, -0.76160]
    a = [0.0555179, 0.0750759, 0.153852, 0.3104856, 0.5329522, -0.016898]
    state = np.zeros(len(b))
    pink = np.zeros(n_samples)
    for i in range(n_samples):
        w = white[i]
        for j in range(len(b)):
            state[j] = b[j] * state[j] + w * a[j]
        pink[i] = np.sum(state) + w * 0.5362
    return pink / (np.max(np.abs(pink)) + 1e-10)

def generate_brown_noise(n_samples):
    """Integrated white noise (Brownian motion)."""
    white = np.random.randn(n_samples)
    brown = np.cumsum(white)
    brown = brown / (np.max(np.abs(brown)) + 1e-10)
    return brown

def generate_noise(color, n_samples):
    generators = {
        'white': generate_white_noise,
        'pink': generate_pink_noise,
        'brown': generate_brown_noise,
    }
    if color not in generators:
        raise ValueError(f"Unknown noise color: {color}. Choose: white, pink, brown")
    noise = generators[color](n_samples)
    return noise / (np.max(np.abs(noise)) + 1e-10)

def apply_notch(signal, center_freq, width_octaves, sample_rate):
    """Apply a bandstop (notch) filter around center_freq."""
    half = width_octaves / 2.0
    low = center_freq * (2.0 ** (-half))
    high = center_freq * (2.0 ** half)
    low = max(low, 20)
    high = min(high, sample_rate / 2 - 1)
    # Increasing order to 8 for a steeper 'medical-grade' notch transition.
    # This ensures less energy is removed from the non-target frequencies.
    sos = butter(8, [low, high], btype='bandstop', fs=sample_rate, output='sos')
    return sosfilt(sos, signal)

def generate_tone(freq, duration, sample_rate):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return 0.5 * np.sin(2 * np.pi * freq * t)

def normalize_and_convert(signal, bit_depth=16):
    peak = np.max(np.abs(signal)) + 1e-10
    signal = signal / peak * 0.9
    if bit_depth == 16:
        return (signal * 32767).astype(np.int16)
    return signal

def main():
    parser = argparse.ArgumentParser(description='Tinnitus Therapy WAV Generator')
    parser.add_argument('--type', choices=['notch', 'decorrelated', 'tone'],
                        required=True, help='Therapy type')
    parser.add_argument('--freq', type=float, default=6000,
                        help='Center/tone frequency in Hz (default: 6000)')
    parser.add_argument('--color', choices=['white', 'pink', 'brown'], default='pink',
                        help='Noise color (default: pink)')
    parser.add_argument('--duration', type=float, default=600,
                        help='Duration in seconds (default: 600)')
    parser.add_argument('--notch-width', type=float, default=1.0,
                        help='Notch width in octaves (default: 1.0)')
    parser.add_argument('--sample-rate', type=int, default=44100,
                        help='Sample rate in Hz (default: 44100)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output filename (auto-generated if omitted)')
    args = parser.parse_args()

    n_samples = int(args.sample_rate * args.duration)
    sr = args.sample_rate

    if args.type == 'tone':
        mono = generate_tone(args.freq, args.duration, sr)
        stereo = np.column_stack([mono, mono])
        label = f"tone_{int(args.freq)}Hz"
        print(f"Generated {args.duration}s pure tone at {args.freq} Hz")

    elif args.type == 'notch':
        noise = generate_noise(args.color, n_samples)
        filtered = apply_notch(noise, args.freq, args.notch_width, sr)
        stereo = np.column_stack([filtered, filtered])
        label = f"notch_{args.color}_{int(args.freq)}Hz_{args.notch_width}oct"
        print(f"Generated {args.duration}s {args.color} noise with "
              f"{args.notch_width}-octave notch at {args.freq} Hz")

    elif args.type == 'decorrelated':
        left = generate_noise(args.color, n_samples)
        right = generate_noise(args.color, n_samples)
        stereo = np.column_stack([left, right])
        label = f"decorrelated_{args.color}"
        print(f"Generated {args.duration}s decorrelated {args.color} noise")

    stereo_16 = normalize_and_convert(stereo)
    filename = args.output or f"therapy_{label}_{int(args.duration)}s.wav"
    wavfile.write(filename, sr, stereo_16)
    print(f"Saved: {filename} ({sr} Hz, 16-bit stereo)")

if __name__ == '__main__':
    main()
