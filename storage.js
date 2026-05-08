// Shared script for Tinnitus Therapy Suite persistence
// Include this at the bottom of therapy pages to handle auto-save/load

const APP_VERSION = "1.5.4";

/** 
 * Helpers for consistent localStorage interaction
 */
const getTodayKey = () => new Date().toISOString().split('T')[0];
const getJson = (key, defaultVal = []) => {
    try {
        return JSON.parse(localStorage.getItem('tts_' + key)) || defaultVal;
    } catch (e) { return defaultVal; }
};
const setJson = (key, val) => localStorage.setItem('tts_' + key, JSON.stringify(val));

// Pre-fetch system voices to ensure they are indexed by the browser for the narrator
if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.getVoices();
}

/**
 * Helper to get the most recent entry from a date-keyed log object.
 */
function getLatestLogData(key) {
    const log = getJson(key, {});
    const dates = Object.keys(log).sort((a, b) => new Date(b) - new Date(a));
    if (dates.length === 0) return null;
    return { date: dates[0], data: log[dates[0]] };
}

/**
 * Retrieves a unified validation status object covering engine, phase, and DSP tests.
 */
function getUnifiedValidationStatus() {
    const engineResults = loadSetting('engine_validation_results', 'Not Performed');
    const phaseStatus = loadSetting('phase_status', 'Not Verified');
    const dspStatus = window.lastValidationStatus || 'Not Performed';
    const lastValidationDate = loadSetting('last_validation_date', null);

    const recommendations = [];
    let isValid = true;

    // Check expiration (30 days)
    if (lastValidationDate) {
        const diff = Date.now() - new Date(lastValidationDate).getTime();
        if (diff > (30 * 24 * 60 * 60 * 1000)) {
            isValid = false;
            recommendations.push("- Your system validation has expired (older than 30 days). Please re-run System Validation.");
        }
    } else {
        isValid = false;
    }

    if (engineResults === 'Not Performed' || engineResults.includes('[FAIL]')) {
        isValid = false;
        recommendations.push("- Automated Engine Validation is missing or failed. Please run the 'System Validation' tool on the home page.");
    }
    
    if (phaseStatus === 'Not Verified') {
        isValid = false;
        recommendations.push("- Hardware Phase is unverified. Use the 'Phase Test' in System Validation to confirm headphone wiring.");
    } else if (phaseStatus.includes('Error')) {
        isValid = false;
        recommendations.push("- Phase error detected. Check for loose connections or virtual surround sound software.");
    }

    if (dspStatus.includes('FAIL')) {
        isValid = false;
        if (dspStatus.includes('Shallow Notch')) recommendations.push("- Shallow Notch failure: Clinical research targets >40dB attenuation. Disable any audio 'enhancer' or 'booster' browser extensions.");
        if (dspStatus.includes('Frequency Mismatch')) recommendations.push("- Frequency mismatch failure: Ensure your OS audio settings are set to 44.1kHz or 48kHz and restart your browser.");
        if (dspStatus.includes('Cross-over')) recommendations.push("- Filter Cross-over failure: The Low-Cut frequency must be lower than the High-Cut frequency. Adjust your filter sliders.");
    }

    return {
        engine: engineResults,
        phase: phaseStatus,
        dsp: dspStatus,
        isValid: isValid,
        lastDate: lastValidationDate,
        recommendations: recommendations
    };
}

function saveSetting(key, value, isJson = false) {
    localStorage.setItem('tts_' + key, value);
}

function loadSetting(key, defaultValue) {
    const saved = localStorage.getItem('tts_' + key);
    return saved !== null ? saved : defaultValue;
}

function exportAllData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('tts_')) {
            data[key] = localStorage.getItem(key);
        }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trahreg_tinnitus_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importAllData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Object.keys(data).forEach(key => {
                if (key.startsWith('tts_')) localStorage.setItem(key, data[key]);
            });
            alert("Data imported successfully. Reloading...");
            window.location.reload();
        } catch (err) {
            alert("Error importing data. Ensure the file is a valid backup.");
        }
    };
    reader.readAsText(file);
}

function getClinicalReportData(modeName, settingsObj, techSpecsObj = {}) {
    const validation = getUnifiedValidationStatus();
    const usage = getDailyUsage();

    // Consolidate latest data retrieval using the new helper
    const latestMML = getLatestLogData('mml_log');
    const mmlSummary = latestMML ? `Latest MML: ${latestMML.data.slice(-1)[0]}%` : "N/A";

    const latestLG = getLatestLogData('lg_log');
    const latestLGSummary = latestLG ? `Points: ${latestLG.data.length}` : "N/A";

    const latestQF = getLatestLogData('q_factor_log');
    const latestQFactor = latestQF ? latestQF.data : "N/A";

    const latestRI = getLatestLogData('ri_log');
    let riSummary = "N/A";
    if (latestRI) {
        riSummary = `Date: ${latestRI.date} | Suppression Results: ${latestRI.data.join('s, ')}s`;
    }

    const latestTHI = getLatestLogData('distress_log');
    const lastScore = latestTHI ? `${latestTHI.data}/100` : 'Not Performed';
    const lastTHIDateDisplay = latestTHI ? new Date(latestTHI.date).toLocaleDateString() : 'N/A';
    
    const thoughtRecords = getThoughtRecords();
    const thoughtRecordsCount = thoughtRecords.length;
    let recentThoughtSummary = "N/A";
    if (thoughtRecordsCount > 0) {
        const latest = thoughtRecords[thoughtRecordsCount - 1];
        recentThoughtSummary = `Date: ${new Date(latest.timestamp).toLocaleDateString()}\n`;
        recentThoughtSummary += `  - Situation: ${latest.situation}\n`;
        recentThoughtSummary += `  - Automatic Thought: ${latest.automaticThoughts}\n`;
        recentThoughtSummary += `  - Balanced Thought: ${latest.balancedThought}`;
    }
    const therapyRecs = getTherapyRecommendations();

    return {
        modeName,
        appVersion: APP_VERSION,
        exportDate: new Date().toLocaleString(),
        settings: settingsObj,
        techSpecs: techSpecsObj,
        usage: {
            todayMinutes: Math.round(usage)
        },
        psychological: {
            lastTHIScore: lastScore,
            lastTHIDate: lastTHIDateDisplay,
            thoughtRecordsCount: thoughtRecordsCount,
            recentThoughtSummary: recentThoughtSummary
        },
        recommendations: therapyRecs.status === 'complete' ? therapyRecs.recommendations : [],
        ri: {
            latestRIResult: riSummary
        },
        mml: {
            latestMMLResult: mmlSummary
        },
        lg: {
            latestLGTest: latestLGSummary
        },
        tmc: {
            latestQFactor: latestQFactor
        },
        systemStatus: {
            hardwarePhase: validation.phase,
            engineValidation: validation.engine,
            dspValidation: validation.dsp,
            actionableRecommendations: validation.recommendations
        }
    };
}

