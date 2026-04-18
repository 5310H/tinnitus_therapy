// Shared script for Tinnitus Therapy Suite persistence
// Include this at the bottom of therapy pages to handle auto-save/load

function saveSetting(key, value) {
    localStorage.setItem('tts_' + key, value);
}

function loadSetting(key, defaultValue) {
    const saved = localStorage.getItem('tts_' + key);
    return saved !== null ? saved : defaultValue;
}

// Example usage to be implemented in each tool:
// 1. On page load:
//    document.getElementById('vol').value = loadSetting('vol', 40);
//    updateUI(); // Function to update displays/audio nodes
// 2. On change:
//    document.getElementById('vol').addEventListener('input', (e) => {
//        saveSetting('vol', e.target.value);
//    });
