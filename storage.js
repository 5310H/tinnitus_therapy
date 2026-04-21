// Shared script for Tinnitus Therapy Suite persistence
// Include this at the bottom of therapy pages to handle auto-save/load

const APP_VERSION = "1.1.0";

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

function generateClinicalReport(modeName, settingsObj) {
    const engineResults = loadSetting('engine_validation_results', 'Not Performed');
    const phaseStatus = loadSetting('phase_status', 'Not Verified');
    const usage = getDailyUsage();
    
    let report = `TRAHREG TINNITUS THERAPY SUITE - CLINICAL REPORT\n`;
    report += `App Version: ${APP_VERSION}\n`;
    report += `Therapy Mode: ${modeName}\n`;
    report += `Export Date: ${new Date().toLocaleString()}\n`;
    report += `-------------------------------------------\n`;
    
    for (const [label, value] of Object.entries(settingsObj)) {
        report += `${label}: ${value}\n`;
    }
    
    report += `Today's Usage: ${Math.round(usage)} minutes\n`;
    report += `Hardware Phase Status: ${phaseStatus}\n\n`;
    report += `AUTOMATED ENGINE VALIDATION:\n${engineResults}\n`;
    
    if (window.lastValidationStatus) {
        report += `\nINTERNAL DSP VALIDATION:\nStatus: ${window.lastValidationStatus}\n`;
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

function toggleTheme() {
    const theme = loadSetting('theme', 'dark');
    const next = theme === 'dark' ? 'light' : 'dark';
    saveSetting('theme', next);
    applyTheme();
}

// Immediate application to prevent flash of unstyled content
(function() {
    const theme = localStorage.getItem('tts_theme');
    if (theme === 'light') {
        document.documentElement.classList.add('light-mode');
    }
})();

// Re-sync with body once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTheme);
} else {
    applyTheme();
}
