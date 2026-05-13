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
        <li><b>Phase 5: Insights & AI.</b> Review your "Personalized Insights" weekly. If you experience a spike, the AI de-escalator is your first line of defense.</li>
        <li><b>Phase 6: Clinical Review.</b> Every 30 days, generate a Clinical PDF and review your long-term THI trends.</li>
    </ol>
    <h3 style="color:var(--accent); margin-bottom:10px;">Using the Help Systems</h3>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>The Guide:</b> Opens this panel for clinical protocols, the "Golden Rules," and general advice.</li>
        <li><b>AI Assistant:</b> Integrated into the CBT & Wellness module, providing real-time support, sound recipes, and pattern analysis.</li>
        <li><b>Interactive Tutorials:</b> Click the "Tutorial" button on any therapy page for a narrated, step-by-step walkthrough of that specific tool's setup.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">Hearing Health Monitoring</h3>
    <p style="font-size:0.9rem; margin-bottom:10px;">Changes in your hearing sensitivity can directly impact tinnitus perception. We recommend:</p>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>Regular Checks:</b> Use the <b>Hearing Test</b> bi-weekly to verify your audibility thresholds.</li>
        <li><b>Recalibration:</b> If your hearing shifts, revisit the <b>Notch Finder</b> to ensure your therapy remains precisely calibrated.</li>
    </ul>
    <h3 style="color:var(--accent); margin-bottom:10px;">Important Setup Tips</h3>
    <ul style="padding-left:20px; margin-bottom:15px; font-size:0.9rem; line-height:1.4;">
        <li><b>Disable Enhancements:</b> Turn off Windows "Sonic," Dolby Atmos, or any "Bass Boost" settings in your OS or browser.</li>
        <li><b>Avoid Silence:</b> Use low-level broadband noise (Sound Therapy) in your environment even when not in a formal session to reduce the "contrast" of the tinnitus.</li>
        <li><b>Mental Health:</b> If a "spike" causes high distress, switch from Sound Therapy to <b>CBT & Wellness</b>. Managing the emotional reaction is as important as the sound itself.</li>
    </ul>
`;

function initNav(helpHtml) {
    const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
    const homePath = isDocs ? '../index.html' : 'index.html';
    
    // Auto-detect tutorial key from filename
    const filename = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase() || 'index';
    const supportedTutorials = [
        'decorrelated', 'notch', 'cr', 'lenire', 'soundtherapy', 
        'notchfinder', 'twotone', 'sweep', 'tmc', 'lg', 'hearingtest', 'ri', 'validation'
    ];
    const tutorialKey = supportedTutorials.includes(filename) ? filename : null;

    const navHTML = `
        <a class="back" href="${homePath}" style="color:var(--accent)">Home</a>
        <div style="position:fixed; top:1rem; right:1rem; display:flex; gap:10px; z-index:100; align-items: center;">
            <div id="audioStatusIndicator" style="font-size: 0.65rem; font-weight: bold; color: var(--text-dim); background: var(--card-bg); padding: 4px 10px; border-radius: 15px; border: 1px solid var(--border); display: none; white-space: nowrap;">○ Audio Off</div>
            <button class="help-btn" style="position:static; padding: 8px 10px; border-color:var(--accent); color:var(--accent);" onclick="toggleTheme()" title="Toggle Dark/Light Mode">🌓</button>
            <button class="help-btn" style="position:static; border-color:var(--accent); color:var(--accent);" onclick="startModuleTutorial(${tutorialKey ? `'${tutorialKey}'` : 'null'})">
                ${tutorialKey ? 'Tutorial' : 'Quick Start'}
            </button>
            <button class="help-btn" style="position:static; border-color:var(--accent); color:var(--accent);" onclick="openHelp()">Guide</button>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    const modalHTML = `
        <div id="helpModal" class="modal-overlay">
            <div class="modal-card">
                <h2 style="color:var(--accent); margin-top:0;">Help & Guidance</h2>
                <div id="helpContent" style="font-size:0.95rem; line-height:1.6; margin:15px 0;"></div>
                <button onclick="closeHelp()" class="modal-close-btn">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Combine page-specific help with the universal guide
    let guide = TINNITUS_MANAGEMENT_GUIDE;
    const hearingTestPath = isDocs ? '../hearingtest.html' : 'hearingtest.html';
    guide = guide.replace('<b>Hearing Test</b>', `<a href="${hearingTestPath}" style="color:var(--accent); text-decoration:underline;">Hearing Test</a>`);
    document.getElementById('helpContent').innerHTML = (helpHtml || '') + guide;
}
window.openHelp = () => document.getElementById("helpModal").style.display = "block";
window.closeHelp = () => document.getElementById("helpModal").style.display = "none";

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
    document.getElementById('preFlightStart').onclick = () => { 
        if (document.getElementById('skipPreFlightCheck').checked) {
            saveSetting('skip_preflight', 'true');
        }
        closePreFlight(); 
        if(onConfirm) onConfirm(); 
    };
};
window.closePreFlight = () => { const el = document.getElementById('preFlightModal'); if(el) el.remove(); };

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
(function() {
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!OriginalAudioContext) return;

    // Wrap the constructor to capture every context created in the suite
    const ProxyContext = function(...args) {
        const ctx = new OriginalAudioContext(...args);
        let watchdogInterval = null;

        // Apply preferred output device (Sink ID) if supported
        const applyOutputSink = async () => {
            if (ctx.setSinkId) {
                const sinkId = localStorage.getItem('tts_preferred_output_device') || '';
                if (sinkId) {
                    ctx.setSinkId(sinkId).catch(e => console.warn("[Routing] Sink error:", e));
                }
            }
        };

        const updateUI = () => {
            const el = document.getElementById('audioStatusIndicator');
            if (!el) return;
            
            el.style.display = 'block';
            const state = ctx.state;
            
            if (state === 'running') {
                el.innerHTML = '<span style="color: var(--accent)">●</span> Audio Active';
                el.style.borderColor = 'var(--accent)';
                el.title = "The audio engine is processing sound normally.";
                applyOutputSink();
                startWatchdog();
            } else if (state === 'suspended') {
                el.innerHTML = '<span style="color: #ff9800">●</span> Audio Suspended';
                el.style.borderColor = '#ff9800';
                el.title = "Audio is suspended by the browser. Interaction (like clicking Start) is required.";
                stopWatchdog();
            } else if (state === 'closed') {
                el.innerHTML = '○ Audio Closed';
                el.style.borderColor = 'var(--border)';
                el.title = "The audio engine has been shut down.";
                stopWatchdog();
            }
        };

        const startWatchdog = () => {
            if (watchdogInterval) return;
            let lastTime = ctx.currentTime;
            watchdogInterval = setInterval(() => {
                // If context is running but the clock isn't moving, the thread has stalled
                if (ctx.state === 'running' && ctx.currentTime === lastTime && lastTime > 0) {
                    console.warn("[Watchdog] Audio clock stall detected. Attempting recovery...");
                    ctx.resume().catch(e => { if(typeof logTherapyError === 'function') logTherapyError("Watchdog", e); });
                }
                lastTime = ctx.currentTime;
            }, 3000);
        };

        const stopWatchdog = () => {
            if (watchdogInterval) clearInterval(watchdogInterval);
            watchdogInterval = null;
        };

        ctx.addEventListener('statechange', updateUI);
        setTimeout(updateUI, 100);
        
        return ctx;
    };

    ProxyContext.prototype = OriginalAudioContext.prototype;
    window.AudioContext = window.webkitAudioContext = ProxyContext;
})();