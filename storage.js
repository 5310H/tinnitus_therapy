// Shared script for Tinnitus Therapy Suite persistence
// Include this at the bottom of therapy pages to handle auto-save/load

const APP_VERSION = "1.2.2";

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
    
    report += `THERAPY SETTINGS:\n`;
    
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
    report += `Thought Records Logged: ${thoughtRecordsCount}\n`;
    report += `Most Recent Record:\n${recentThoughtSummary}\n`;

    report += `\nSYSTEM STATUS:\n`;
    report += `Hardware Phase Status: ${phaseStatus}\n`;
    report += `AUTOMATED ENGINE VALIDATION:\n${engineResults}\n`;
    
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

    report += `-------------------------------------------`;
    return report;
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