function generateClinicalReportText(reportData) {
    let text = `TRAHREG TINNITUS THERAPY SUITE - CLINICAL REPORT\n`;
    text += `App Version: ${reportData.appVersion}\n`;
    text += `Therapy Mode: ${reportData.modeName}\n`;
    text += `Export Date: ${reportData.exportDate}\n`;
    text += `-------------------------------------------\n`;
    
    text += `\nTHERAPY SETTINGS:\n`;
    for (const [label, value] of Object.entries(reportData.settings)) {
        text += `${label}: ${value}\n`;
    }

    if (Object.keys(reportData.techSpecs).length > 0) {
        text += `\nTECHNICAL SPECIFICATIONS:\n`;
        for (const [label, value] of Object.entries(reportData.techSpecs)) {
            text += `${label}: ${value}\n`;
        }
    }
    
    text += `\nUSAGE & STATUS:\n`;
    text += `Today's Usage: ${reportData.usage.todayMinutes} minutes\n`;

    text += `\nPSYCHOLOGICAL BASELINE (CBT):\n`;
    text += `Last THI Score: ${reportData.psychological.lastTHIScore}\n`;
    text += `Last THI Date: ${reportData.psychological.lastTHIDate}\n`;

    if (reportData.recommendations.length > 0) {
        text += `\nPERSONALIZED THERAPY SUGGESTIONS:\n`;
        reportData.recommendations.forEach(r => {
            text += `- ${r.mode}: ${r.reason}\n`;
        });
    }

    text += `Thought Records Logged: ${reportData.psychological.thoughtRecordsCount}\n`;
    text += `Most Recent Record:\n${reportData.psychological.recentThoughtSummary}\n`;

    text += `\nRESIDUAL INHIBITION (RI):\n`;
    text += `Latest RI Result: ${reportData.ri.latestRIResult}\n`;

    text += `\nMINIMUM MASKING LEVEL (MML):\n`;
    text += `Latest MML Result: ${reportData.mml.latestMMLResult}\n`;

    text += `\nLOUDNESS GROWTH (LG):\n`;
    text += `Latest LG Test: ${reportData.lg.latestLGTest}\n`;

    text += `\nTINNITUS MASKING CURVE (TMC):\n`;
    text += `Latest Q-factor: ${reportData.tmc.latestQFactor}\n`;

    text += `\nSYSTEM STATUS:\n`;
    text += `Hardware Phase Status: ${reportData.systemStatus.hardwarePhase}\n`;
    text += `\nAUTOMATED ENGINE VALIDATION:\n${reportData.systemStatus.engineValidation}\n`;
    
    if (reportData.systemStatus.dspValidation !== 'Not Performed') {
        text += `\nINTERNAL DSP VALIDATION:\nStatus: ${reportData.systemStatus.dspValidation}\n`;
    }

    if (reportData.systemStatus.actionableRecommendations.length > 0) {
        text += `\nACTIONABLE RECOMMENDATIONS:\n${reportData.systemStatus.actionableRecommendations.join('\n')}\n`;
    }

    text += `\n-------------------------------------------`;
    return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}

