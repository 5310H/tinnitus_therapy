const TINNITUS_MANAGEMENT_GUIDE = `
    <h2 style="color:var(--accent); margin-bottom:10px;">The Five Golden Rules</h2>
    <ul style="padding-left:20px; margin-bottom:20px; line-height:1.6;">
        <li><b>Rule 1: The Mixing Point.</b> Set volume so therapy sound and tinnitus "mix." Do NOT mask the sound completely.</li>
        <li><b>Rule 2: Passive Listening.</b> Treat therapy like background music. Don't focus on it; go about your day.</li>
        <li><b>Rule 3: Consistency.</b> Neural changes take time. Aim for 30–60 minutes daily for 3 months.</li>
        <li><b>Rule 4: AI Support.</b> During high-stress "spikes," use the AI-powered CBT assistance for immediate reframing and coping strategies.</li>
        <li><b>Rule 5: Clinical Visibility.</b> Regularly export clinical reports to share objective progress and trends with your audiologist.</li>
    </ul>

    <h3 style="color:var(--accent); margin-bottom:10px;">Protocol for Success</h3>
    <p style="font-size:0.9rem; margin-bottom:10px;">Follow these steps to maximize therapeutic benefit:</p>
    <ol style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>Phase 1: Validation.</b> Run <b>System Validation</b> weekly. If your headphones are out of phase or the browser is "enhancing" audio, the therapy signal may be corrupted.</li>
        <li><b>Phase 2: Pitch Matching.</b> Spend time in the <b>Notch Finder</b>. Accuracy is critical; if your pitch match is off by more than 5%, Notch and CR therapies lose effectiveness.</li>
        <li><b>Phase 3: The Mixing Point.</b> Set therapy volume so it is slightly <i>lower</i> than your tinnitus. Total masking (hiding the sound) prevents habituation. Your brain must hear both to learn the tinnitus is "neutral."</li>
        <li><b>Phase 4: Passive Use.</b> Do not focus on the therapy sound. Read, work, or relax. The goal is for the sound to become "wallpaper."</li>
        <li><b>Phase 5: Insights & AI.</b> Review your "Personalized Insights" weekly. If you experience a spike, the AI de-escalator is your first line of defense. <i>(AI features require your own Gemini API key)</i></li>
        <li><b>Phase 6: Clinical Review.</b> Every 30 days, generate a Clinical PDF and review your long-term THI trends.</li>
    </ol>
    <h3 style="color:var(--accent); margin-bottom:10px;">Using the Help Systems</h3>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>The Guide:</b> Opens this panel for clinical protocols, the "Golden Rules," and general advice.</li>
        <li><b>AI Assistant:</b> Integrated into the CBT & Wellness module, providing real-time support, sound recipes, and pattern analysis. <i>(Requires user-provided Gemini API key)</i></li>
        <li><b>Interactive Tutorials:</b> Click the <b>Help</b> button and select "🎬 Start Tutorial" for a narrated, step-by-step walkthrough.</li>
        <li><b>User Manual:</b> A comprehensive, printable PDF manual is available via the <b>Help</b> button at the top of the screen.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">Hearing Health Monitoring</h3>
    <p style="font-size:0.9rem; margin-bottom:10px;">Changes in your hearing sensitivity can directly impact tinnitus perception. We recommend:</p>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>Regular Checks:</b> Use the <b>Hearing Profile (Audiogram)</b> tool bi-weekly to verify your audibility thresholds.</li>
        <li><b>Recalibration:</b> If your hearing shifts, revisit the <b>Notch Finder</b> to ensure your therapy remains precisely calibrated.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">Reporting & Documentation</h3>
    <p style="font-size:0.9rem; margin-bottom:10px;">The suite provides several ways to document your progress for professional review:</p>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>Global Progress Report:</b> A comprehensive PDF summary of all therapy logs, THI trends, and diagnostic results. Generate this from the <b>Help</b> hub.</li>
        <li><b>Doctor's Summary:</b> A specialized technical document explaining the suite's clinical protocols and scientific citations.</li>
        <li><b>Module Exports:</b> Individual diagnostic tools (TMC, LG, RI) allow exporting raw psychoacoustic data via the <b>Clinical Export (.txt)</b> buttons.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">Important Setup Tips</h3>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>Disable Enhancements:</b> Turn off Windows "Sonic," Dolby Atmos, or any "Bass Boost" settings in your OS or browser.</li>
        <li><b>Avoid Silence:</b> Use low-level broadband noise (Sound Therapy) in your environment even when not in a formal session to reduce the "contrast" of the tinnitus.</li>
        <li><b>Mental Health:</b> If a "spike" causes high distress, switch from Sound Therapy to <b>CBT & Wellness</b>. Managing the emotional reaction is as important as the sound itself.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">System Resilience</h3>
    <p style="font-size:0.9rem; margin-bottom:10px;">The suite includes an <b>Audio Watchdog</b> that monitors for stalls or browser-induced suspensions. If sound stops unexpectedly:</p>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li>Check the <b>Audio Status Indicator</b> in the top navigation bar.</li>
        <li>If it indicates "Suspended," simply interact with the page (click any button) to resume playback.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">Access & Updates</h3>
    <p style="font-size:0.9rem; margin-bottom:15px;">
        The latest version of this suite is always available at <a href="https://tinnitus.trahreg.com" style="color:var(--accent); text-decoration:underline;">tinnitus.trahreg.com</a>.
    </p>
`;

