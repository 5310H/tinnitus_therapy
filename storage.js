// Shared script for Tinnitus Therapy Suite persistence
// Include this at the bottom of therapy pages to handle auto-save/load

const APP_VERSION = "1.2.16";

function saveSetting(key, value) {
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

function generateClinicalReport(modeName, settingsObj, techSpecsObj = {}) {
    const engineResults = loadSetting('engine_validation_results', 'Not Performed');
    const phaseStatus = loadSetting('phase_status', 'Not Verified');
    const usage = getDailyUsage();

    const mmlLog = getMMLResults();
    const mmlDates = Object.keys(mmlLog).sort((a, b) => new Date(b) - new Date(a));
    let mmlSummary = "N/A";
    if (mmlDates.length > 0) {
        mmlSummary = `Latest MML: ${mmlLog[mmlDates[0]].slice(-1)[0]}%`;
    }

    const lgLog = getLoudnessGrowthLog();
    const lgDates = Object.keys(lgLog).sort((a, b) => new Date(b) - new Date(a));
    let latestLGSummary = "N/A";
    if (lgDates.length > 0) {
        latestLGSummary = `Points: ${lgLog[lgDates[0]].length}`;
    }

    const qFactors = getQFactors();
    const qFactorDates = Object.keys(qFactors).sort((a, b) => new Date(b) - new Date(a));
    let latestQFactor = "N/A";
    if (qFactorDates.length > 0) {
        latestQFactor = qFactors[qFactorDates[0]];
    }

    const riLog = getRIResults();
    const riDates = Object.keys(riLog).sort((a, b) => new Date(b) - new Date(a));
    let riSummary = "N/A";
    if (riDates.length > 0) {
        const latestDate = riDates[0];
        riSummary = `Date: ${latestDate} | Suppression Results: ${riLog[latestDate].join('s, ')}s`;
    }

    const lastTHI = getLastTHIAssessmentDate();
    const distressScores = getDistressScores();
    const lastScoreVal = lastTHI ? distressScores[lastTHI.toISOString().split('T')[0]] : null;
    const lastScore = lastScoreVal !== null ? `${lastScoreVal}/100` : 'Not Performed';
    
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
    
    let report = `TRAHREG TINNITUS THERAPY SUITE - CLINICAL REPORT\n`;
    report += `App Version: ${APP_VERSION}\n`;
    report += `Therapy Mode: ${modeName}\n`;
    report += `Export Date: ${new Date().toLocaleString()}\n`;
    report += `-------------------------------------------\n`;
    
    report += `\nTHERAPY SETTINGS:\n`;
    
    for (const [label, value] of Object.entries(settingsObj)) {
        report += `${label}: ${value}\n`;
    }

    if (Object.keys(techSpecsObj).length > 0) {
        report += `\nTECHNICAL SPECIFICATIONS:\n`;
        for (const [label, value] of Object.entries(techSpecsObj)) {
            report += `${label}: ${value}\n`;
        }
    }
    
    report += `\nUSAGE & STATUS:\n`;
    report += `Today's Usage: ${Math.round(usage)} minutes\n`;

    report += `\nPSYCHOLOGICAL BASELINE (CBT):\n`;
    report += `Last THI Score: ${lastScore}\n`;
    report += `Last THI Date: ${lastTHI ? lastTHI.toLocaleDateString() : 'N/A'}\n`;

    const therapyRecs = getTherapyRecommendations();
    if (therapyRecs.status === 'complete' && therapyRecs.recommendations.length > 0) {
        report += `\nPERSONALIZED THERAPY SUGGESTIONS:\n`;
        therapyRecs.recommendations.forEach(r => {
            report += `- ${r.mode}: ${r.reason}\n`;
        });
    }

    report += `Thought Records Logged: ${thoughtRecordsCount}\n`;
    report += `Most Recent Record:\n${recentThoughtSummary}\n`;

    report += `\nRESIDUAL INHIBITION (RI):\n`;
    report += `Latest RI Result: ${riSummary}\n`;

    report += `\nMINIMUM MASKING LEVEL (MML):\n`;
    report += `Latest MML Result: ${mmlSummary}\n`;

    report += `\nLOUDNESS GROWTH (LG):\n`;
    report += `Latest LG Test: ${latestLGSummary}\n`;

    report += `\nTINNITUS MASKING CURVE (TMC):\n`;
    report += `Latest Q-factor: ${latestQFactor}\n`;

    report += `\nSYSTEM STATUS:\n`;
    report += `Hardware Phase Status: ${phaseStatus}\n`;
    report += `\nAUTOMATED ENGINE VALIDATION:\n${engineResults}\n`;
    
    if (window.lastValidationStatus) {
        report += `\nINTERNAL DSP VALIDATION:\nStatus: ${window.lastValidationStatus}\n`;
    }

    const recommendations = [];
    if (engineResults === 'Not Performed' || engineResults.includes('[FAIL]')) {
        recommendations.push("- Automated Engine Validation is missing or failed. Please run the 'System Validation' tool on the home page.");
    }
    if (phaseStatus === 'Not Verified') {
        recommendations.push("- Hardware Phase is unverified. Use the 'Phase Test' in System Validation to confirm headphone wiring.");
    } else if (phaseStatus.includes('Error')) {
        recommendations.push("- Phase error detected. Check for loose connections or virtual surround sound software.");
    }
    if (window.lastValidationStatus && window.lastValidationStatus.includes('FAIL')) {
        if (window.lastValidationStatus.includes('Shallow Notch')) {
            recommendations.push("- Shallow Notch failure: Clinical research targets >40dB attenuation. Disable any audio 'enhancer' or 'booster' browser extensions.");
        }
        if (window.lastValidationStatus.includes('Frequency Mismatch')) {
            recommendations.push("- Frequency mismatch failure: Ensure your OS audio settings are set to 44.1kHz or 48kHz and restart your browser.");
        }
    }
    if (recommendations.length > 0) {
        report += `\nACTIONABLE RECOMMENDATIONS:\n${recommendations.join('\n')}\n`;
    }

    report += `\n-------------------------------------------`;
    // Normalize all line endings to CRLF for consistent line spacing across OS/Browsers in text exports
    return report.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}

/**
 * Generates personalized therapy recommendations based on THI and MML scores.
 */
function getTherapyRecommendations() {
    const lastTHI = getLastTHIAssessmentDate();
    const distressScores = getDistressScores();
    const thiScore = lastTHI ? distressScores[lastTHI.toISOString().split('T')[0]] : null;

    const mmlLog = getMMLResults();
    const mmlDates = Object.keys(mmlLog).sort((a, b) => new Date(b) - new Date(a));
    const lastMML = mmlDates.length > 0 ? mmlLog[mmlDates[0]].slice(-1)[0] : null;

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
            mode: "Lenire-Style Sound",
            url: "lenire.html",
            reason: "Structured burst patterns can help drive neuroplasticity when simple broadband masking is insufficient."
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
    if (lastMML !== null && lastMML > 50) {
        recs.push({
            mode: "Decorrelated Noise",
            url: "decorrelated.html",
            reason: "Since your masking level is high, decorrelated noise can provide effective relief by presenting independent signals to each ear."
        });
    }

    return { status: 'complete', thi: thiScore, mml: lastMML, recommendations: recs };
}

function logUsageMinutes(mins) {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('tts_usage_log') || '{}');
    usage[today] = (usage[today] || 0) + mins;
    localStorage.setItem('tts_usage_log', JSON.stringify(usage));
}