function generateClinicalReportHtml(reportData) {
    let html = `<div style="font-family: 'Segoe UI', sans-serif; color: #333; padding: 20px; max-width: 800px; margin: auto;">`;
    html += `<h1 style="color: #00bfa5; text-align: center;">TRAHREG TINNITUS THERAPY SUITE - CLINICAL REPORT</h1>`;
    html += `<p style="text-align: center; font-size: 0.9em; color: #666;">App Version: ${reportData.appVersion} | Therapy Mode: ${reportData.modeName} | Export Date: ${reportData.exportDate}</p>`;
    html += `<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">`;

    html += `<h2 style="color: #00bfa5;">THERAPY SETTINGS</h2>`;
    html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
    for (const [label, value] of Object.entries(reportData.settings)) {
        html += `<tr><td style="padding: 5px 0; border-bottom: 1px dashed #eee; width: 40%;">${label}</td><td style="padding: 5px 0; border-bottom: 1px dashed #eee;">${value}</td></tr>`;
    }
    html += `</table>`;

    if (Object.keys(reportData.techSpecs).length > 0) {
        html += `<h2 style="color: #00bfa5;">TECHNICAL SPECIFICATIONS</h2>`;
        html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">`;
        for (const [label, value] of Object.entries(reportData.techSpecs)) {
            html += `<tr><td style="padding: 5px 0; border-bottom: 1px dashed #eee; width: 40%;">${label}</td><td style="padding: 5px 0; border-bottom: 1px dashed #eee;">${value}</td></tr>`;
        }
        html += `</table>`;
    }

    html += `<h2 style="color: #00bfa5;">USAGE & STATUS</h2>`;
    html += `<p><strong>Today's Usage:</strong> ${reportData.usage.todayMinutes} minutes</p>`;

    html += `<h2 style="color: #00bfa5;">PSYCHOLOGICAL BASELINE (CBT)</h2>`;
    html += `<p><strong>Last THI Score:</strong> ${reportData.psychological.lastTHIScore}</p>`;
    html += `<p><strong>Last THI Date:</strong> ${reportData.psychological.lastTHIDate}</p>`;

    if (reportData.recommendations.length > 0) {
        html += `<h3 style="color: #00bfa5;">PERSONALIZED THERAPY SUGGESTIONS</h3>`;
        html += `<ul style="margin-left: 20px; margin-bottom: 10px;">`;
        reportData.recommendations.forEach(r => {
            html += `<li><strong>${r.mode}:</strong> ${r.reason}</li>`;
        });
        html += `</ul>`;
    }

    html += `<p><strong>Thought Records Logged:</strong> ${reportData.psychological.thoughtRecordsCount}</p>`;
    html += `<p><strong>Most Recent Record:</strong><br><pre style="background: #f9f9f9; padding: 10px; border-radius: 5px; white-space: pre-wrap;">${reportData.psychological.recentThoughtSummary}</pre></p>`;

    html += `<h2 style="color: #00bfa5;">RESIDUAL INHIBITION (RI)</h2>`;
    html += `<p><strong>Latest RI Result:</strong> ${reportData.ri.latestRIResult}</p>`;

    html += `<h2 style="color: #00bfa5;">MINIMUM MASKING LEVEL (MML)</h2>`;
    html += `<p><strong>Latest MML Result:</strong> ${reportData.mml.latestMMLResult}</p>`;

    html += `<h2 style="color: #00bfa5;">LOUDNESS GROWTH (LG)</h2>`;
    html += `<p><strong>Latest LG Test:</strong> ${reportData.lg.latestLGTest}</p>`;

    html += `<h2 style="color: #00bfa5;">TINNITUS MASKING CURVE (TMC)</h2>`;
    html += `<p><strong>Latest Q-factor:</strong> ${reportData.tmc.latestQFactor}</p>`;

    html += `<h2 style="color: #00bfa5;">SYSTEM STATUS</h2>`;
    html += `<p><strong>Hardware Phase Status:</strong> ${reportData.systemStatus.hardwarePhase}</p>`;
    html += `<p><strong>Automated Engine Validation:</strong><br><pre style="background: #f9f9f9; padding: 10px; border-radius: 5px; white-space: pre-wrap;">${reportData.systemStatus.engineValidation}</pre></p>`;
    
    if (reportData.systemStatus.dspValidation !== 'Not Performed') {
        html += `<p><strong>Internal DSP Validation:</strong> ${reportData.systemStatus.dspValidation}</p>`;
    }

    if (reportData.systemStatus.actionableRecommendations.length > 0) {
        html += `<h3 style="color: #f44336;">ACTIONABLE RECOMMENDATIONS</h3>`;
        html += `<ul style="margin-left: 20px; color: #f44336;">`;
        reportData.systemStatus.actionableRecommendations.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += `</ul>`;
    }

    html += `<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">`;
    html += `<p style="text-align: center; font-size: 0.8em; color: #666;">End of Report</p>`;
    html += `</div>`;
    return html;
}

/**
 * Generates personalized therapy recommendations based on THI and MML scores.
 */
function getTherapyRecommendations() {
    const latestTHI = getLatestLogData('distress_log');
    const thiScore = latestTHI ? latestTHI.data : null;

    const latestMML = getLatestLogData('mml_log');
    const lastMMLValue = latestMML ? latestMML.data.slice(-1)[0] : null;

    if (thiScore === null) {
        return { status: 'incomplete', message: 'Please complete the THI Assessment in CBT & Wellness to get personalized recommendations.' };
    }

    const recs = [];
    const reportsSleepIssues = loadSetting('reports_sleep_issues', 'false') === 'true';

    // Prioritize CBT for High distress
    if (thiScore >= 58) {
        recs.push({
            mode: "CBT & Wellness",
            url: "cbt.html",
            reason: "Your score indicates significant distress. CBT is the clinical gold standard for managing the psychological impact and handicap of tinnitus."
        });
    }

    // Neuromodulation for Moderate/High
    if (thiScore >= 38) {
        recs.push({
            mode: "CR Neuromodulation",
            url: "cr.html",
            reason: "Acoustic Coordinated Reset is designed for moderate-to-severe cases to disrupt synchronized neural firing in the auditory cortex."
        });
        recs.push({
            mode: "Dual-Stimulus",
            url: "lenire.html",
            reason: "Dual-Stimulus pairing (like the Lenire method) can help drive neuroplasticity when simple broadband masking is insufficient."
        });
    } else {
        // Mild cases
        recs.push({
            mode: "Notch Therapy",
            url: "notch.html",
            reason: "Targeted Notch Therapy is ideal for mild-to-moderate tonal tinnitus, encouraging long-term cortical reorganization."
        });
    }

    // Binaural Beats for Sleep or Low Distress
    if (thiScore < 38 || reportsSleepIssues) {
        recs.push({
            mode: "Binaural Beats",
            url: "binaural.html",
            reason: reportsSleepIssues 
                ? "Delta and Theta binaural beats are specifically designed to help transition the brain into deep sleep states and reduce nighttime anxiety."
                : "Since your distress level is low, Binaural Beat entrainment can help maintain relaxation and prevent stress-related spikes."
        });
    }

    // MML specific
    if (lastMMLValue !== null && lastMMLValue > 50) {
        recs.push({
            mode: "Decorrelated Noise",
            url: "decorrelated.html",
            reason: "Since your masking level is high, decorrelated noise can provide effective relief by presenting independent signals to each ear."
        });
    }

    return { status: 'complete', thi: thiScore, mml: lastMMLValue, recommendations: recs };
}

