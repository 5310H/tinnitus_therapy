const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const packageJson = require('./package.json');
const version = packageJson.version;

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m"
};

// --- Audit Logging Setup ---
// Captures all console output to generate a persistent audit trail for the last sync attempt.
const auditTrail = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
    auditTrail.push(args.join(' ').replace(/\x1b\[[0-9;]*m/g, ''));
    originalLog(...args);
};
console.error = (...args) => {
    auditTrail.push(`❌ ERROR: ${args.join(' ').replace(/\x1b\[[0-9;]*m/g, '')}`);
    originalError(...args);
};
console.warn = (...args) => {
    auditTrail.push(`⚠️ WARNING: ${args.join(' ').replace(/\x1b\[[0-9;]*m/g, '')}`);
    originalWarn(...args);
};

process.on('exit', (code) => {
    const logHeader = `Sync Audit Report - v${version}\nExecuted: ${new Date().toLocaleString()}\nExit Status: ${code === 0 ? 'Success' : 'Failed'}\n${'='.repeat(50)}\n\n`;
    fs.writeFileSync(path.join(__dirname, 'last-sync-audit.log'), logHeader + auditTrail.join('\n'));
    originalLog(`${colors.gray}\nAudit report archived to last-sync-audit.log${colors.reset}`);
});

const isDryRun = process.argv.includes('--dry-run');
const shouldPush = process.argv.includes('--push');

const dateObj = new Date();
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dateStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

const filesToUpdate = [
    { file: 'storage.js', regex: /const APP_VERSION = ".*";/, type: 'js_const' },
    { file: 'sw.js', regex: /const CACHE_NAME = 'trahreg-tinnitus-suite-v.*';/, type: 'js_const_cache' },
    { file: 'manifest.json', regex: /"version": ".*",/, type: 'json_field' },
    { file: 'maintenance.json', regex: /"version": ".*"/, type: 'json_field_no_comma' },
    { file: 'maintenance.json', regex: /"date": ".*",/, type: 'json_date' }
];

