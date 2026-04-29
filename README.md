# Trahreg Tinnitus Therapy Suite  
Open‑source, browser‑based sound therapy tools for tinnitus research and experimentation.

This project provides research‑based sound therapy tools implemented entirely in the browser. It features a high-precision DSP engine that supports internal noise generators, custom media uploads, and live system audio capture.

---

## 🎧 Therapy Modes

### **1. Decorrelated Noise Therapy**
Left/right decorrelated broadband noise designed to reduce auditory synchrony. Supports independent L/R processing for internal noise, nature sounds, and custom media.

### **2. Notch Therapy**
Broadband noise with a narrow frequency band removed around the user’s tinnitus pitch. Users can process built-in noise, local files, or live streams from other applications.

### **3. Lenire‑Style Sound Therapy (Sound‑Only)**
A sound‑only implementation inspired by the auditory component of Lenire’s bimodal neuromodulation research.  
Includes:
- Carrier tones  
- Frequency‑shaped noise  
- Amplitude‑modulated noise  
- Tone‑burst patterns  

⚠️ No electrical stimulation is included.  
This is an experimental sound‑only tool based on publicly available research.

### **4. Broadband Sound Therapy**
White, pink, brown noise and nature‑style soundscapes for masking and habituation.

### **5. Noise Generator (Python‑style)**
Simple broadband noise generator with adjustable parameters.

---

## 🎵 Flexible Audio Sources
All therapy modules now support three primary input methods:
- **Internal Generators:** Calibrated white, pink, and brown noise.
- **Custom Files:** Upload your own relaxing music or nature soundscapes from your device.
- **Live System Audio:** Capture audio from other tabs (Spotify, YouTube) or applications to process them through the therapy engine in real-time.

## 📊 Clinical Validation & Reporting
The suite includes an automated validation engine to ensure therapy integrity:
- **Real-time DSP Checks:** Verifies notch depth (target >40dB) and frequency alignment.
- **Clinical Export:** Generates detailed reports including therapy parameters, the specific audio source used, and hardware calibration status.
- **Actionable Recommendations:** Provides automated troubleshooting for common system issues (e.g., detecting "Shallow Notch" errors caused by browser audio enhancers).
 
---

## 🛠 Tools

### **Notch Finder**
Helps users identify their tinnitus frequency.

### **Two‑Tone Comparison**
Allows A/B comparison of two tones for pitch matching.

### **Frequency Sweep**
Plays a sweep from low to high frequencies for hearing range testing.

### **Hearing Range Test**
Simple hearing threshold exploration (non‑clinical).

### **Spectrogram**
Real‑time visualization of audio frequencies.

### **Audio Level Meter**
Displays real‑time amplitude levels.

### **Feedback Tool**
Submit bug reports or feature requests via email or local file generation.

---

## 📚 Research Summary

### **Lenire (Bimodal Neuromodulation)**
Lenire combines:
- Sound stimulation  
- Mild electrical pulses to the tongue  

Research shows:
- Sound‑only stimulation can reduce tinnitus severity  
- Bimodal stimulation produces stronger effects in clinical trials  
- Benefits are more pronounced in moderate–severe tinnitus  

This project implements **only the sound component**.

### **Sound Therapy Approaches**
Common evidence‑supported methods include:
- Broadband noise (white/pink/brown)  
- Notch therapy  
- Decorrelated noise  
- Amplitude‑modulated noise  
- Tone‑based therapy  

These approaches are widely used in tinnitus management and research.

---

## 📦 Offline Use

The entire suite works **fully offline**.

To use the suite offline:
1. Download the project repository as a ZIP file.
2. Extract the contents to a local folder.
3. Open `index.html` in any modern web browser.

Additionally, the suite is a **Progressive Web App (PWA)**. Once loaded, you can install it via the "Tools" menu for a native-like offline experience.

---

## ⚠️ Disclaimer

This project is for **research, experimentation, and personal exploration only**.  
It is **not** a medical device and does not provide medical treatment.  
Consult a qualified professional for clinical tinnitus care.

---

## 📄 License
MIT License — free to use, modify, and distribute.