function logUsageMinutes(mins) {
    const today = getTodayKey();
    const usage = getJson('usage_log', {});
    usage[today] = (usage[today] || 0) + mins;
    setJson('usage_log', usage);
}

/**
 * Generates a BBCode/Markdown summary of the current setup for community sharing.
 */
function shareSetup(modeName, reportData) {
    const validation = getUnifiedValidationStatus();
    const thi = getLatestLogData('distress_log');
    
    let text = `[b]Trahreg Tinnitus Suite - ${modeName} Setup[/b]\n`;
    text += `[i]Mode: ${modeName}[/i]\n\n`;
    
    for (const [key, val] of Object.entries(reportData)) {
        text += `* ${key}: ${val}\n`;
    }
    
    if (thi) text += `\n[b]Latest THI Score:[/b] ${thi.data}/100 (${new Date(thi.date).toLocaleDateString()})\n`;
    text += `[b]System Validation:[/b] ${validation.isValid ? "Verified" : "Pending"}\n\n`;
    text += `Generated via Trahreg Tinnitus Therapy Suite (v${APP_VERSION})\n`;
    text += `[url]https://github.com/kjgerhart/tinnitus_therapy[/url]`;

    navigator.clipboard.writeText(text).then(() => {
        alert("Setup summary copied to clipboard in BBCode (Tinnitus Talk) and Markdown (Reddit) format. You can now paste it into a forum post!");
    }).catch(err => {
        console.error("Clipboard error:", err);
        alert("Could not copy automatically. Please check the browser console for your share text.");
        console.log(text);
    });
}

/**
 * Logs a Tinnitus Thought Record entry.
 * @param {object} entry - The thought record entry object.
 */
function logThoughtRecordEntry(entry) {
    const log = getJson('thought_records', []);
    log.push({ ...entry, timestamp: new Date().toISOString() }); // Add timestamp
    setJson('thought_records', log);
}

/**
 * Retrieves all stored Tinnitus Thought Record entries.
 * @returns {Array} An array of thought record entries.
 */
function getThoughtRecords() {
    return getJson('thought_records', []);
}

/**
 * Logs a Tinnitus Handicap Inventory (THI) or distress score (0-100)
 */
function logDistressScore(score) {
    const today = getTodayKey();
    const log = getJson('distress_log', {});
    log[today] = score;
    setJson('distress_log', log);
}

/**
 * Retrieves all stored Tinnitus Handicap Inventory (THI) or distress scores.
 */
function getDistressScores() {
    return getJson('distress_log', {});
}

/**
 * Logs a Residual Inhibition (RI) result (seconds of silence/reduction)
 */
function logRIResult(seconds) {
    const today = getTodayKey();
    const log = getJson('ri_log', {});
    if (!log[today]) log[today] = [];
    log[today].push(seconds);
    setJson('ri_log', log);
}

/**
 * Retrieves RI results log.
 */
function getRIResults() {
    return getJson('ri_log', {});
}

/**
 * Logs a Minimum Masking Level (MML) result
 */
function logMML(percent) {
    const today = getTodayKey();
    const log = getJson('mml_log', {});
    if (!log[today]) log[today] = [];
    log[today].push(percent);
    setJson('mml_log', log);
}

function getMMLResults() {
    return getJson('mml_log', {});
}

/**
 * Logs a Loudness Growth (LG) data point.
 */
function logLoudnessGrowthPoint(freq, objectiveLevel, subjectiveRating) {
    const today = getTodayKey();
    const log = getJson('lg_log', {});
    if (!log[today]) log[today] = [];
    log[today].push({ freq: parseFloat(freq), obj: parseFloat(objectiveLevel), subj: subjectiveRating });
    setJson('lg_log', log);
}

function getLoudnessGrowthLog() {
    return getJson('lg_log', {});
}

/**
 * Logs a calculated Q-factor for a given date.
 */
function logQFactor(qFactor) {
    const today = getTodayKey();
    const log = getJson('q_factor_log', {});
    log[today] = qFactor; // Store the latest Q-factor for the day
    setJson('q_factor_log', log);
}

/**
 * Retrieves all stored Q-factors.
 */
function getQFactors() {
    return getJson('q_factor_log', {});
}

/**
 * Logs a Tinnitus Masking Curve (TMC) point.
 */
function logTMCPoint(freq, level) {
    const log = getJson('tmc_log', {});
    log[freq] = level;
    setJson('tmc_log', log);
}

function getTMCLog() {
    return getJson('tmc_log', {});
}

function clearTMCLog() {
    localStorage.removeItem('tts_tmc_log');
}

/**
 * Retrieves the date of the most recent Tinnitus Handicap Inventory (THI) assessment.
 * @returns {Date|null} The Date object of the last assessment, or null if none found.
 */
function getLastTHIAssessmentDate() {
    const latest = getLatestLogData('distress_log');
    return latest ? new Date(latest.date) : null;
}

function getDailyUsage() {
    return getJson('usage_log', {})[getTodayKey()] || 0;
}

/**
 * Generic "Video-Style" Walkthrough System
 */