filesToUpdate.forEach(cfg => {
    const filePath = path.join(__dirname, cfg.file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let replacement;
        if (cfg.type === 'js_const') {
            replacement = `const APP_VERSION = "${version}";`;
        } else if (cfg.type === 'js_const_cache') {
            replacement = `const CACHE_NAME = 'trahreg-tinnitus-suite-v${version}';`;
        } else if (cfg.type === 'json_field') {
            replacement = `"version": "${version}",`;
        } else if (cfg.type === 'json_field_no_comma') {
            replacement = `"version": "${version}"`;
        } else if (cfg.type === 'json_date') {
            replacement = `"date": "${dateStr}",`;
        } else {
            console.warn(`Unknown type for file ${cfg.file}, skipping.`);
            return;
        }

        if (isDryRun) {
            console.log(`[Dry Run] Would update ${cfg.file} to version ${version}`);
        } else {
            content = content.replace(cfg.regex, replacement);
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${cfg.file} to version ${version}`);
        }
    }
});

/**
 * DSP Stability Audit
 * Performs static analysis on the AudioWorklet to prevent real-time thread crashes
 * and timing jitters (instability) caused by blocking calls or GC pauses.
 */
function validateDSP() {
    const filePath = path.join(__dirname, 'noise-processor.js');
    if (!fs.existsSync(filePath)) return true;

    console.log(`\n${colors.cyan}--- DSP Stability Audit ---${colors.reset}`);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Syntax Validation: Ensures the worklet can actually be parsed
    try {
        execSync(`node --check "${filePath}"`, { stdio: 'ignore' });
        console.log(`${colors.gray}✅ Syntax check passed.${colors.reset}`);
    } catch (e) {
        console.error(`${colors.yellow}❌ Syntax Error: noise-processor.js has errors and will crash the engine.${colors.reset}`);
        return false;
    }

    // 2. Real-time Safety: Scan the process loop for forbidden blocking calls
    const processMethod = content.match(/process\s*\([^)]*\)\s*\{([\s\S]*?)\s+return\s+true;?\s*\}/);
    if (processMethod) {
        const code = processMethod[1];
        if (code.includes('console.')) {
            console.error(`${colors.yellow}❌ Stability Risk: console.log() detected inside the process() loop.${colors.reset}`);
            console.log(`${colors.gray}   Logging in the audio thread causes timing jitters and audio dropouts.${colors.reset}`);
            return false;
        }
        if (code.includes('new ')) {
            console.error(`${colors.yellow}❌ Stability Risk: Dynamic allocation ('new') detected in process() loop.${colors.reset}`);
            console.log(`${colors.gray}   Object creation causes Garbage Collection pauses in the audio thread.${colors.reset}`);
            return false;
        }
    }

    console.log(`${colors.green}✅ DSP Audit Passed.${colors.reset}`);
    return true;
}

/**
 * WASM Integration Audit
 * Scans noise-processor.js to ensure every noise color (and nature sound)
 * has a corresponding WASM export call within its specific branch.
 */
function validateWasmIntegration() {
    const filePath = path.join(__dirname, 'noise-processor.js');
    if (!fs.existsSync(filePath)) return true;

    console.log(`\n${colors.cyan}--- WASM Integration Audit ---${colors.reset}`);
    const content = fs.readFileSync(filePath, 'utf8');

    const expected = [
        { name: 'pink', match: "color === 'pink'", call: 'this.wasmInstance.exports.fillPink' },
        { name: 'red', match: "color === 'red'", call: 'this.wasmInstance.exports.fillRed' },
        { name: 'chimes', match: "color === 'chimes'", call: 'this.wasmInstance.exports.fillChimes' },
        { name: 'rain', match: "color === 'rain'", call: 'this.wasmInstance.exports.fillRain' },
        { name: 'ocean', match: "color === 'ocean'", call: 'this.wasmInstance.exports.fillOcean' },
        { name: 'brown', match: "color === 'brown'", call: 'this.wasmInstance.exports.fillBrown' },
        { name: 'blue', match: "color === 'blue'", call: 'this.wasmInstance.exports.fillBlue' },
        { name: 'violet', match: "color === 'violet'", call: 'this.wasmInstance.exports.fillViolet' },
        { name: 'white', match: "} else if (color === 'white') {", call: 'this.wasmInstance.exports.fillWhite' }
    ];

    let allPassed = true;
    expected.forEach(item => {
        const parts = content.split(item.match);
        if (parts.length < 2) {
            console.error(`${colors.yellow}❌ Branch for ${item.name} not found in noise-processor.js.${colors.reset}`);
            allPassed = false;
            return;
        }

        // Isolate the branch body to ensure the call is in the right place
        const branchBody = parts[1].split('else if')[0].split('_applyFinalGain')[0];

        if (branchBody.includes(item.call)) {
            console.log(`${colors.gray}✅ ${item.name.padEnd(10)} -> WASM integration verified.${colors.reset}`);
        } else {
            console.error(`${colors.yellow}❌ Missing WASM call in ${item.name} branch. Expected: ${item.call}${colors.reset}`);
            allPassed = false;
        }
    });

    if (allPassed) console.log(`${colors.green}✅ WASM Integration Audit Passed.${colors.reset}`);
    return allPassed;
}

/**
 * WASM Clinical Safety Audit (HPF)
 * Verifies that the DC-blocking High-Pass Filter is implemented in critical
 * noise functions to prevent sub-sonic drift and protect hardware.
 */
function validateWasmHPF() {
    const filePath = path.join(__dirname, 'noise-generator.wat');
    if (!fs.existsSync(filePath)) return true;

    console.log(`\n${colors.cyan}--- WASM Clinical Safety Audit ---${colors.reset}`);
    const content = fs.readFileSync(filePath, 'utf8');

    // Regex looks for the subtraction followed by the 0.997 decay coefficient logic
    const hpfRegex = /f32\.sub\s+f32\.const\s+0\.997[\s\S]*?f32\.mul\s+f32\.add/;

    const expected = ['fillPink', 'fillRed', 'fillRain', 'fillBrown'];
    let allPassed = true;

    expected.forEach(funcName => {
        const parts = content.split(`(export "${funcName}")`);
        if (parts.length < 2) {
            console.error(`${colors.yellow}❌ Function ${funcName} not found in noise-generator.wat.${colors.reset}`);
            allPassed = false;
            return;
        }

        // Isolate the function body until the next export or function definition
        const funcBody = parts[1].split('(export')[0].split('(func')[0];

        if (hpfRegex.test(funcBody)) {
            console.log(`${colors.gray}✅ ${funcName.padEnd(10)} -> DC Blocker (HPF) verified.${colors.reset}`);
        } else {
            console.error(`${colors.yellow}❌ Safety Risk: Missing or invalid HPF math in ${funcName}.${colors.reset}`);
            allPassed = false;
        }
    });

    if (allPassed) console.log(`${colors.green}✅ WASM Clinical Safety Audit Passed.${colors.reset}`);
    return allPassed;
}

/**
 * WASM Memory Audit
 * Ensures that the memory offsets used in noise-processor.js (JS) 
 * match the constant definitions in noise-generator.wat (WASM).
 * Prevents buffer collisions and state corruption.
 */
function validateWasmMemory() {
    const processorPath = path.join(__dirname, 'noise-processor.js');
    const watPath = path.join(__dirname, 'noise-generator.wat');
    if (!fs.existsSync(processorPath) || !fs.existsSync(watPath)) return true;

    console.log(`\n${colors.cyan}--- WASM Memory Audit ---${colors.reset}`);
    const jsContent = fs.readFileSync(processorPath, 'utf8');
    const watContent = fs.readFileSync(watPath, 'utf8');

    // 1. Extract outPtr from JS
    const outPtrMatch = jsContent.match(/const outPtr = (\d+);/);
    if (!outPtrMatch) {
        console.error(`${colors.yellow}❌ Could not find outPtr definition in noise-processor.js.${colors.reset}`);
        return false;
    }
    const outPtr = parseInt(outPtrMatch[1]);

    // 2. Extract state offsets from JS (e.g., heap[40 / 4])
    const jsOffsets = new Set();
    const heapRegex = /heap\[(\d+)\s*\/\s*4/g;
    let match;
    while ((match = heapRegex.exec(jsContent)) !== null) {
        jsOffsets.add(parseInt(match[1]));
    }

    // 3. Extract memory constants from WAT (i32.const X)
    const watOffsets = new Set();
    const constRegex = /(?:load|store).*?i32\.const\s+(\d+)/g;
    while ((match = constRegex.exec(watContent)) !== null) {
        const val = parseInt(match[1]);
        if (val < outPtr) watOffsets.add(val);
    }

    let allPassed = true;

    // Check for collisions: outPtr must be greater than any state offset
    const maxStateOffset = Math.max(...watOffsets, ...jsOffsets, 0);
    if (outPtr <= maxStateOffset) {
        console.error(`${colors.yellow}❌ Memory Collision: outPtr (${outPtr}) overlaps with state memory (max offset: ${maxStateOffset}).${colors.reset}`);
        allPassed = false;
    } else {
        console.log(`${colors.gray}✅ Buffer Safety: outPtr (${outPtr}) is safely above max state offset (${maxStateOffset}).${colors.reset}`);
    }

    // Check for Mismatches: Every offset JS touches should exist in WAT logic
    jsOffsets.forEach(offset => {
        if (!watOffsets.has(offset)) {
            console.error(`${colors.yellow}❌ Memory Mismatch: Offset ${offset} is initialized in JS but not used in WAT.${colors.reset}`);
            allPassed = false;
        } else {
            console.log(`${colors.gray}✅ Offset ${offset.toString().padEnd(3)} verified in both JS and WAT.${colors.reset}`);
        }
    });

    if (allPassed) console.log(`${colors.green}✅ WASM Memory Audit Passed.${colors.reset}`);
    return allPassed;
}

/**
 * Peak Target Safety Audit
 * Ensures that all noise color peak targets in noise-processor.js
 * stay within safe digital headroom limits (< 0.9) to prevent
 * downstream clipping in the gain stage.
 */
function validatePeakLimits() {
    const filePath = path.join(__dirname, 'noise-processor.js');
    if (!fs.existsSync(filePath)) return true;

    console.log(`\n${colors.cyan}--- Peak Target Safety Audit ---${colors.reset}`);
    const content = fs.readFileSync(filePath, 'utf8');

    const peakMapMatch = content.match(/this\.peakMap\s*=\s*\{([\s\S]*?)\};/);
    if (!peakMapMatch) {
        console.error(`${colors.yellow}❌ Could not find peakMap definition in noise-processor.js.${colors.reset}`);
        return false;
    }

    const peakLines = peakMapMatch[1].split('\n');
    let allPassed = true;

    peakLines.forEach(line => {
        const match = line.match(/'([^']+)':\s*([\d\.]+)/);
        if (match) {
            const colorName = match[1];
            const peakVal = parseFloat(match[2]);

            if (peakVal >= 0.9) {
                console.error(`${colors.yellow}❌ Unsafe Peak: ${colorName} is set to ${peakVal} (Limit: 0.9). Potential for clipping.${colors.reset}`);
                allPassed = false;
            } else {
                console.log(`${colors.gray}✅ ${colorName.padEnd(10)} -> Peak ${peakVal} is within safe bounds.${colors.reset}`);
            }
        }
    });

    if (allPassed) console.log(`${colors.green}✅ Peak Target Safety Audit Passed.${colors.reset}`);
    return allPassed;
}

/**
 * Nature Sound Audit
 * Verifies that all therapeutic MP3 files are correctly mapped.
 * 1. Ensures MP3s listed in sw.js exist in the audio folder.
 * 2. Ensures all MP3s in the audio folder are tracked in sw.js for offline use.
 */
function validateNatureSounds() {
    const swPath = path.join(__dirname, 'sw.js');
    const audioDir = path.join(__dirname, 'audio');
    if (!fs.existsSync(swPath) || !fs.existsSync(audioDir)) return true;

    console.log(`\n${colors.cyan}--- Nature Sound Audit ---${colors.reset}`);
    const content = fs.readFileSync(swPath, 'utf8');
    const assetsMatch = content.match(/const ASSETS = \[([\s\S]*?)\];/);
    if (!assetsMatch) return true;

    const assetEntries = (assetsMatch[1].match(/'[^']+'/g) || []).map(s => s.slice(1, -1));
    const mp3sInAssets = assetEntries.filter(a => a.endsWith('.mp3'));
    const filesInAudio = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

    let allPassed = true;

    // Check 1: Do MP3s in ASSETS exist?
    mp3sInAssets.forEach(asset => {
        const fullPath = path.join(__dirname, asset);
        if (!fs.existsSync(fullPath)) {
            console.error(`${colors.yellow}❌ Missing Sound: ${asset} is in sw.js but missing from /audio folder.${colors.reset}`);
            allPassed = false;
        } else {
            const stats = fs.statSync(fullPath);
            const sizeKB = stats.size / 1024;
            if (sizeKB < 100) {
                console.error(`${colors.yellow}❌ Corrupt Sound: ${asset} is too small (${sizeKB.toFixed(2)}KB). Min: 100KB.${colors.reset}`);
                allPassed = false;
            } else {
                console.log(`${colors.gray}✅ Verified: ${asset} (${sizeKB.toFixed(2)}KB)${colors.reset}`);
            }
        }
    });

    // Check 2: Are all folder MP3s tracked?
    filesInAudio.forEach(file => {
        const relativePath = `./audio/${file}`;
        if (!mp3sInAssets.includes(relativePath)) {
            console.error(`${colors.yellow}❌ Untracked Sound: ${relativePath} exists but is not in sw.js ASSETS.${colors.reset}`);
            allPassed = false;
        }
        // Check size of even untracked files to ensure folder hygiene
        const fullPath = path.join(audioDir, file);
        const sizeKB = fs.statSync(fullPath).size / 1024;
        if (sizeKB < 100) {
            console.error(`${colors.yellow}❌ Corrupt File: ${relativePath} is too small (${sizeKB.toFixed(2)}KB). Cleanup required.${colors.reset}`);
            allPassed = false;
        }
    });

    if (allPassed) console.log(`${colors.green}✅ Nature Sound Audit Passed.${colors.reset}`);
    return allPassed;
}

/**
 * Audio Metadata Audit
 * Verifies that all nature sounds (MP3) have a consistent clinical 
 * sample rate of 44.1kHz. Higher or lower rates can cause pitch 
 * distortions or timing drifts in the therapy engine.
 */
async function validateAudioSampleRate() {
    // This check requires 'music-metadata'. 
    // Recommended version for CommonJS: npm install music-metadata@7.13.4
    let mm;
    try {
        mm = require('music-metadata');
    } catch (e) {
        console.warn(`\n${colors.yellow}⚠️ Skipping Audio Metadata Audit: 'music-metadata' library not found.${colors.reset}`);
        console.log(`${colors.gray}   To enable this check, run: npm install music-metadata@7.13.4${colors.reset}`);
        return true;
    }

    const audioDir = path.join(__dirname, 'audio');
    if (!fs.existsSync(audioDir)) return true;

    console.log(`\n${colors.cyan}--- Audio Metadata Audit ---${colors.reset}`);
    const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

    let allPassed = true;
    for (const file of files) {
        const fullPath = path.join(audioDir, file);
        try {
            const metadata = await mm.parseFile(fullPath);
            const sr = metadata.format.sampleRate;
            const isVbr = metadata.format.vbr;
            if (sr !== 44100) {
                console.error(`${colors.yellow}❌ Sample Rate Mismatch: ${file} is ${sr}Hz (Expected: 44100Hz).${colors.reset}`);
                allPassed = false;
            } else if (isVbr) {
                console.error(`${colors.yellow}❌ VBR Detected: ${file} uses Variable Bitrate. Looping requires CBR.${colors.reset}`);
                allPassed = false;
            } else {
                console.log(`${colors.gray}✅ ${file.padEnd(20)} -> ${sr}Hz, CBR verified.${colors.reset}`);
            }
        } catch (err) {
            console.error(`${colors.yellow}❌ Metadata Error: Could not read ${file}.${colors.reset}`);
            allPassed = false;
        }
    }

    if (allPassed) console.log(`${colors.green}✅ Audio Metadata Audit Passed.${colors.reset}`);
    return allPassed;
}

/**
 * PWA Asset Audit
 * Ensures that every local file listed in the Service Worker (sw.js)
 * actually exists on the disk to prevent PWA installation failures.
 * Automatically discovers and adds new .html files to the ASSETS array.
 */
function validateAssets() {
    const swPath = path.join(__dirname, 'sw.js');
    if (!fs.existsSync(swPath)) return true;

    console.log(`\n${colors.cyan}--- PWA Asset Audit ---${colors.reset}`);
    let content = fs.readFileSync(swPath, 'utf8');
    const assetsArrayRegex = /(const ASSETS = \[)([\s\S]*?)(\];)/;
    const assetsMatch = content.match(assetsArrayRegex);

    if (!assetsMatch) {
        console.warn(`${colors.yellow}⚠️ Warning: Could not find ASSETS array in sw.js for auto-discovery.${colors.reset}`);
        return true;
    }

    const assetsPrefix = assetsMatch[1]; // "const ASSETS = ["
    const assetsContent = assetsMatch[2]; // The content inside the brackets
    const assetsSuffix = assetsMatch[3]; // "];"

    // Extract individual asset paths (local and external)
    const currentAssets = (assetsContent.match(/'[^']+'/g) || [])
        .map(s => s.slice(1, -1)); // Remove quotes

    const existingAssetSet = new Set(currentAssets);
    const newAssetsToCache = [];

    // Discover local assets (.html, .wasm, .mp3) in root and subdirectories
    const scanDirectory = (dir, prefix = './') => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const relativePath = prefix + file;
            const stat = fs.statSync(fullPath);

            if (stat.isFile()) {
                const isTarget = file.endsWith('.html') || file.endsWith('.wasm') || file.endsWith('.mp3');
                if (isTarget) {
                    // Exclude specific HTML files that are dynamically generated or special cases
                    if (file.endsWith('.html') && ['./user_manual.html', './presentation.html', './handout.html'].includes(relativePath)) {
                        return;
                    }
                    if (!existingAssetSet.has(relativePath)) {
                        newAssetsToCache.push(relativePath);
                    }
                }
            } else if (stat.isDirectory()) {
                // Only scan specific subdirectories for performance and safety
                if (file === 'docs' || file === 'audio') {
                    scanDirectory(fullPath, `./${file}/`);
                }
            }
        });
    };
    scanDirectory(__dirname);

    if (newAssetsToCache.length > 0) {
        console.log(`${colors.cyan}Discovered new assets (.html, .wasm, .mp3) to add to sw.js ASSETS:${colors.reset}`);
        newAssetsToCache.forEach(file => console.log(`  - ${file}`));

        // Find the insertion point: before the first external URL
        let insertionIndex = currentAssets.length;
        for (let i = 0; i < currentAssets.length; i++) {
            if (currentAssets[i].startsWith('https://')) {
                insertionIndex = i;
                break;
            }
        }

        // Insert new assets, sorted alphabetically, before external assets
        const updatedAssets = [...currentAssets.slice(0, insertionIndex), ...newAssetsToCache.sort(), ...currentAssets.slice(insertionIndex)];
        const newAssetsContent = updatedAssets.map(p => `    '${p}',`).join('\n');
        content = assetsPrefix + '\n' + newAssetsContent + '\n' + assetsSuffix; // Update content for writing and subsequent checks
        fs.writeFileSync(swPath, content);
        console.log(`${colors.green}✅ ASSETS array in sw.js updated with new local assets.${colors.reset}`);
    }

    // Re-parse content after potential update for the missing file check
    const finalAssetsMatch = content.match(assetsArrayRegex);
    if (!finalAssetsMatch) {
        console.error(`${colors.yellow}❌ Error: ASSETS array structure changed unexpectedly in sw.js!${colors.reset}`);
        return false;
    }

    const finalAssetsContent = finalAssetsMatch[2];
    const finalEntries = (finalAssetsContent.match(/'[^']+'/g) || [])
        .map(s => s.slice(1, -1)); // Remove quotes

    let allFound = true;
    finalEntries.forEach(entry => { // Use finalEntries here
        if (entry.startsWith('http')) return; // Skip external CDNs

        const localPath = entry === './' ? __dirname : path.join(__dirname, entry);
        if (!fs.existsSync(localPath)) {
            console.error(`${colors.yellow}❌ Missing Asset: ${entry}${colors.reset}`);
            allFound = false;
        }
    });

    if (allFound) console.log(`${colors.green}✅ All local PWA assets (including newly added HTML) verified on disk.${colors.reset}`);
    return allFound;
}

/**
 * Git Automation
 * Automatically stages the updated files, commits, and creates a release tag.
 */
(async () => {
    try {
        // Run Stability and Asset Audits before allowing any Git operations
        const isDSPValid = validateDSP();
        const areAssetsValid = validateAssets();
        const isWasmValid = validateWasmIntegration();
        const isHpfValid = validateWasmHPF();
        const isMemValid = validateWasmMemory();
        const isPeakValid = validatePeakLimits();
        const isSoundsValid = validateNatureSounds();
        const isSampleRateValid = await validateAudioSampleRate();

        if (!isDSPValid || !areAssetsValid || !isWasmValid || !isHpfValid || !isMemValid || !isPeakValid || !isSoundsValid || !isSampleRateValid) {
            console.error(`\n${colors.yellow}Aborting: Pre-flight checks failed. Fix the issues above before pushing.${colors.reset}`);
            process.exit(1);
        }

        // Ensure we are in a Git repository
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

        if (currentBranch !== 'main') {
            console.warn(`\n${colors.yellow}⚠️ Note: You are on branch '${currentBranch}'. Releases are usually created on 'main'.${colors.reset}`);
        }

        const status = execSync('git status --porcelain').toString().trim();

        let pushed = false;
        if (status) {
            console.log(`\n${colors.cyan}--- Git Automation ---${colors.reset}`);

            // Safety Feature: Create a recovery checkpoint branch of the current state
            const checkpointName = `checkpoint/pre-v${version}-${Date.now()}`;
            console.log(`${colors.gray}Creating recovery checkpoint: ${checkpointName}${colors.reset}`);
            execSync(`git branch ${checkpointName}`);

            console.log(`${colors.gray}Staging changes on ${currentBranch} and creating commit...${colors.reset}`);
            execSync('git add .');
            execSync(`git commit -m "chore: release v${version}"`);

            console.log(`${colors.gray}Creating annotated tag: v${version}${colors.reset}`);
            execSync(`git tag -a v${version} -m "${dateStr} Release"`);

            if (shouldPush) {
                const answer = await new Promise(resolve => {
                    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                    const timeout = setTimeout(() => {
                        rl.close();
                        process.stdout.write(`\n${colors.yellow}Timed out. Defaulting to "no".${colors.reset}\n`);
                        resolve('n');
                    }, 10000); // 10 second timeout

                    rl.question(`\n${colors.yellow}⚠️ Confirm push to origin/${currentBranch} and tags? (y/n) [10s timeout]: ${colors.reset}`, (ans) => {
                        clearTimeout(timeout);
                        rl.close();
                        resolve(ans.trim().toLowerCase());
                    });
                });

                if (answer === 'y' || answer === 'yes') {
                    console.log(`Pushing changes and tags to origin/${currentBranch}...`);
                    execSync(`git push origin ${currentBranch} --tags`);
                    console.log(`${colors.green}✅ Remote updated successfully.${colors.reset}`);
                    pushed = true;
                } else {
                    console.log('Push aborted. Changes remain local.');
                }
            }

            console.log(`\n${colors.green}✅ Success: v${version} is ready.${colors.reset}`);
            console.log(`${colors.cyan}   Recovery Branch: ${checkpointName}${colors.reset}`);
            if (!pushed) {
                console.log(`\n${colors.cyan}To publish:   git push origin ${currentBranch} --tags${colors.reset}`);
            }
            console.log(`${colors.cyan}To undo:      git tag -d v${version} && git reset --soft HEAD~1${colors.reset}`);
            console.log(`${colors.cyan}To recover:   git checkout ${checkpointName}${colors.reset}`);
        }
    } catch (e) {
        console.warn('\n⚠️ Git automation skipped. (Repo not found or Git not installed)');
    }
})();