/**
 * populates the help modal with the provided page-specific content
 * merged with the universal tinnitus management guide.
 */
function populateHelpContent(helpHtml = '') {
    const contentEl = document.getElementById('helpContent');
    if (!contentEl) return;

    const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
    const manualPath = isDocs ? '../user_manual.html' : 'user_manual.html';

    let guide = TINNITUS_MANAGEMENT_GUIDE;
    const hearingTestPath = isDocs ? '../audiogram.html' : 'audiogram.html';
    guide = guide.replace('<b>Hearing Profile (Audiogram)</b>', `<a href="${hearingTestPath}" style="color:var(--accent); text-decoration:underline;">Hearing Profile (Audiogram)</a>`);

    // Sync manual references and versioning against clinical documentation
    guide = guide.replace('System Resilience', `System Resilience (v${APP_VERSION})`);
    guide = guide.replace(/User Manual/g, `<a href="${manualPath}" target="_blank" style="color:var(--accent); text-decoration:underline;">User Manual</a>`);
    guide = guide.replace(/Appendix E/g, `<a href="${manualPath}#app-e" target="_blank" style="color:var(--accent); text-decoration:underline;">Appendix E</a>`);

    contentEl.innerHTML = helpHtml + guide;
}

function initNav(helpHtml = '') {
    // Safety: Prevent multiple injections and ensure body exists for immediate calls
    if (!document.body) return;

    const existingNav = document.querySelector('.unified-nav');
    if (existingNav) {
        // If nav exists (e.g. initialized by the auto-hook), just update the content if provided
        if (helpHtml) populateHelpContent(helpHtml);
        return;
    }

    // Aggressively clean up all legacy back buttons/home links on the left side
    document.querySelectorAll('a.back, .back-btn').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
    });

    // Also find any legacy "Home" links specifically and hide them if they aren't part of our new nav
    document.querySelectorAll('a').forEach(a => {
        if (a.textContent.trim() === 'Home' && !a.closest('.unified-nav')) {
            a.style.display = 'none';
        }
    });

    const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
    const homePath = isDocs ? '../index.html' : 'index.html';

    // Robust path detection for Home button visibility
    const pathParts = window.location.pathname.split('/').filter(p => p !== '');
    const filename = pathParts.length > 0 ? pathParts[pathParts.length - 1].replace('.html', '').toLowerCase() : '';

    // isHome is true if we are on the dashboard (index.html or directory root) and not in the docs subfolder.
    const isHome = !isDocs && (filename === 'index' || filename === '' || window.location.pathname.endsWith('/'));

    const supportedTutorials = [
        'decorrelated', 'notch', 'cr', 'lenire', 'soundtherapy',
        'notchfinder', 'twotone', 'sweep', 'tmc', 'lg', 'hearingtest', 'audiogram', 'ri', 'validation', 'clinical_summary'
    ];
    const tutorialKey = supportedTutorials.includes(filename) ? filename : null;

    const navHTML = `
        <div class="unified-nav" style="position:fixed; top:1rem; left:1rem; right:1rem; display:flex; justify-content: space-between; z-index:99999; align-items: center; pointer-events: none;">
            <div id="navLeftGroup" style="display:flex; gap:10px; pointer-events: auto;">
                <a class="help-btn" href="${homePath}" onclick="try { sessionStorage.setItem('tts_splash_shown', 'true'); } catch(e) {}" style="position:static; right:auto; padding: 8px 12px; background: var(--success); color: white; border-color: var(--success); text-decoration: none; display: ${isHome ? 'none' : 'inline-flex'}; align-items: center; justify-content: center; font-weight: bold; border-width: 2px; box-shadow: 0 0 10px rgba(56, 142, 60, 0.4);">Home</a>
                <button class="help-btn" style="position:static; right:auto; padding: 8px 10px; border-color:var(--accent); color:var(--accent);" onclick="toggleTheme()" title="Toggle Dark/Light Mode">🌓</button>
            </div>
            <div id="navRightGroup" style="display:flex; gap:10px; align-items: center; pointer-events: auto;">
                <div id="audioStatusIndicator" style="font-size: 0.65rem; font-weight: bold; color: var(--text-dim); background: var(--card-bg); padding: 4px 10px; border-radius: 15px; border: 1px solid var(--border); display: none; white-space: nowrap;">○ Audio Off</div>
                <button class="help-btn" style="position:static; right:auto; background: var(--accent); color: white; border-color: var(--accent); font-weight: bold; box-shadow: 0 0 10px rgba(0, 191, 165, 0.3);" onclick="openHelp()">Help</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    const modalHTML = `
        <div id="helpModal" class="modal-overlay" style="z-index: 11000;">
            <div class="modal-card" style="max-width: 600px;">
                <h2 style="color:var(--accent); margin-top:0;">Help & Guidance</h2>

                <!-- System Status Hub -->
                <div id="systemStatusHub" style="display: flex; gap: 15px; margin-bottom: 20px; padding: 10px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); font-size: 0.75rem; justify-content: center; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span id="hubAudioStatusDot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-dim);"></span>
                        <span style="color: var(--text-dim);">Audio Engine:</span> <b id="hubAudioStatusText">Offline</b>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; border-left: 1px solid var(--border); padding-left: 15px;">
                        <span id="hubValidStatusDot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-dim);"></span>
                        <span style="color: var(--text-dim);">System Validation:</span> <b id="hubValidStatusText">Pending</b>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; border-left: 1px solid var(--border); padding-left: 15px;">
                        <span id="hubCompatStatusDot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--text-dim);"></span>
                        <span style="color: var(--text-dim);">Compatibility:</span> <b id="hubCompatStatusText">Pending</b>
                    </div>
                </div>

                <p class="info" style="margin-bottom: 15px;">Select a guide or tutorial to help you calibrate your therapy correctly.</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <button class="button" onclick="closeHelp(); startModuleTutorial('${tutorialKey || 'welcome'}')" style="margin:0; font-size:0.8rem; display: flex; align-items: center; justify-content: center; gap: 5px;">🎬 <span>Tutorial</span></button>
                    <button class="button" onclick="closeHelp(); showQuickStartGuide()" style="margin:0; font-size:0.8rem; display: flex; align-items: center; justify-content: center; gap: 5px;">🚀 <span>Quick Start</span></button>
                    <a href="${isDocs ? '../user_manual.html' : 'user_manual.html'}" target="_blank" class="button" style="margin:0; font-size:0.8rem; border-color:var(--success); color:var(--success); text-decoration:none; display: flex; align-items: center; justify-content: center; gap: 5px;">📄 <span>PDF Manual</span></a>
                    <button class="button" onclick="if(typeof generateGlobalClinicalReportPDF === 'function') { closeHelp(); generateGlobalClinicalReportPDF(); } else { alert('The PDF engine is not loaded on this specific utility page. Please return to the Dashboard or a Therapy module to generate your full report.'); }" style="margin:0; font-size:0.8rem; border-color:var(--accent); color:var(--accent); display: flex; align-items: center; justify-content: center; gap: 5px;">📊 <span>Global Report</span></button>
                    <button class="button" onclick="closeHelp(); window.location.href='${isDocs ? '../clinical_summary.html' : 'clinical_summary.html'}'" style="margin:0; font-size:0.8rem; border-color:var(--accent); color:var(--accent); display: flex; align-items: center; justify-content: center; gap: 5px;">🩺 <span>Doctor Summary</span></button>
                    <button class="button" onclick="closeHelp(); window.location.href='${isDocs ? '../feedback.html' : 'feedback.html'}'" style="margin:0; font-size:0.8rem; border-color:var(--accent); color:var(--accent); display: flex; align-items: center; justify-content: center; gap: 5px;">💬 <span>Feedback</span></button>
                </div>
                <hr style="border: 0; border-top: 1px dashed var(--border); margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <label for="languageSelect" style="font-size: 0.9rem; color: var(--text-dim);" data-i18n="select_language">Select Language:</label>
                    <select id="languageSelect" style="flex-grow: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); outline: none;">
                        <!-- Options will be populated by JavaScript -->
                    </select>
                </div>
                <hr style="border: 0; border-top: 1px dashed var(--border); margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                    <input type="text" id="helpSearch" placeholder="Search guide topics..." 
                        style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); outline: none; transition: border-color 0.2s;"
                        oninput="filterHelp(this.value)">
                </div>
                <div id="helpContent" style="font-size:0.95rem; line-height:1.6; margin:15px 0;"></div>
                <button onclick="closeHelp()" class="modal-close-btn">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Combine page-specific help with the universal guide
    // Populate language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect && typeof i18n !== 'undefined') {
        for (const code in i18n.availableLanguages) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = i18n.availableLanguages[code];
            languageSelect.appendChild(option);
        }
        languageSelect.value = i18n.currentLang; // Set initial selection
        languageSelect.addEventListener('change', (event) => {
            i18n.loadLanguage(event.target.value);
            document.getElementById('helpSearch').placeholder = i18n.getTranslation('search_guide_topics');
        });
    }

    populateHelpContent(helpHtml);
}

