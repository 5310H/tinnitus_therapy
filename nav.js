function initNav(helpHtml) {
    const isDocs = window.location.pathname.toLowerCase().includes('/docs/');
    const homePath = isDocs ? '../index.html' : 'index.html';
    const navHTML = `
        <a class="back" href="${homePath}" style="color:var(--accent)">Home</a>
        <div style="position:fixed; top:1rem; right:1rem; display:flex; gap:10px; z-index:100;">
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