#!/usr/bin/env python3
"""
Tinnitus Therapy WAV Generator
Generates calibrated therapy audio files for offline use.

Usage:
  python tinnitus_generator.py --type notch --freq 6000 --duration 1800
  python tinnitus_generator.py --type decorrelated --color harmonic --duration 900
  python tinnitus_generator.py --type tone --freq 4500 --duration 30

Requires: numpy, scipy
"""

import argparse
import os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, lfilter

def apply_dc_blocker(signal, state=0, last_in=0, alpha=0.997):
    """One-pole high-pass filter to remove DC drift and sub-sonic energy."""
    out = np.zeros_like(signal)
    for i in range(len(signal)):
        out[i] = signal[i] - last_in + (alpha * state)
        last_in = signal[i]
        state = out[i]
    return out, state, last_in

def generate_white_noise(n_samples, sample_rate=44100):
    return np.random.uniform(-1, 1, n_samples)

def generate_pink_noise(n_samples, sample_rate=44100):
    """Sample-rate adjusted Kellet filter for pink noise."""
    white = np.random.uniform(-1, 1, n_samples)
    ratio = 44100 / sample_rate
    
    poles = [0.99886, 0.99332, 0.96900, 0.86870, 0.55000, -0.76160]
    gains = [0.0555179, 0.0750759, 0.153852, 0.3104856, 0.5329522, -0.016898]
    
    # Scale coefficients
    p = [np.power(np.abs(val), ratio) * np.sign(val) for val in poles]
    g = [gains[i] * (1 - np.abs(p[i])) / (1 - np.abs(poles[i])) for i in range(len(poles))]
    
    state = np.zeros(len(p))
    pink = np.zeros(n_samples)
    last_w = 0
    for i in range(n_samples):
        w = white[i]
        for j in range(len(p)):
            state[j] = p[j] * state[j] + w * g[j]
        pink[i] = (np.sum(state) + w * 0.5362 + last_w * 0.115926) * 0.85
        last_w = w
    
    pink_blocked, _, _ = apply_dc_blocker(pink)
    return pink_blocked

def generate_brown_noise(n_samples, sample_rate=44100):
    """Sample-rate adjusted leaky integrator for brown noise."""
    white = np.random.uniform(-1, 1, n_samples)
    ratio = 44100 / sample_rate
    pole = np.power(1/1.02, ratio)
    gain = (1 - pole) * 30
    
    brown = np.zeros(n_samples)
    last_out = 0
    for i in range(n_samples):
        brown[i] = (last_out * pole) + (white[i] * gain)
        last_out = brown[i]

    brown_blocked, _, _ = apply_dc_blocker(brown)
    return brown_blocked

def generate_violet_noise(n_samples):
    """Differentiated white noise (+6dB/octave). Perfect for high-tone tinnitus."""
    white = np.random.uniform(-1, 1, n_samples)
    violet = np.diff(white, prepend=0)
    return violet * 0.8

def generate_blue_noise(n_samples, sample_rate=44100):
    """Blue noise (+3dB/octave). High-frequency emphasis."""
    white = np.random.uniform(-1, 1, n_samples)
    c0, c1, c2 = 0, 0, 0
    blue = np.zeros(n_samples)
    for i in range(n_samples):
        c0 = 0.8 * c0 + white[i] * 0.2
        c1 = 0.92 * c1 + white[i] * 0.15
        c2 = 0.99 * c2 + white[i] * 0.05
        blue[i] = (white[i] - (c0 + c1 + c2) * 0.2) * 1.5
    return blue

def generate_red_noise(n_samples, sample_rate=44100):
    """Filtered red noise for deep masking."""
    white = np.random.uniform(-1, 1, n_samples)
    l1, l2 = 0, 0
    red = np.zeros(n_samples)
    for i in range(n_samples):
        l1 = (l1 * 0.999) + (white[i] * 0.01)
        l2 = (l2 * 0.999) + (l1 * 0.01)
        red[i] = l2 * 45
    red_blocked, _, _ = apply_dc_blocker(red)
    return red_blocked

def generate_rain(n_samples, sample_rate=44100):
    pink = generate_pink_noise(n_samples, sample_rate)
    # Ensure the patter is bipolar to maintain DC-free stability
    patter = np.where(np.random.uniform(0, 1, n_samples) > 0.9998, np.random.uniform(-0.4, 0.4, n_samples), 0)
    return pink * 0.7 + patter

def generate_ocean(n_samples, sample_rate=44100):
    red_blocked = generate_red_noise(n_samples, sample_rate)
    t = np.linspace(0, n_samples / sample_rate, n_samples, endpoint=False)
    surge = np.sin(2 * np.pi * 0.08 * t) * 0.4 + 0.6
    return red_blocked * surge

def generate_wind_chimes(n_samples, sample_rate=44100, target_freq=6000):
    base = target_freq
    while base > 1200: base /= 2
    ratios = [1, 1.2, 1.5, 1.875, 2, 2.25, 3]
    signal = np.zeros(n_samples)
    t = np.linspace(0, n_samples / sample_rate, n_samples, endpoint=False)
    for h_idx, r in enumerate(ratios):
        env = np.power(np.maximum(0, np.sin(np.pi * (0.12 + h_idx * 0.04) * t + (h_idx * 2.1))), 200)
        phase = np.cumsum(2 * np.pi * base * r / sample_rate * np.ones(n_samples))
        signal += np.sin(phase) * env * (1.0 / (h_idx + 1.2))
    return signal * 0.6