function showWalkthrough(slides, startIndex = 0) {
    let currentSlide = startIndex;
    let autoPlayTimer = null;
    let isAutoPlaying = false;
    let speechSynth = window.speechSynthesis;
    let speechUtterance = null;
    let narratorEnabled = loadSetting('narrator_enabled', 'false') === 'true'; // Load preference
    let narratorSpeed = parseFloat(loadSetting('narrator_speed', '0.9'));
    let narratorVolume = parseFloat(loadSetting('narrator_volume', '1.0'));

    document.body.classList.add('tutorial-active');

    const clearHighlights = () => {
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    };

    const stopSpeaking = () => {
        if (speechSynth && speechSynth.speaking) {
            speechSynth.cancel();
        }
    };

    const getPlainTextFromHtml = (html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    };

    const speakContent = (title, contentHtml) => {
        stopSpeaking();
        if (narratorEnabled && speechSynth) {
            const voices = speechSynth.getVoices();
            const textToSpeak = title + ". " + getPlainTextFromHtml(contentHtml);
            speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
            speechUtterance.rate = narratorSpeed;
            speechUtterance.pitch = 1;
            speechUtterance.volume = narratorVolume;

            // Prioritize professional male voices (Neural/Natural/specific professional names)
            const maleKeywords = ['natural', 'neural', 'google us english male', 'microsoft david', 'daniel', 'david', 'alex', 'james', 'male'];
            const selectedVoice = voices
                .filter(v => v.lang.startsWith('en') && maleKeywords.some(k => v.name.toLowerCase().includes(k)))
                .sort((a, b) => {
                    // Prioritize high-quality "Natural" or "Neural" voices for a professional sound
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    const aQuality = aName.includes('natural') || aName.includes('neural');
                    const bQuality = bName.includes('natural') || bName.includes('neural');
                    return bQuality - aQuality;
                })[0];
            
            if (selectedVoice) speechUtterance.voice = selectedVoice;

            // Chained auto-advance: move to next slide after speech ends
            if (isAutoPlaying) {
                speechUtterance.onend = () => {
                    if (isAutoPlaying) {
                        autoPlayTimer = setTimeout(() => {
                            if (currentSlide < slides.length - 1) { currentSlide++; update(); }
                            else stopAuto();
                        }, 1500); // Brief pause after speaking
                    }
                };
            }

            speechSynth.speak(speechUtterance);
        }
    };

    const modalHTML = `
        <div id="walkthroughModal" class="modal-overlay" style="display:block; background: transparent; backdrop-filter: none; pointer-events: none;">
            <div id="walkthroughCard" class="modal-card tutorial-mode" style="text-align: center; pointer-events: auto;">
                <div id="wProgress" style="display:flex; gap:5px; margin-bottom:20px; justify-content:center;"></div>
                <h2 id="wTitle" style="color:var(--accent); margin-top:0; font-size: 1.4rem;"></h2>
                <div id="wContent" style="margin: 20px 0; line-height:1.6; min-height:120px; font-size:0.95rem;"></div>
                <div style="display:flex; gap:10px;">
                    <button id="wBack" class="button" style="flex:1;">Back</button>
                    <button id="wNext" class="big-btn play-btn" style="flex:2; margin-top:0;"></button>
                </div>
                <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 15px; flex-wrap: wrap; gap: 10px;">
                    <div style="display:flex; align-items: center; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.8rem; color: var(--text-dim);">
                            <input type="checkbox" id="narratorToggle" style="width: 16px; height: 16px;">
                            <span>Narrator</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; color: var(--text-dim);">
                            <input type="range" id="narratorSpeed" min="0.5" max="2.0" step="0.1" style="width: 50px; height: 4px; accent-color: var(--accent);">
                            <span id="speedValLabel"></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px; font-size: 0.8rem; color: var(--text-dim);" title="Narrator Volume">
                            <span style="font-size: 0.7rem;">🔊</span>
                            <input type="range" id="narratorVolume" min="0" max="1" step="0.1" style="width: 50px; height: 4px; accent-color: var(--accent);">
                        </label>
                    </div>
                    <div style="display:flex; gap: 5px;">
                        <button id="wAuto" class="button" style="border:none; color:var(--accent); font-size:0.8rem; padding: 5px;">▶ Auto-Play</button>
                        <button onclick="closeWalkthrough()" class="button" style="border:none; color:var(--text-dim); font-size:0.8rem; padding: 5px;">Close Guide</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Set initial state of narrator toggle
    document.getElementById('narratorToggle').checked = narratorEnabled;
    document.getElementById('narratorToggle').onchange = (e) => {
        narratorEnabled = e.target.checked;
        saveSetting('narrator_enabled', narratorEnabled);
        if (!narratorEnabled) stopSpeaking(); // Stop if disabled
    };

    // Set initial state of speed slider
    const speedSlider = document.getElementById('narratorSpeed');
    const speedLabel = document.getElementById('speedValLabel');
    speedSlider.value = narratorSpeed;
    speedLabel.textContent = narratorSpeed.toFixed(1) + 'x';
    speedSlider.oninput = (e) => {
        narratorSpeed = parseFloat(e.target.value);
        speedLabel.textContent = narratorSpeed.toFixed(1) + 'x';
        saveSetting('narrator_speed', narratorSpeed);
    };

    // Set initial state of volume slider
    const volumeSlider = document.getElementById('narratorVolume');
    volumeSlider.value = narratorVolume;
    volumeSlider.oninput = (e) => {
        narratorVolume = parseFloat(e.target.value);
        saveSetting('narrator_volume', narratorVolume);
    };

    const stopAuto = () => { // This function also stops speaking
        if (autoPlayTimer) {
            clearTimeout(autoPlayTimer);
            autoPlayTimer = null;
        }
        isAutoPlaying = false;
        document.getElementById('wAuto').textContent = "▶ Auto-Play";
        stopSpeaking();
    };

    const update = () => {
        clearHighlights();
        const s = slides[currentSlide];
        document.getElementById('wTitle').textContent = s.title;
        document.getElementById('wContent').innerHTML = s.content;
        document.getElementById('wNext').textContent = currentSlide === slides.length - 1 ? "Finish" : "Next";
        document.getElementById('wBack').style.visibility = currentSlide > 0 ? 'visible' : 'hidden';
        document.getElementById('wProgress').innerHTML = slides.map((_, i) => `<div style="width:20px; height:4px; border-radius:2px; background:${i <= currentSlide ? 'var(--accent)' : 'var(--surface)'}"></div>`).join('');

        if (s.selector) {
            const target = document.querySelector(s.selector);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.classList.add('tutorial-highlight');
            }
        }

        // Speak content if auto-playing and narrator is enabled
        if (narratorEnabled) {
            speakContent(s.title, s.content);
        } else {
            stopSpeaking(); // Ensure speech stops if not auto-playing or narrator disabled
            // If auto-playing but narrator is off, we need a standard timer to advance
            if (isAutoPlaying) {
                autoPlayTimer = setTimeout(() => {
                    if (currentSlide < slides.length - 1) { currentSlide++; update(); }
                    else stopAuto();
                }, 7000); // Standard slide duration
            }
        }
    };

    document.getElementById('wNext').onclick = () => { 
        stopAuto();
        if (currentSlide < slides.length - 1) { currentSlide++; update(); } 
        else closeWalkthrough(); 
    };
    document.getElementById('wBack').onclick = () => { stopAuto(); if (currentSlide > 0) { currentSlide--; update(); } };
    
    document.getElementById('wAuto').onclick = () => {
        if (isAutoPlaying) {
            stopAuto();
        } else {
            isAutoPlaying = true;
            document.getElementById('wAuto').textContent = "⏸ Paused";
            update();
        }
    };

    window.closeWalkthrough = () => { 
        document.body.classList.remove('tutorial-active');
        stopAuto(); 
        clearHighlights(); 
        const el = document.getElementById('walkthroughModal'); 
        if (el) el.remove(); 
    }; 
    update();
}

function showQuickStartGuide() {
    showWalkthrough([
        { title: "Welcome to Relief", content: "Tinnitus management is a journey of training the brain. This suite provides the tools research shows are most effective for 'habituation'." },
        { title: "The Golden Rule: Mixing", content: "<b>Important:</b> Do not hide your tinnitus completely. Set your therapy volume so the sound and your tinnitus 'mix'. Your brain needs to hear both to learn the tinnitus is neutral." },
        { title: "Step 1: Calibration", content: "Visit the <b>Notch Finder</b> first. You must find your exact tinnitus pitch so therapies can target the correct neural clusters." },
        { title: "Step 2: Passive Listening", content: "Use therapy for 30–60 minutes daily. Don't focus on it—let it be background 'wallpaper' while you work or relax." },
        { title: "Step 3: Track Progress", content: "Take the <b>THI Assessment</b> once a month. Monthly checks show your progress clearly without the stress of daily monitoring." }
    ]);
}

/**
 * Starts a module-specific tutorial walkthrough.
 */
function startModuleTutorial(key, startIndex = 0) {
    const tutorials = {
        'decorrelated': [
            { title: "Hardware Check", content: "Plug in your headphones. This therapy depends on your brain receiving two different, independent signals.", selector: "h1" },
            { title: "Sound Source", content: "Select your preferred noise color or nature sound. Pink noise is often most comfortable for long sessions.", selector: "#color" },
            { title: "EQ Setup", content: "Use the EQ sliders to boost frequencies where you have hearing loss. This reduces the 'listening effort' required by your brain.", selector: "#eqSection" },
            { title: "The Mixing Point", content: "Adjust the volume so the noise and your tinnitus 'mix'. Do not mask the sound completely.", selector: "#volMaster" },
            { title: "Start Session", content: "Set your timer and begin your daily therapy session.", selector: "#toggleBtn" },
            { title: "Share Your Setup", content: "Found a configuration that provides relief? Share it with the community to help others find their mixing point.", selector: "button[onclick='shareToCommunity()']" }
        ],
        'notch': [
            { title: "Pitch Match", content: "Use the test tone to find your exact tinnitus pitch. Precision is critical for effective Notch therapy.", selector: "#step1Section" },
            { title: "Set the Notch", content: "Input your matched frequency here. This 'silences' the noise in that specific frequency range.", selector: "#step2Section" },
            { title: "Notch Width", content: "Set the width to 1.0 octaves (clinical standard). This determines the size of the 'hole' in the noise.", selector: "#step2Section" },
            { title: "Volume Mix", content: "Adjust volume to the mixing point. You should still hear your tinnitus inside the notch.", selector: "#volMaster" },
            { title: "Start Therapy", content: "Activate the engine to begin the cortical reorganization process.", selector: "#toggleBtn" },
            { title: "Share Your Setup", content: "Sharing your matched frequency and volume levels helps others understand how to calibrate their own notch therapy.", selector: "button[onclick='shareToCommunity()']" }
        ],
        'cr': [
            { title: "Precise Bracketing", content: "Use this tone to exactly match your tinnitus pitch. This determines the 4 therapeutic frequencies.", selector: ".card:first-of-type" },
            { title: "Tone Calculation", content: "Once matched, click here to calculate your personalized therapy sequence.", selector: "#baseFreq" },
            { title: "Perceived Loudness", content: "Adjust these sliders until all four tones sound equally loud to you. Balance is vital for success.", selector: ".bal-slider-row" },
            { title: "Volume & Timing", content: "Set your session time (60 mins recommended) and start the coordinated reset sequence.", selector: "#toggleBtn" },
            { title: "Share Your Setup", content: "Acoustic CR is complex; sharing your bracketing results can help the community refine their own sequences.", selector: "button[onclick='shareToCommunity()']" }
        ],
        'lenire': [
            { title: "Neuromodulation", content: "This engine uses bursts and modulated noise to drive auditory neuroplasticity.", selector: "h1" },
            { title: "Visual Sync", content: "Enable the visual pulse to add multisensory input, which can enhance the therapeutic effect.", selector: "#visualPulse" },
            { title: "Tactile Bimodal Setup", content: "If using a smartphone, enable Haptic Pulse. The phone will vibrate in sync with the sound bursts, providing a safe, tactile 'second sense' to help your brain re-focus away from tinnitus.", selector: "#hapticPulse" },
            { title: "Intensity Control", content: "Adjust the Vibration Intensity to find a level that is noticeable but not distracting. A gentle tap synchronized with the sound is usually most effective.", selector: "#hapticStrengthCtrl" },
            { title: "Trigger Calibration", content: "Adjust Trigger Sensitivity until the device pulses only when you hear a tone burst. If it vibrates constantly, increase the value. If it misses bursts, decrease it.", selector: "#hapticSensitivityCtrl" },
            { title: "Wireless Finger Hardware", content: "If you have the Wireless Finger Pacer, click 'Connect Wireless' to pair it via Bluetooth. This provides tactile pairing with the auditory bursts for a bimodal effect.", selector: "#connectBleBtn" },
            { title: "Auditory Pacer", content: "Enable Auditory Cues to hear a subtle chime at the start of each breath. This allows you to maintain synchronization even with your eyes closed.", selector: "#pacerAudio" },
            { title: "Pulse Rate", content: "Adjust the pulse speed to match your natural resting breath. A slow, steady rhythm (around 5-6 breaths per minute) is usually best for relaxation.", selector: "#pulseRate" },
            { title: "Breathing Sync", content: "Try to match your breathing to the visual pulse. Inhaling as the light expands and exhaling as it fades helps activate the body's relaxation response, further aiding habituation.", selector: "#visualPulse" },
            { title: "The Mix", content: "Balance the tones and noise so neither is overwhelming. The sound should shimmer background.", selector: ".ctrl:has(input[type=range])" },
            { title: "Zen Mode", content: "Once your settings are dialed in, use Zen Mode to hide technical controls. This encourages 'Passive Listening'—allowing the sound to become background wallpaper while you focus on other tasks.", selector: "#zenBtn" },
            { title: "Help the Community", content: "Found a setup that works for you? Use the 'Share Setup' button to generate a summary you can post on forums like Tinnitus Talk or Reddit. Helping others find relief is the best way to grow this project!", selector: "button[onclick='shareToCommunity()']" }
        ],
        'soundtherapy': [
            { title: "Sound Types", content: "Choose between calibrated broadband noise for habituation or nature sounds for relaxation.", selector: ".btn-grid:first-of-type" },
            { title: "Breathing Pacer", content: "Use the 4-7-8 pacer to lower physiological stress during a tinnitus spike.", selector: "#pacerToggle" },
            { title: "Volume Calibration", content: "Set to the 'Mixing Point'. If you hide the tinnitus completely, you aren't habituating.", selector: "#volume" },
            { title: "Sleep Support", content: "Enable Sleep Fade for a soft 60-second shutdown when the timer ends.", selector: "#sleepMode" },
            { title: "Share Your Setup", content: "Share your favorite soundscapes and masking levels with the community.", selector: "button[onclick='shareToCommunity()']" }
        ],
        'notchfinder': [
            { title: "Frequency Input", content: "Adjust the pitch using the slider or type a value. This identifies your tinnitus 'center frequency'.", selector: ".responsive-grid" },
            { title: "Auto-Sweep", content: "Use this to slowly climb the frequency range. It's often easier to find the match while the sound is moving.", selector: "#speedSlider" },
            { title: "Test & Listen", content: "Toggle the tones to compare the external sound against your internal tinnitus.", selector: "#playBtn" },
            { title: "Save Settings", content: "Once matched, save here. This frequency will be used across all other therapy modules automatically.", selector: "#saveBtn" },
            { title: "Matching Difficulty?", content: "If you cannot find a match, you may have hearing loss in that frequency region. Use the <b>Hearing Test</b> tool to check your audibility levels.", selector: "h1" }
        ],
        'tmc': [
            { title: "Point Calibration", content: "For each frequency, find the 'Minimum Masking Level'—the quietest volume that just hides your tinnitus.", selector: "#freqSlider" },
            { title: "Mapping the Curve", content: "Save multiple points across the spectrum to visualize your auditory filter shape.", selector: "button[onclick='savePoint()']" },
            { title: "Tuning Analysis", content: "The Q-factor indicates how 'sharp' your tinnitus signal is. A higher number suggests a more tonal perception.", selector: "#tmcChart" }
        ],
        'lg': [
            { title: "Objective vs Subjective", content: "Play a tone and increase the volume. We are measuring how your brain perceives loudness growth.", selector: "#volSlider" },
            { title: "Rating Scale", content: "Rate the sound from 'Very Soft' to 'Uncomfortable'. This helps identify hyperacusis (loudness sensitivity).", selector: ".btn-grid" },
            { title: "The Curve", content: "A steep line on this chart can indicate the presence of recruitment or hyperacusis.", selector: "canvas" }
        ],
        'ri': [
            { title: "Suppression Setup", content: "Choose a noise color. We will play this for 60 seconds at a level that completely hides your tinnitus.", selector: "#noiseColor" },
            { title: "The Stopwatch", content: "After the noise stops, time how long it takes for your tinnitus to return to its normal level.", selector: "#step3" },
            { title: "History", content: "Track your RI duration over time. Longer suppression periods are a positive clinical sign.", selector: "#riHistory" }
        ],
        'validation': [
            { title: "Phase Verification", content: "This is critical. Ensure the 'In-Phase' tone sounds centered in your head, not 'wide' or hollow.", selector: ".card" },
            { title: "Engine Check", content: "Run the automated tests to verify the suite's DSP engine is producing accurate clinical signals.", selector: ".play-btn" },
            { title: "Results Log", content: "View technical details like filter attenuation and stereo separation here.", selector: "#results" }
        ],
        'twotone': [
            { title: "Bracketing", content: "Compare Tone A and Tone B to 'bracket' your tinnitus. This helps avoid octave-match errors.", selector: ".card:first-of-type" },
            { title: "Saving", content: "If one tone is a perfect match, save it directly to your global settings.", selector: "button[onclick*='saveToNotch']" }
        ],
        'sweep': [
            { title: "Range Test", content: "This sweep moves from 20Hz to 20kHz. It helps identify 'dead zones' or frequency triggers.", selector: "h2" },
            { title: "Volume Safety", content: "Always start at a low volume (10% or less) before beginning a high-frequency sweep.", selector: "#volSlider" }
        ],
        'hearingtest': [
            { title: "Exploration", content: "Tap each button to check your audibility thresholds across the spectrum.", selector: ".section-title" },
            { title: "Clinical Note", content: "Remember: This is an exploration tool, not a replacement for a professional audiogram.", selector: "p" }
        ]
    };

    if (tutorials[key]) {
        showWalkthrough(tutorials[key], startIndex);
    } else {
        showQuickStartGuide();
    }
}

function applyCompactMode() {
    const isCompact = loadSetting('compact_mode', 'false') === 'true';
    document.documentElement.classList.toggle('compact-mode', isCompact);
}

function toggleCompactMode() {
    const isCompact = loadSetting('compact_mode', 'false') === 'true';
    saveSetting('compact_mode', isCompact ? 'false' : 'true');
    applyCompactMode();
}

function applyDashboardLayout() {
    const layout = loadSetting('dashboard_layout', '2-column');
    document.documentElement.classList.toggle('single-column-layout', layout === '1-column');
}

function toggleDashboardLayout() {
    const current = loadSetting('dashboard_layout', '2-column');
    const next = current === '2-column' ? '1-column' : '2-column';
    saveSetting('dashboard_layout', next);
    applyDashboardLayout();
}

function applyTheme() {
    const theme = loadSetting('theme', 'dark');
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    if (document.body) {
        document.body.classList.toggle('light-mode', theme === 'light');
    }
}

function applyEmailVisibility() {
    const email = loadSetting('audiologist_email', '');
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    document.querySelectorAll('.email-audiologist-btn').forEach(btn => {
        btn.classList.toggle('hidden', !isValid);
    });
}

function toggleTheme() {
    const theme = loadSetting('theme', 'dark');
    const next = theme === 'dark' ? 'light' : 'dark';
    saveSetting('theme', next);
    applyTheme();
}

function syncUIVersion() {
    document.querySelectorAll('.app-version-label').forEach(el => {
        const prefix = el.dataset.versionPrefix || '';
        const suffix = el.dataset.versionSuffix || '';
        el.textContent = `${prefix}${APP_VERSION}${suffix}`;
    });
}

// Immediate application to prevent flash of unstyled content
(function() {
    const theme = localStorage.getItem('tts_theme');
    if (theme === 'light') {
        document.documentElement.classList.add('light-mode');
    }
    
    const compact = localStorage.getItem('tts_compact_mode');
    if (compact === 'true') {
        document.documentElement.classList.add('compact-mode');
    }
    
    const layout = localStorage.getItem('tts_dashboard_layout');
    if (layout === '1-column') {
        document.documentElement.classList.add('single-column-layout');
    }
    
    // --- Trahreg Gatekeeper Logic ---
    (function() {
        const path = window.location.pathname.toLowerCase();
        const isDocs = path.includes('/docs/');
        
        // 1. Identify Home/Root and authorize the session
        const isHome = path.endsWith('index.html') || (path.endsWith('/') && !isDocs);
        try {
            if (isHome) sessionStorage.setItem('tts_session_active', 'true');
        } catch(e) { /* Private mode protection */ }

        // 2. Identify Whitelisted (Public) pages
        const publicPages = ['index.html', 'disclaimer.html', 'license.html', 'about.html', 'research.html', 'feedback.html'];
        const isPublicPage = isHome || publicPages.some(p => path.endsWith(p));

        const onboardingStep = parseInt(localStorage.getItem('tts_onboarding_step') || '0');

        // 3. Enforce Redirection: Only redirect if onboarding hasn't started and it's not a public page
        if (!isPublicPage && onboardingStep < 1) {
            console.warn("[Gatekeeper] Disclaimer acceptance required. Redirecting to home...");
            const redirectTarget = isDocs ? '../index.html' : 'index.html';
            window.location.replace(redirectTarget);
        }
    })();
})();

// Re-sync with body once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        applyTheme();
        applyCompactMode();
        applyDashboardLayout();
        applyEmailVisibility();
        syncUIVersion();
    });
} else {
    applyTheme();
    applyCompactMode();
    applyDashboardLayout();
    applyEmailVisibility();
    syncUIVersion();
}

function needsValidation() {
    return !getUnifiedValidationStatus().isValid;
}
