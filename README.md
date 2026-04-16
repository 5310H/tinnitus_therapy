# Tinnitus Therapy Tools

Open-source browser-based sound therapy applications for tinnitus relief.

**Live site:** [tinnitus.trahreg.com](https://tinnitus.trahreg.com)

## Tools

### Decorrelated Noise Therapy
Independent noise streams per ear with adjustable frequency bands centered on your tinnitus pitch. Designed to disrupt neural synchrony associated with tonal tinnitus.

### Notch Sound Therapy
Broadband sound with a precise spectral notch at your tinnitus frequency. Based on the tailor-made notched music therapy approach to reduce tinnitus-related cortical activity. Supports both generated noise and your own audio files.

### Python Generator
Command-line tool to generate therapy WAV files offline. Supports decorrelated noise, notch-filtered noise, and amplitude-modulated stimuli.

```bash
pip install numpy
python generator/generate.py decorrelated --freq 4000 --duration 1800 -o therapy.wav
```

## Features

- **No installation** - runs entirely in the browser via Web Audio API
- **No tracking** - no analytics, cookies, or data collection
- **Offline generation** - Python script for creating WAV files
- **Configurable** - center frequency, bandwidth, notch depth, session timers
- **Stereo visualization** - real-time frequency spectrum display

## Disclaimer

These tools are provided for informational and experimental purposes. They are not medical devices and do not replace professional audiological care. Always listen at comfortable volumes.

## License

MIT