def generate_noise(color, n_samples, sample_rate=44100, target_freq=6000):
    active_color = color.lower()
    if active_color == 'auto':
        if target_freq < 1200: active_color = 'brown'
        elif target_freq > 10000: active_color = 'violet'
        elif target_freq > 6000: active_color = 'blue'
        else: active_color = 'pink'

    generators = {
        'white': generate_white_noise,
        'pink': generate_pink_noise,
        'brown': generate_brown_noise,
        'blue': generate_blue_noise,
        'violet': generate_violet_noise,
        'red': generate_red_noise,
        'rain': generate_rain,
        'ocean': generate_ocean,
        'chimes': generate_wind_chimes
    }
    if active_color not in generators:
        raise ValueError(f"Unknown noise color: {color}. Choose: white, pink, brown, blue, violet, red, rain, ocean, chimes")
    
    if active_color == 'chimes':
        noise = generators[active_color](n_samples, sample_rate, target_freq)
    else:
        noise = generators[active_color](n_samples, sample_rate)
        
    return noise / (np.max(np.abs(noise)) + 1e-10)

def apply_notch(signal, center_freq, width_octaves, sample_rate):
    """Apply a bandstop (notch) filter around center_freq."""
    half = width_octaves / 2.0
    low = center_freq * (2.0 ** (-half))
    high = center_freq * (2.0 ** half)
    low = max(low, 20)
    high = min(high, sample_rate / 2 - 1)
    if low >= high:
        print(f"Warning: Notch range [{low:.1f}, {high:.1f}] Hz is invalid for {center_freq} Hz. Using default broadband noise.")
        return signal

    # Increasing order to 8 for a steeper 'medical-grade' notch transition.
    # This ensures less energy is removed from the non-target frequencies.
    sos = butter(8, [low, high], btype='bandstop', fs=sample_rate, output='sos')
    return sosfilt(sos, signal)

def generate_cr_sequence(base_freq, duration, sample_rate):
    """Tass (2012) protocol: 4 tones, 1.5Hz rate, 3 cycles on, 2 off."""
    freqs = [base_freq * r for r in [0.77, 0.90, 1.10, 1.32]]
    tone_dur, cycle_per = 0.120, 0.666
    n_samples = int(sample_rate * duration)
    signal = np.zeros(n_samples)
    s_per_cycle = int(sample_rate * cycle_per)
    s_per_tone = int(sample_rate * tone_dur)
    fade = int(sample_rate * 0.01)
    env = np.ones(s_per_tone)
    env[:fade], env[-fade:] = np.linspace(0,1,fade), np.linspace(1,0,fade)
    
    cycle_idx, t_idx = 0, 0
    while t_idx + s_per_cycle < n_samples:
        if (cycle_idx % 5) < 3:
            seq = freqs[:]
            np.random.shuffle(seq)
            for i in range(4):
                f = seq[i]
                start = t_idx + i * s_per_tone
                end = start + s_per_tone
                t = np.linspace(0, tone_dur, s_per_tone, endpoint=False)
                signal[start:end] = np.sin(2 * np.pi * f * t) * env
        t_idx += s_per_cycle
        cycle_idx += 1
    return signal

def generate_tone(freq, duration, sample_rate):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return 0.5 * np.sin(2 * np.pi * freq * t)

def normalize_and_convert(signal, bit_depth=16):
    """Standardize output to 0.5 peak for clinical safety and consistency."""
    peak = np.max(np.abs(signal)) + 1e-10
    # Apply a high-standard 0.5 peak normalization
    signal = signal / peak * 0.5
    if bit_depth == 16:
        return (signal * 32767).astype(np.int16)
    return signal

def main():
    parser = argparse.ArgumentParser(description='Tinnitus Therapy WAV Generator')
    parser.add_argument('--type', choices=['notch', 'decorrelated', 'tone', 'cr'],
                        required=True, help='Therapy type')
    parser.add_argument('--freq', type=float, default=6000,
                        help='Center/tone frequency in Hz (default: 6000)')
    parser.add_argument('--color', choices=['white', 'pink', 'brown', 'blue', 'violet', 'red', 'rain', 'ocean', 'chimes', 'auto'], default='auto',
                        help='Noise color (default: auto). Auto-calibrates to your tinnitus frequency.')
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

    elif args.type == 'cr':
        mono = generate_cr_sequence(args.freq, args.duration, sr)
        stereo = np.column_stack([mono, mono])
        label = f"cr_tones_{int(args.freq)}Hz"
        print(f"Generated {args.duration}s CR neuromodulation sequence")

    elif args.type == 'notch':
        noise = generate_noise(args.color, n_samples, sr, args.freq)
        filtered = apply_notch(noise, args.freq, args.notch_width, sr)
        stereo = np.column_stack([filtered, filtered])
        label = f"notch_{args.color}_{int(args.freq)}Hz_{args.notch_width}oct"
        print(f"Generated {args.duration}s {args.color} noise with "
              f"{args.notch_width}-octave notch at {args.freq} Hz")

    elif args.type == 'decorrelated':
        left = generate_noise(args.color, n_samples, sr, args.freq)
        right = generate_noise(args.color, n_samples, sr, args.freq)
        stereo = np.column_stack([left, right])
        label = f"decorrelated_{args.color}"
        print(f"Generated {args.duration}s decorrelated {args.color} noise")

    stereo_16 = normalize_and_convert(stereo)
    filename = args.output or f"therapy_{label}_{int(args.duration)}s.wav"
    
    # Security check: Ensure the output filename is safe and restricted to current directory
    safe_filename = os.path.basename(filename)
    if args.output and filename != safe_filename:
        print(f"Security Warning: Output path sanitized to {safe_filename}")
        filename = safe_filename

    wavfile.write(filename, sr, stereo_16)
    print(f"Saved: {filename} ({sr} Hz, 16-bit stereo)")

if __name__ == '__main__':
    main()
