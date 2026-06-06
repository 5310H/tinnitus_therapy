# Tinnitus Therapy Suite: Expanded & Prioritized Improvement Plan

## 1. User Experience & Accessibility (High Priority)

- [x] **Onboarding:**
    - [x] Interactive onboarding wizard for new users
    - [x] Contextual tooltips and help overlays
- [ ] **Customization:**
    - [ ] Adjustable font size, contrast, and layout density
    - [x] Dark/Light/High-contrast themes (v2026.06.30)
- [ ] **Localization:**
    - [x] Multi-language support (start with Spanish, German, French) - Framework in progress (v2026.06.25)
    - Community translation platform integration
- [ ] **Narrator Options:**
    - Multiple voice choices (gender, accent, language)
    - Adjustable narrator speed and volume

## 2. Therapy & Tools (High Priority)
- [ ] **Therapy Modes:**
    - [ ] Add new neuromodulation protocols (e.g., amplitude-modulated tones, new CR variants)
    - [x] Expand sound therapy options (nature soundscapes, user-generated presets) (v2026.06.26)
    - [x] Interactive Soundboard UI for audiometry and calibration (v2026.06.30)
- [x] **Binaural Visualizer:** Implement real-time visual feedback for binaural beats.
- [x] **High-Velocity Clinical Tools:**
    - [x] Fast-Tap THI and Simplified AI-CBT Capture (v2026.06.30)
- [x] **Personalization:** (Enhanced in v2.5.0)
    - Save/load user therapy profiles and session history (Refined in v2.5.0)
    - Adaptive therapy suggestions based on user progress
- [ ] **Native Transition:**
    - Explore Flutter or React Native with C++ DSP core for background audio reliability
- [ ] **AI Features:**
    - Real-time feedback and adaptive adjustments
    - Enhanced AI log correlation and pattern detection
- [x] **Hardware Support:** (Refined in v2.5.0)
    - Add support for more haptic devices (Smartphone-based haptics refined in v2.5.0)
    - Modular hardware abstraction layer
    - [x] Active Hardware Protection: RMS Limiting and DC Blocking (v2026.06.22)

## 3. Clinical & Research Features (Medium Priority)
- [ ] **Data Export/Import:**
    - [x] Export clinical data to CSV for spreadsheet analysis
    - [x] Secure sharing with clinicians (Refined via PDF/Email v2026.06.24)
- [ ] **Progress Tracking:**
    - [x] Advanced charts, trends, and milestone tracking (v2026.06.24)
    - [x] Enhanced clinical reporting features (v2.5.0)
    - [x] Automated reminders for hearing tests and therapy sessions (v2026.06.24)
    - [ ] Expand research summaries and clinical explanations
    - [ ] Interactive educational modules

## 4. Technical & Performance (Medium Priority)
- [ ] **DSP Optimization:**
    - [x] **WebAssembly (WASM) Migration:** All core noise loops (White, Pink, Brown, Red, Blue, Violet, Nature, Chimes) migrated to WASM. (v2026.06.22)
    - [x] Lower latency, higher efficiency for real-time audio (v2026.06.24)
- [x] **System Resilience:**
    - [x] Audio Watchdog engine for automated stall recovery (v2026.06.22)
- [ ] **Offline/PWA:**
    - Background sync, push notifications, and install prompts
    - Enhanced offline diagnostics and troubleshooting
- [ ] **Compatibility:**
    - Broader browser/device testing (mobile, tablets, accessibility devices)
    - [x] Automated compatibility self-checks (v2026.06.24)

## 5. Security & Privacy (High Priority)
- [ ] **User Data Control:**
    - [x] Selective deletion of log entries (GDPR alignment)
    - [x] Integrated privacy dashboard UI (v2026.06.25)
- [x] **AI/ML Transparency & Insights:** (v2026.06.30)
    - User control over AI data usage (Global Kill-Switch)
    - [x] Integrated Clinical Insights & Technical Telemetry Hub (v2026.06.30)
- [x] **Dependency Auditing:** (v2026.06.25)
    - Automated and regular third-party library audits
    - [x] Security update notifications (v2026.06.25)

## 6. Documentation & Support (Medium Priority)
- [ ] **User Guides:**
    - Step-by-step documentation for all modules
    - Troubleshooting and FAQ sections
- [ ] **Tutorials:**
    - Video walkthroughs for key features
    - Interactive in-app tutorials
- [ ] **Community Support:**
    - Forum or Q&A platform for user discussions
    - Community-contributed tips and guides

## 7. Feedback & Community (Low Priority)
- [ ] **Feedback System:**
    - In-app feedback and feature request forms
    - Public roadmap and voting on features
- [ ] **Analytics:**
    - Opt-in anonymous usage analytics to guide development
    - Transparency on what is collected and why

---

**Legend:**
- High Priority: Critical for user safety, accessibility, or core experience
- Medium Priority: Important for clinical/research value and technical robustness
- Low Priority: Enhances community and long-term engagement

**Next Steps:**
1. Focus on accessibility, privacy, and therapy expansion first.
2. Parallelize technical and clinical improvements.
3. Build community and feedback systems as the user base grows.