// Auto-initialization Hook for nav.js and i18n
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure i18n is initialized first to load the correct language
    if (typeof i18n !== 'undefined') {
        await i18n.init();
    }
    initNav();
    // Apply translations to any elements added by initNav
    if (typeof i18n !== 'undefined') i18n.applyTranslations();
});

/**
 * Displays the onboarding modal, guiding the user through initial setup steps.
 * This should be called from index.html on DOMContentLoaded if onboarding is not complete.
 */
window.showOnboardingModal = () => {
    let currentStep = parseInt(loadSetting('onboarding_step', '0'));
    const totalSteps = 6;
    const stepNames = ["Legal", "Safety", "Clinical", "Protocol", "Roadmap", "Finish"];

    const onboardingStepsContent = [
        // Step 0: Disclaimer (This is the first step the user sees if onboarding_step is 0)
        {
            title: "1. Legal Disclaimer (Mandatory)",
            content: `
                <p>Welcome to the Trahreg Tinnitus Therapy Suite.</p>
                <p>This tool is for research and education. It is <b>NOT</b> a medical device. Please read the <a href="disclaimer.html" target="_blank" style="color:var(--accent); text-decoration:underline;">full disclaimer</a>.</p>
                <p>By continuing, you acknowledge you understand and accept these terms.</p>
            `,
            buttons: `<button class="big-btn play-btn" onclick="setOnboardingStep(1); showOnboardingModal();">Accept & Continue</button>`
        },
        // Step 1: Hearing Aids Question (This is the step if onboarding_step is 1)
        {
            title: "2. Hearing Aid Safety (Mandatory)",
            content: `
                <p>⚠️ SAFETY CRITICAL: If you are wearing any type of hearing aid (physical or Bluetooth) while using this suite, our "Hearing Boost" feature must be disabled to prevent dangerously high sound levels.</p>
                <p>Please select your current setup:</p>
            `,
            buttons: `
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                    <div style="display:flex; gap:10px;">
                        <button class="big-btn play-btn" style="flex:1; margin-top:0;" onclick="saveSetting('wearing_hearing_aids', 'true'); setOnboardingStep(2); showOnboardingModal();">Yes, I am</button>
                        <button class="big-btn" style="flex:1; margin-top:0;" onclick="saveSetting('wearing_hearing_aids', 'false'); setOnboardingStep(2); showOnboardingModal();">No, just headphones</button>
                    </div>
                    <button class="button" style="width:100%; border-color:var(--text-dim); color:var(--text-dim);" onclick="setOnboardingStep(0); showOnboardingModal();">Back</button>
                </div>
            `
        },
        // Step 2: Audiogram Prompt (Optional, can be skipped)
        {
            title: "3. Hearing Profile (Optional)",
            content: `
                <p>Do you have an audiogram from a current professional hearing test?</p>
                <p>Entering your results allows the suite to automatically compensate for hearing loss using the <b>Half-Gain Rule</b>, reducing listening effort and improving therapy precision.</p>
            `,
            buttons: `
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                    <div style="display:flex; gap:10px;">
                        <a href="audiogram.html" class="big-btn play-btn" style="flex:1; margin-top:0; text-decoration:none;" onclick="setOnboardingStep(3);">Yes, Enter Now</a>
                        <a href="hearingtest.html" class="big-btn" style="flex:1; margin-top:0; text-decoration:none;" onclick="setOnboardingStep(3);">No, Start Test</a>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="button" style="flex:1; border-color:var(--text-dim); color:var(--text-dim);" onclick="setOnboardingStep(1); showOnboardingModal();">Back</button>
                        <button class="button" style="flex:1; border-color:var(--text-dim); color:var(--text-dim);" onclick="setOnboardingStep(3); showOnboardingModal();">Skip</button>
                    </div>
                </div>
            `
        },
        // Step 3: Success Protocol
        {
            title: "4. The Protocol for Success",
            content: `
                <p>To maximize your therapeutic benefit, please keep these <b>"Golden Rules"</b> in mind:</p>
                <ul style="padding-left:20px; font-size:0.9rem; line-height: 1.5;">
                    <li><b>The Mixing Point:</b> Adjust volume so noise and tinnitus "mix". Never mask it completely.</li>
                    <li><b>Passive Listening:</b> Treat therapy like background wallpaper. Don't focus on it.</li>
                    <li><b>Consistency:</b> Habituation is a slow journey. Aim for 30–60 minutes daily.</li>
                </ul>
            `,
            buttons: `
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                    <div style="display:flex; gap:10px;">
                        <button class="big-btn play-btn" style="flex:1; margin-top:0;" onclick="saveSetting('quick_start_viewed', 'true'); setOnboardingStep(4); showQuickStartGuide(); closeOnboardingModal();">View Full Guide</button>
                        <button class="big-btn" style="flex:1; margin-top:0;" onclick="setOnboardingStep(4); showOnboardingModal();">Continue</button>
                    </div>
                    <button class="button" style="width:100%; border-color:var(--text-dim); color:var(--text-dim);" onclick="setOnboardingStep(2); showOnboardingModal();">Back</button>
                </div>
            `
        },
        // Step 4: Roadmap to Relief
        {
            title: "5. Your Roadmap to Relief",
            content: `
                <p>Once you start, look for the <b>"Path to Relief"</b> card at the top of your dashboard. This is your roadmap for the first few weeks.</p>
                <div style="margin-top: 15px; padding: 12px; background: rgba(0, 191, 165, 0.1); border-radius: 8px; font-size: 0.9rem;">
                    <b>Your First Clinical Task:</b> Establish your baseline score by taking the <b>THI Assessment</b> in the "CBT & Wellness" module.
                </div>
            `,
            buttons: `
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                    <button class="big-btn play-btn" onclick="setOnboardingStep(5); showOnboardingModal();">Understood</button>
                    <button class="button" style="width:100%; border-color:var(--text-dim); color:var(--text-dim);" onclick="setOnboardingStep(3); showOnboardingModal();">Back</button>
                </div>
            `
        },
        // Step 5: Onboarding Complete
        {
            title: "6. Setup Complete!",
            content: `
                <p>You are ready. Access all therapy modules via the dashboard. Tutorials and the manual are always available in the <b>Help</b> hub.</p>
                <div style="margin-top: 20px; padding: 15px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border);">
                    <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 0.9rem; line-height: 1.4;">
                        <input type="checkbox" id="goldenRulesCheck" style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;" onchange="const btn = document.getElementById('finalStartBtn'); if(btn) btn.style.display = this.checked ? 'block' : 'none';">
                        <span>I have read the <b>Golden Rules</b> and understand the mixing point protocol for safe habituation.</span>
                    </label>
                </div>
            `,
            buttons: `
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                    <button id="finalStartBtn" class="big-btn play-btn" style="display: none; margin-top: 0;" onclick="finishOnboarding();">Start Therapy</button>
                    <button class="button" style="width:100%; border-color:var(--text-dim); color:var(--text-dim);" onclick="setOnboardingStep(4); showOnboardingModal();">Back</button>
                </div>
            `
        }
    ];

    if (currentStep >= totalSteps) {
        console.log("TTS: Onboarding already complete.");
        return; // Onboarding already done
    }

    const stepData = onboardingStepsContent[currentStep];
    if (!stepData) {
        console.error("TTS: Invalid onboarding step data for step index:", currentStep);
        return;
    }

    const progressHTML = stepNames.map((name, i) => `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.75rem; color: ${i === currentStep ? 'var(--accent)' : (i < currentStep ? 'var(--success)' : 'var(--text-dim)')}; font-weight: ${i === currentStep ? 'bold' : 'normal'}">
            <span style="width: 16px; height: 16px; border-radius: 50%; border: 1px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: 0.6rem;">${i < currentStep ? '✓' : i + 1}</span>
            <span>${name}</span>
        </div>
    `).join('');

    const modalHTML = `
        <div id="onboardingModal" class="modal-overlay" style="display:block;">
            <div class="modal-card">
                <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 15px;">
                    <p style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold;">Initial Setup Progress</p>
                    ${progressHTML}
                </div>
                <h2 style="color:var(--accent); margin-top:0;">${stepData.title}</h2>
                <div style="margin: 20px 0; line-height:1.6; font-size:0.95rem; min-height: 80px;">${stepData.content}</div>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:20px;">
                    ${stepData.buttons}
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('onboardingModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    toggleUIInteraction(true); // Disable background UI
};

window.closeOnboardingModal = () => {
    const el = document.getElementById('onboardingModal');
    if (el) el.remove();
    toggleUIInteraction(false); // Re-enable UI
};

/**
 * Updates the system status indicators inside the help hub modal.
 */
window.updateHubStatus = () => {
    const audioDot = document.getElementById('hubAudioStatusDot');
    const audioText = document.getElementById('hubAudioStatusText');
    const validDot = document.getElementById('hubValidStatusDot');
    const validText = document.getElementById('hubValidStatusText');
    const compatDot = document.getElementById('hubCompatStatusDot');
    const compatText = document.getElementById('hubCompatStatusText');

    if (!audioDot || !audioText || !validDot || !validText || !compatDot || !compatText) return;

    // 1. Audio Engine Status
    const ctx = window.audioCtx;
    const state = ctx ? ctx.state : 'Offline';

    audioDot.style.background = state === 'running' ? 'var(--accent)' : (state === 'suspended' ? '#ff9800' : 'var(--text-dim)');
    audioText.textContent = state === 'running' ? 'Active' : (state === 'suspended' ? 'Suspended' : (state === 'closed' ? 'Closed' : 'Offline'));
    audioText.style.color = audioDot.style.background;

    // 2. Validation Status
    if (typeof getUnifiedValidationStatus === 'function') {
        const status = getUnifiedValidationStatus();
        if (status.isValid) {
            validDot.style.background = 'var(--success)';
            validText.textContent = 'Verified';
            validText.style.color = 'var(--success)';
        } else {
            validDot.style.background = '#ef5350';
            validText.textContent = 'Pending';
            validText.style.color = '#ef5350';
        }
    }

    // 3. Compatibility Status
    if (typeof SystemCompatibilityAudit !== 'undefined') {
        const compat = SystemCompatibilityAudit.check();
        const hasErrors = compat.errors.length > 0;
        const hasWarnings = compat.warnings.length > 0;

        compatDot.style.background = hasErrors ? '#ef5350' : (hasWarnings ? '#ff9800' : 'var(--success)');
        compatText.textContent = hasErrors ? 'Critical Error' : (hasWarnings ? 'Limited' : 'Compatible');
        compatText.style.color = compatDot.style.background;
        // Show details on hover for technical troubleshooting
        compatText.title = "Audit Details:\n" + [...compat.errors, ...compat.warnings].join('\n');
    }
};

window.openHelp = () => {
    document.getElementById("helpModal").style.display = "block";
    window.updateHubStatus();
};
window.closeHelp = () => {
    document.getElementById("helpModal").style.display = "none";
    // Reset search state on close to ensure the full guide is visible next time
    const searchInput = document.getElementById('helpSearch');
    if (searchInput) {
        searchInput.value = '';
        filterHelp('');
    }
};

/**
 * Filters the help content based on the search query.
 * Hides blocks that don't match and provides granular list-item filtering.
 */
window.filterHelp = (query) => {
    const term = query.toLowerCase().trim();
    const content = document.getElementById('helpContent');
    if (!content) return;

    const blocks = Array.from(content.children);
    blocks.forEach(block => {
        const text = block.textContent.toLowerCase();
        const isMatch = text.includes(term);
        block.style.display = isMatch ? '' : 'none';

        // If the block is a list, filter the individual items for better UX
        if (isMatch && (block.tagName === 'UL' || block.tagName === 'OL')) {
            block.querySelectorAll('li').forEach(li => {
                li.style.display = li.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        }
    });
};

window.showPreFlight = (onConfirm) => {
    if (loadSetting('skip_preflight', 'false') === 'true') {
        if (onConfirm) onConfirm();
        return;
    }
    const modalHTML = `
        <div id="preFlightModal" class="modal-overlay" style="display:block;">
            <div class="modal-card">
                <h2 style="color:var(--accent); margin-top:0;">Pre-Session Checklist</h2>
                <p class="info" style="margin-bottom:15px;">Maximize your therapeutic benefit by verifying these factors:</p>
                <ul style="padding-left:20px; margin-bottom:25px; line-height:1.7; font-size:0.95rem;">
                    <li><b>Hardware:</b> Are you using headphones? (Open-back preferred).</li>
                    <li><b>Audio Settings:</b> Are OS/Browser "Spatial" or "Enhancer" effects OFF?</li>
                    <li><b>Calibration:</b> Is volume set to the <b>Mixing Point</b> (blending with tinnitus)?</li>
                    <li><b>Passive Listening:</b> Are you ready for 30–60 mins of background sound?</li>
                </ul>
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9rem;">
                        <input type="checkbox" id="skipPreFlightCheck" style="width: 18px; height: 18px;">
                        <span>Don't show this again</span>
                    </label>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="preFlightStart" class="big-btn play-btn" style="margin-top:0; flex:2;">Confirm & Start</button>
                    <button onclick="closePreFlight()" class="button" style="margin-top:0; flex:1; border-color:var(--text-dim); color:var(--text-dim);">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    toggleUIInteraction(true); // Disable background UI while pre-flight is active
    document.getElementById('preFlightStart').onclick = () => {
        if (document.getElementById('skipPreFlightCheck').checked) {
            saveSetting('skip_preflight', 'true');
        }
        closePreFlight();
        // Attempt to resume the active AudioContext on user interaction
        if (window.audioCtx && window.audioCtx.state === 'suspended') {
            window.audioCtx.resume().then(() => {
                console.log("AudioContext resumed by user interaction.");
                if (onConfirm) onConfirm();
            }).catch(e => console.error("Error resuming AudioContext:", e));
        } else {
            if (onConfirm) onConfirm();
        }
    };
};
window.closePreFlight = () => {
    const el = document.getElementById('preFlightModal');
    if (el) el.remove();
    toggleUIInteraction(false); // Re-enable UI after pre-flight is closed
};

