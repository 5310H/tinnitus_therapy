const fs = require('fs');
const path = require('path');

// 1. Extract version from storage.js
const storagePath = path.join(__dirname, 'storage.js');
const storageContent = fs.readFileSync(storagePath, 'utf8');
const versionMatch = storageContent.match(/const APP_VERSION = "(.+?)";/);

if (!versionMatch) {
    console.error("Could not find APP_VERSION in storage.js");
    process.exit(1);
}

const version = versionMatch[1];
console.log(`Syncing version: ${version}`);

// 2. Update package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 3. Update sw.js (Crucial for Service Worker cache update)
const swPath = path.join(__dirname, 'sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(
    /const CACHE_NAME = 'trahreg-tinnitus-suite-v.+?';/, 
    `const CACHE_NAME = 'trahreg-tinnitus-suite-v${version}';`
);
fs.writeFileSync(swPath, swContent);

// 4. Update manifest.json
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log("Successfully synchronized package.json, sw.js, and manifest.json");