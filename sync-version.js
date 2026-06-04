const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const packageJson = require('./package.json');
const version = packageJson.version;

const isDryRun = process.argv.includes('--dry-run');

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
 * Git Automation
 * Automatically stages the updated files, commits, and creates a release tag.
 */
try {
    if (isDryRun) {
        console.log('\n[Dry Run] Skipping Git automation.');
        process.exit(0);
    }

    // Ensure we are in a Git repository
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

    if (currentBranch !== 'main') {
        console.warn(`\n⚠️ Note: You are on branch '${currentBranch}'. Releases are usually created on 'main'.`);
    }

    const status = execSync('git status --porcelain').toString().trim();

    if (status) {
        console.log('\n--- Git Automation ---');

        // Safety Feature: Create a recovery checkpoint branch of the current state
        const checkpointName = `checkpoint/pre-v${version}-${Date.now()}`;
        console.log(`Creating recovery checkpoint: ${checkpointName}`);
        execSync(`git branch ${checkpointName}`);

        console.log(`Staging changes on ${currentBranch} and creating commit...`);
        execSync('git add .');
        execSync(`git commit -m "chore: release v${version}"`);

        console.log(`Creating annotated tag: v${version}`);
        execSync(`git tag -a v${version} -m "${dateStr} Release"`);

        console.log(`\n✅ Success: v${version} is ready.`);
        console.log(`   Recovery Branch: ${checkpointName}`);
        console.log(`\nTo publish:   git push origin ${currentBranch} --tags`);
        console.log(`To undo:      git tag -d v${version} && git reset --soft HEAD~1`);
        console.log(`To recover:   git checkout ${checkpointName}`);
    }
} catch (e) {
    console.warn('\n⚠️ Git automation skipped. (Repo not found or Git not installed)');
}