/**
 * Logs a Tinnitus Thought Record entry.
 * @param {object} entry - The thought record entry object.
 */
function logThoughtRecordEntry(entry) {
    const log = JSON.parse(localStorage.getItem('tts_thought_records') || '[]');
    log.push({ ...entry, timestamp: new Date().toISOString() }); // Add timestamp
    localStorage.setItem('tts_thought_records', JSON.stringify(log));
}

/**
 * Retrieves all stored Tinnitus Thought Record entries.
 * @returns {Array} An array of thought record entries.
 */
function getThoughtRecords() {
    return JSON.parse(localStorage.getItem('tts_thought_records') || '[]');
}

/**
 * Logs a Tinnitus Handicap Inventory (THI) or distress score (0-100)
 */
function logDistressScore(score) {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('tts_distress_log') || '{}');
    log[today] = score;
    localStorage.setItem('tts_distress_log', JSON.stringify(log));
}

/**
 * Retrieves all stored Tinnitus Handicap Inventory (THI) or distress scores.
 */
function getDistressScores() {
    return JSON.parse(localStorage.getItem('tts_distress_log') || '{}');
}

/**
 * Logs a Residual Inhibition (RI) result (seconds of silence/reduction)
 */
function logRIResult(seconds) {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('tts_ri_log') || '{}');
    if (!log[today]) log[today] = [];
    log[today].push(seconds);
    localStorage.setItem('tts_ri_log', JSON.stringify(log));
}

/**
 * Retrieves RI results log.
 */
