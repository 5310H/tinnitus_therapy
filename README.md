# Trahreg Tinnitus Therapy Suite  
Open‑source, browser‑based sound therapy tools for tinnitus research and experimentation.

## Executive Abstract
The Trahreg Tinnitus Therapy Suite is a research-oriented platform providing evidence-based auditory stimulation tools implemented entirely in-browser. By leveraging high-precision DSP and client-side AI, the suite enables users and clinicians to explore personalized habituation protocols including Notch Therapy, Acoustic CR, and Bimodal Neuromodulation.

**Official Clinical Access:** [https://tinnitus.trahreg.com](https://tinnitus.trahreg.com)

This project features a high-precision engine that supports internal noise generators, custom media uploads, live system audio capture, and advanced AI-powered features using Google Gemini.


---

## 🎧 Therapy Modes

### **1. Decorrelated Noise Therapy**
Left/right decorrelated broadband noise designed to reduce auditory synchrony. Supports independent L/R processing for internal noise, nature sounds, and custom media.

### **2. Notch Therapy**
Broadband noise with a narrow frequency band removed around the user’s tinnitus pitch. Users can process built-in noise, local files, or live streams from other applications.

### **3. Dual‑Stimulus Neuromodulation (Sound & Haptics) [Work in Progress]**
An experimental implementation of bimodal sensory pairing, similar to the method used by the **Lenire** device. Based on publicly available research (e.g., TENT-A, 2020).
Includes:
- Carrier tones  
- Frequency‑shaped noise  
- Amplitude‑modulated noise  
- Tone‑burst patterns  

⚠️ No electrical stimulation is included.  
This is an experimental tool for educational exploration of bimodal sensory integration.

### **4. Broadband Sound Therapy**
White, pink, brown, blue, and violet noise and nature‑style soundscapes for masking and habituation.

### **5. Acoustic Coordinated Reset (CR)**
Pseudo-random sequences of four tones relative to tinnitus pitch (Tass, 2012) designed to desynchronize neural clusters.

### **6. Binaural Beat Entrainment**
Uses frequency offsets to induce specific brainwave states for relaxation, focus, or sleep.

- **Real-time Visualizer:** Dynamic display of dual waveforms and Lissajous patterns to visualize the binaural beat and phase relationship.
### **7. CBT & Wellness**
Psychological tools for tinnitus habituation, including:
- **Tinnitus Handicap Inventory (THI):** Clinically validated impact tracking.
- **Cognitive Restructuring:** Interactive thought records to reframe negative reactions.
- **Relaxation Training:** Guided Progressive Muscle Relaxation (PMR) and breathing pacers.
- **Cognitive Restructuring:** Interactive thought records to reframe negative reactions, now enhanced with AI-powered "Balanced Thought" suggestions.

### **8. Personalized Recommendations**
Algorithmically generated therapy suggestions based on current THI (distress) and MML (loudness) assessments.

### **9. AI-Powered Features (Google Gemini)**
Leveraging Google Gemini for enhanced therapeutic support and insights. All AI processing is performed client-side, with anonymized data, ensuring your privacy:
- **"Spike" De-escalator:** Immediate CBT reframing and coping strategies during tinnitus spikes.
- **Adaptive Soundscape Designer:** AI-suggested "Sound Recipes" based on your tinnitus description (e.g., "high-pitched hiss" -> "Brown Noise with Crickets").
- **Intelligent Log Correlation:** Identifies non-obvious patterns and triggers from your local usage data (e.g., "distress higher with less sleep").
- **TRT Educator:** Explains complex audiology concepts in simple, supportive language.
- **Clinical Report "Translator":** Generates professional summaries of your progress for audiologists.

### **10. Noise Generator (Python‑style)**
Simple broadband noise generator with adjustable parameters.

### **11. Interactive Walkthroughs & Professional Narrator (v2026.05.2)**
Every therapy module features a dedicated, step-by-step interactive tutorial to ensure clinical accuracy. (v2026.05.4)
- **Professional Male Narrator:** High-quality neural voice synthesis provides audio guidance for all tutorial steps.
- **Visual Guidance:** Real-time highlighting of UI elements during the setup process.

---

## 🎵 Flexible Audio Sources
All therapy modules now support three primary input methods:
- **Internal Generators:** Calibrated white, pink, and brown noise.
- **Custom Files:** Upload your own relaxing music or nature soundscapes from your device.
- **Live System Audio:** Capture audio from other tabs (Spotify, YouTube) or applications to process them through the therapy engine in real-time.

## 📊 Clinical Validation & Reporting
The suite includes an automated validation engine to ensure therapy integrity:
- **Active Hardware Protection (v2026.06.3):** Real-time RMS limiter and DC-offset blocker to prevent clipping and protect headphone transducers.
- **Clinical Spectral Stability:** All noise colors (Pink, Brown, Red, Rain) include integrated 20Hz high-pass filters to remove sub-sonic drift.
- **Real-time DSP Checks:** Verifies notch depth (target >40dB) and frequency alignment.
- **Automated Audio Watchdog:** Background observer that detects and recovers from audio stalls, browser-induced suspensions, or digital filter crashes (NaN/DC Saturation).
- **Detailed Clinical Export:** Generates reports including THI/Distress history, Minimum Masking Levels (MML), Loudness Growth (LG) data, and Residual Inhibition (RI) results.
- **Actionable Recommendations:** Provides automated troubleshooting for common system issues (e.g., detecting "Shallow Notch" errors caused by browser audio enhancers).
 
## 📖 User Documentation
### **Comprehensive User Manual (v2026.06.1)**
The suite includes a dynamic PDF generation engine (accessible under Settings) that compiles all module documentation into a single, printable reference guide (v2026.06.3). The manual includes:
- **Getting Started:** Quick Start Guide, Clinical Protocols, and the "Path to Relief" workflow.
- **Detailed Protocols:** In-depth setup for the "Mixing Point," 24/7 Enrichment, and lateral inhibition strategies.
- **Therapy Modules:** Technical documentation for Notch, CR, Dual-Stimulus, Sound, Binaural, and Decorrelated therapies.
- **Diagnostic Methodology:** How to use and interpret the Notch Finder, TMC, Loudness Growth, and RI Suppression tests.
- **Wellness Tools:** Instructions for CBT Thought Records, THI Assessments, and Progressive Muscle Relaxation.
- **AI Features Overview:** Explanation of AI-powered tools and the user-provided API key requirement.
- **Support Tools:** Documentation for Frequency Sweeps, Audio Level Metering, and Hearing Range tests.
- **Clinical Resources:** Professional Summary for Doctors, Project Overview Presentation, and Printable Staff Handouts.
- **System Infrastructure:** Audio Level Metering, System Validation logs, and Research Principles.
- **Technical Appendix:** Python Noise Generator documentation and offline usage guides.
- **Safety & Legal:** Full project disclaimer and usage warnings.

## 🎨 User Experience & Accessibility
- **Professional Aesthetic:** Refined UI with a medical-grade visual style and subtle depth.
- **Customization:** Support for Dark/Light themes and a high-density "Compact Mode."
- **Narrator Controls:** Integrated speed and volume adjustments for the tutorial voice.

## 👂 Hearing Health & Monitoring
Regular monitoring of your hearing thresholds is a vital part of long-term tinnitus management:
- **The Connection:** Tinnitus is often a response to auditory deprivation. Identifying shifts in your hearing can help you adjust therapy parameters for maximum efficacy.
- **Audibility Exploration:** Use the built-in **Hearing Test** tool to check your thresholds across the spectrum (20Hz to 20kHz).
- **Safety Protocol:** These tools are for self-tracking and exploration only. They do not replace a clinical audiogram from a licensed professional.

---

## 🛠 Tools

### **Notch Finder**
Helps users identify their tinnitus frequency.

### **Two‑Tone Comparison**
Allows A/B comparison of two tones for pitch matching.

### **Frequency Sweep**
Plays a sweep from low to high frequencies for hearing range testing.

### **Tinnitus Masking Curve (TMC)**
Maps Minimum Masking Levels across frequencies to identify auditory filter sharpness (Q-factor).

### **Loudness Growth (LG)**
Evaluates hyperacusis by mapping subjective loudness against objective volume increments.

### **Suppression Test (RI)**
Measures the duration of Residual Inhibition (temporary silence) after sound stimulation.

### **Hearing Profile (Audiogram)**
Enables users to enter professional audiogram results (0–110dB HL) to trigger the **Half‑Gain Rule** auto‑compensation logic across all therapy modules.

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

## 🛠 Development & Releases

This project uses a monthly versioning strategy. To create a new monthly snapshot:

1. **Sync & Release (One-Click Setup):**
   - **Sidebar Icon:** Drag the **NPM SCRIPTS** section from the Explorer to the far-left Activity Bar to create a dedicated release icon.
   - **Action:** Click the "Play" button next to `release`.
   - **Terminal:** Run `npm run release`.
   - **Automation:** This runs `sync-version.js` with safety audits and a push confirmation.

2. **Commit:** `git add . && git commit -m "Release vYYYY.MM.DD"`
3. **Tag:** Create an annotated Git tag:
   ```bash
   git tag -a v2026.07.01 -m "Monthly release description"
   ```
4. **Push:** `git push origin v2026.07.01`

Snapshots can be downloaded or viewed via the **Releases** tab on GitHub.

---

## � Offline Use

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

## 🛡️ Security & Privacy
This suite is designed with a "Privacy-First" architecture:
- **Local-Only Processing:** Audio DSP and therapy logs never leave your device.
- **Anonymized AI:** Data sent to Gemini is stripped of identifying markers.
- **Dependency Auditing:** Third-party libraries are periodically reviewed for vulnerabilities. Users are encouraged to run `npm audit` if installing via a node environment.

## � Third-Party Libraries & Credits
This project utilizes several open-source libraries:
- **Google Generative AI SDK:** For client-side AI insights.
- **html2pdf.js:** For clinical report generation.

## 📄 License
This project is licensed under the **GNU General Public License v3 (GPLv3)**. See the `LICENSE` file for details.