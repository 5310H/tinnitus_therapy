function initNav(helpHtml) {
    const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
    const homePath = isDocs ? '../index.html' : 'index.html';
    const navHTML = `
        <a class="back" href="${homePath}" style="color:var(--accent)">Home</a>
        <div style="position:fixed; top:1rem; right:1rem; display:flex; gap:10px; z-index:100; align-items: center;">
            <div id="audioStatusIndicator" style="font-size: 0.65rem; font-weight: bold; color: var(--text-dim); background: var(--card-bg); padding: 4px 10px; border-radius: 15px; border: 1px solid var(--border); display: none; white-space: nowrap;">○ Audio Off</div>
            <button class="help-btn" style="position:static; padding: 8px 10px; border-color:var(--accent); color:var(--accent);" onclick="toggleTheme()" title="Toggle Dark/Light Mode">🌓</button>
            ${helpHtml ? `<button class="help-btn" style="position:static; border-color:var(--accent); color:var(--accent);" onclick="openHelp()">Help</button>` : ''}
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    if (helpHtml) {
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
        // Use innerHTML only for the trusted static strings provided in initNav calls
        document.getElementById('helpContent').innerHTML = helpHtml;
    }
}
window.openHelp = () => document.getElementById("helpModal").style.display = "block";
window.closeHelp = () => document.getElementById("helpModal").style.display = "none";

// --- Global AudioContext State Observer ---
// This interceptor monitors the Web Audio engine status across all therapy modules.
(function() {
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!OriginalAudioContext) return;

    // Wrap the constructor to capture every context created in the suite
    const ProxyContext = function(...args) {
        const ctx = new OriginalAudioContext(...args);
        
        const updateUI = () => {
            const el = document.getElementById('audioStatusIndicator');
            if (!el) return;
            
            el.style.display = 'block';
            const state = ctx.state;
            
            if (state === 'running') {
                el.innerHTML = '<span style="color: var(--accent)">●</span> Audio Active';
                el.style.borderColor = 'var(--accent)';
                el.title = "The audio engine is processing sound normally.";
            } else if (state === 'suspended') {
                el.innerHTML = '<span style="color: #ff9800">●</span> Audio Suspended';
                el.style.borderColor = '#ff9800';
                el.title = "Audio is suspended by the browser. Interaction (like clicking Start) is required.";
            } else if (state === 'closed') {
                el.innerHTML = '○ Audio Closed';
                el.style.borderColor = 'var(--border)';
                el.title = "The audio engine has been shut down.";
            }
        };

        ctx.addEventListener('statechange', updateUI);
        // Initial check after the script that created it finishes
        setTimeout(updateUI, 100);
        
        return ctx;
    };

    ProxyContext.prototype = OriginalAudioContext.prototype;
    window.AudioContext = window.webkitAudioContext = ProxyContext;
})();