/**
 * UI Utility: Locks or unlocks therapy controls.
 * Used during audio transition states (starting/stopping).
 */
window.toggleUIInteraction = (locked) => {
    const controls = document.querySelectorAll('.card input, .card select, .card .button, .card .sm-btn, .card .big-btn:not(#toggleBtn):not(#stopBtn)');
    controls.forEach(el => {
        if (locked) {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.5';
        } else {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        }
    });
};

// --- Global AudioContext State Observer ---
// This interceptor monitors the Web Audio engine status across all therapy modules.
(function () {
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!OriginalAudioContext) return;

    // Wrap the constructor to capture every context created in the suite.
    // We use a proper class extension to ensure instanceof checks remain valid.
    class ProxyContext extends OriginalAudioContext {
        constructor(...args) {
            super(...args);
            // Ensure the global reference always points to the most recently created context
            window.audioCtx = this;

            let watchdogInterval = null;

            const updateUI = () => {
                // Refresh Hub Status if the modal is currently visible
                if (typeof window.updateHubStatus === 'function') window.updateHubStatus();

                const el = document.getElementById('audioStatusIndicator');
                if (!el) return;

                const state = this.state;

                if (state === 'running') {
                    this._startWatchdog();
                }

                if (el) {
                    if (state === 'running' && this._expectingSoundVal) {
                        el.style.display = 'block';
                        el.innerHTML = '<span style="color: var(--accent)">●</span> Audio Active';
                        el.style.borderColor = 'var(--accent)';
                        el.title = "The audio engine is processing sound normally.";
                    } else {
                        el.style.display = 'none';
                    }
                }

                if (state === 'suspended') {
                    if (!el) return;
                    el.style.display = 'block';
                    el.innerHTML = '<span style="color: #ff9800">●</span> Audio Suspended';
                    el.style.borderColor = '#ff9800';
                    el.title = "Audio is suspended by the browser. Interaction (like clicking Start) is required.";
                    this._stopWatchdog();

                    // Auto-recovery: If we expect sound but the browser suspended us, try to resume
                    if (this._expectingSoundVal && !this._isRecovering) {
                        console.warn("[AudioEngine] Context suspended while therapy active. Attempting auto-resume...");
                        this.resume().catch(() => { });
                    }
                } else if (state === 'closed') {
                    el.style.display = 'block';
                    el.innerHTML = '○ Audio Closed';
                    el.style.borderColor = 'var(--border)';
                    el.title = "The audio engine has been shut down.";
                    this._stopWatchdog();
                }
            };

            // Closure-safe reference to updateUI for the setter
            this._refreshUI = () => updateUI();

            // Automatically attach the high-precision generator to the context
            this.generator = new NoiseGenerator(this);
            this._isRecovering = false;
            this._expectingSoundVal = false;
            this._healthAnalyser = null;
            this._glitchCount = 0;
            this._peakDetected = 0;

            this._startWatchdog = () => {
                if (watchdogInterval) return;
                let lastTime = this.currentTime;
                let silenceCount = 0;
                let lastClockTime = performance.now();
                const silenceThreshold = 0.00001;
                const buffer = new Float32Array(128);

                watchdogInterval = setInterval(() => {
                    const state = this.state;
                    const time = this.currentTime;
                    const now = performance.now();

                    // 1. Clock Stall Check: Is the Web Audio clock actually moving?
                    if (state === 'running' && time === lastTime && lastTime > 0) {
                        console.warn("[Watchdog] Audio clock stall detected. Attempting recovery...");
                        this.resume().catch(e => { if (typeof logTherapyError === 'function') logTherapyError("Watchdog", e); });
                    }

                    // 2. Performance Glitch Detection: Has the clock drifted from real-time?
                    if (state === 'running' && time > lastTime) {
                        const drift = Math.abs((now - lastClockTime) / 1000 - (time - lastTime));
                        if (drift > 0.1) this._glitchCount++; // Drift > 100ms indicates a frame dropout
                    }

                    // 3. Silence / Error Detection: Is the clock moving but the output is silent or invalid?
                    if (state === 'running' && this._expectingSound && this._healthAnalyser && time > lastTime) {
                        try {
                            this._healthAnalyser.getFloatTimeDomainData(buffer);
                            let sum = 0;
                            let dcSum = 0;
                            for (let i = 0; i < buffer.length; i++) {
                                sum += buffer[i] * buffer[i];
                                dcSum += buffer[i];
                            }
                            const rms = Math.sqrt(sum / buffer.length);
                            const dcOffset = dcSum / buffer.length;

                            // Peak / Clipping Detection
                            for (let i = 0; i < buffer.length; i++) {
                                const abs = Math.abs(buffer[i]);
                                if (abs > this._peakDetected) this._peakDetected = abs;
                            }
                            if (this._peakDetected > 0.98) console.warn("[Safety] Digital clipping detected in output graph.");
                            if (Math.abs(dcOffset) > 0.2) console.warn("[Safety] Significant DC offset detected. Check for unstable filters.");

                            // Catch silence OR NaN (NaN indicates a filter has exploded)
                            if (rms < silenceThreshold || isNaN(rms) || Math.abs(dcOffset) > 0.8) {
                                silenceCount++;
                                if (silenceCount >= 3) {
                                    const reason = isNaN(rms) ? 'Engine Crash (NaN)' : (Math.abs(dcOffset) > 0.8 ? 'DC Saturation' : 'Silence');
                                    console.warn(`[Watchdog] ${reason} detected. Triggering recovery...`);
                                    silenceCount = 0;
                                    this._isRecovering = true;

                                    // Hard reset state if NaN detected to clear the signal path, otherwise just resume.
                                    if (isNaN(rms)) this.suspend().then(() => this.resume()).catch(() => { });
                                    else this.resume().catch(() => { });

                                    // Telemetry: Report the failure to the host
                                    if (typeof sendClinicalTelemetry === 'function') {
                                        sendClinicalTelemetry('recovery_triggered', { module: window.location.pathname.split('/').pop() });
                                    }

                                    window.dispatchEvent(new CustomEvent('tts-audio-recovery-triggered', { detail: { context: this } }));
                                }
                            } else {
                                if (this._isRecovering) {
                                    this._isRecovering = false;
                                    window.dispatchEvent(new CustomEvent('tts-audio-recovered'));
                                }
                                silenceCount = 0;
                            }
                        } catch (e) { silenceCount = 0; }
                    }

                    lastTime = time;
                    lastClockTime = now;
                }, 3000);
            };

            this._stopWatchdog = () => {
                if (watchdogInterval) clearInterval(watchdogInterval);
                watchdogInterval = null;
            };

            this.addEventListener('statechange', updateUI);
            setTimeout(updateUI, 100);
        }

        get _expectingSound() { return this._expectingSoundVal; }
        set _expectingSound(val) {
            this._expectingSoundVal = val;
            if (typeof this._refreshUI === 'function') this._refreshUI();
        }
    }

    // Global listener for the recovery event to show UI feedback across all therapy modules
    window.addEventListener('tts-audio-recovery-triggered', () => {
        let el = document.getElementById('audioRecoveryNotice');
        if (!el) {
            el = document.createElement('div');
            el.id = 'audioRecoveryNotice';
            el.className = 'recovery-notification';
            document.body.appendChild(el);
        }
        el.textContent = '⚠️ Recovering Audio...';
        el.classList.remove('recovery-success');
        el.classList.remove('recovery-active');
        void el.offsetWidth; // Trigger reflow to allow re-triggering the animation
        el.classList.add('recovery-active');
    });

    window.addEventListener('tts-audio-recovered', () => {
        let el = document.getElementById('audioRecoveryNotice');
        if (!el) {
            el = document.createElement('div');
            el.id = 'audioRecoveryNotice';
            el.className = 'recovery-notification';
            document.body.appendChild(el);
        }
        el.textContent = '✅ Audio Restored';
        el.classList.add('recovery-success');
        el.classList.remove('recovery-active');
        void el.offsetWidth;
        el.classList.add('recovery-active');
    });

    window.AudioContext = window.webkitAudioContext = ProxyContext;
})();