function getRIResults() {
    return JSON.parse(localStorage.getItem('tts_ri_log') || '{}');
}

/**
 * Logs a Minimum Masking Level (MML) result
 */
function logMML(percent) {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('tts_mml_log') || '{}');
    if (!log[today]) log[today] = [];
    log[today].push(percent);
    localStorage.setItem('tts_mml_log', JSON.stringify(log));
}

function getMMLResults() {
    return JSON.parse(localStorage.getItem('tts_mml_log') || '{}');
}

/**
 * Logs a Loudness Growth (LG) data point.
 */
function logLoudnessGrowthPoint(freq, objectiveLevel, subjectiveRating) {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('tts_lg_log') || '{}');
    if (!log[today]) log[today] = [];
    log[today].push({ freq: parseFloat(freq), obj: parseFloat(objectiveLevel), subj: subjectiveRating });
    localStorage.setItem('tts_lg_log', JSON.stringify(log));
}

function getLoudnessGrowthLog() {
    return JSON.parse(localStorage.getItem('tts_lg_log') || '{}');
}

/**
 * Logs a calculated Q-factor for a given date.
 */
function logQFactor(qFactor) {
    const today = new Date().toISOString().split('T')[0];
    const log = JSON.parse(localStorage.getItem('tts_q_factor_log') || '{}');
    log[today] = qFactor; // Store the latest Q-factor for the day
    localStorage.setItem('tts_q_factor_log', JSON.stringify(log));
}

/**
 * Retrieves all stored Q-factors.
 */
function getQFactors() {
    return JSON.parse(localStorage.getItem('tts_q_factor_log') || '{}');
}

/**
 * Logs a Tinnitus Masking Curve (TMC) point.
 */
function logTMCPoint(freq, level) {
    const log = JSON.parse(localStorage.getItem('tts_tmc_log') || '{}');
    log[freq] = level;
    localStorage.setItem('tts_tmc_log', JSON.stringify(log));
}

function getTMCLog() {
    return JSON.parse(localStorage.getItem('tts_tmc_log') || '{}');
}

function clearTMCLog() {
    localStorage.removeItem('tts_tmc_log');
}

/**
 * Retrieves the date of the most recent Tinnitus Handicap Inventory (THI) assessment.
 * @returns {Date|null} The Date object of the last assessment, or null if none found.
 */
function getLastTHIAssessmentDate() {
    const scores = getDistressScores();
    const dates = Object.keys(scores);
    if (dates.length === 0) {
        return null;
    }
    // Convert date strings to Date objects and find the maximum (most recent)
    const latestDate = dates.reduce((maxDate, currentDateStr) => {
        const currentDate = new Date(currentDateStr);
        return (maxDate === null || currentDate > maxDate) ? currentDate : maxDate;
    }, null);
    return latestDate;
}

function getDailyUsage() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('tts_usage_log') || '{}');
    return usage[today] || 0;
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
    
    // --- Trahreg Gatekeeper Logic ---
    (function() {
        const path = window.location.pathname.toLowerCase();
        const isDocs = path.includes('/docs/');
        
        // 1. Identify Home/Root and authorize the session
        const isHome = path.endsWith('index.html') || (path.endsWith('/') && !isDocs);
        if (isHome) {
            sessionStorage.setItem('tts_session_active', 'true');
        }

        // 2. Identify Whitelisted (Public) pages
        const publicPages = ['index.html', 'disclaimer.html', 'license.html', 'about.html', 'research.html', 'feedback.html'];
        const isPublicPage = isHome || publicPages.some(p => path.endsWith(p));

        const sessionActive = sessionStorage.getItem('tts_session_active') === 'true';
        const onboardingStep = parseInt(localStorage.getItem('tts_onboarding_step') || '0');

        // 3. Enforce Redirection
        if (!isPublicPage) {
            if (!sessionActive || onboardingStep < 1) {
                console.warn("[Gatekeeper] Unauthorized access to " + path + ". Redirecting...");
                const redirectTarget = isDocs ? '../index.html' : 'index.html';
                window.location.replace(redirectTarget);
            }
        }
    })();
})();

// Re-sync with body once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        applyTheme();
        applyEmailVisibility();
        syncUIVersion();
    });
} else {
    applyTheme();
    applyEmailVisibility();
    syncUIVersion();
}

function needsValidation() {
    const last = loadSetting('last_validation_date', null);
    if (!last) return true;
    const diff = Date.now() - new Date(last).getTime();
    return diff > (30 * 24 * 60 * 60 * 1000); // 30 Days
}
