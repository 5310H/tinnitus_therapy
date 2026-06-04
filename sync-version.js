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
    const newHtmlFilesToCache = [];

    // Discover local HTML files in root and 'docs' subdirectory
    const scanDirectory = (dir, prefix = './') => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const relativePath = prefix + file;
            if (fs.statSync(fullPath).isFile() && file.endsWith('.html')) {
                // Exclude specific HTML files that are dynamically generated or special cases
                if (['./user_manual.html', './presentation.html', './handout.html'].includes(relativePath)) {
                    return;
                }
                if (!existingAssetSet.has(relativePath)) {
                    newHtmlFilesToCache.push(relativePath);
                }
            } else if (fs.statSync(fullPath).isDirectory() && file === 'docs') {
                scanDirectory(fullPath, './docs/');
            }
        });
    };
    scanDirectory(__dirname);

    if (newHtmlFilesToCache.length > 0) {
        console.log(`${colors.cyan}Discovered new HTML files to add to sw.js ASSETS:${colors.reset}`);
        newHtmlFilesToCache.forEach(file => console.log(`  - ${file}`));

        // Find the insertion point: before the first external URL
        let insertionIndex = currentAssets.length;
        for (let i = 0; i < currentAssets.length; i++) {
            if (currentAssets[i].startsWith('https://')) {
                insertionIndex = i;
                break;
            }
        }

        // Insert new HTML files, sorted alphabetically, before external assets
        const updatedAssets = [...currentAssets.slice(0, insertionIndex), ...newHtmlFilesToCache.sort(), ...currentAssets.slice(insertionIndex)];
        const newAssetsContent = updatedAssets.map(p => `    '${p}',`).join('\n');
        content = assetsPrefix + '\n' + newAssetsContent + '\n' + assetsSuffix; // Update content for writing and subsequent checks
        fs.writeFileSync(swPath, content);
        console.log(`${colors.green}✅ ASSETS array in sw.js updated with new HTML files.${colors.reset}`);
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

        if (!isDSPValid || !areAssetsValid) {
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