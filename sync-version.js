const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const version = packageJson.version;

const filesToUpdate = [
    { file: 'storage.js', regex: /const APP_VERSION = ".*";/, type: 'js_const' },
    { file: 'sw.js', regex: /const CACHE_NAME = 'trahreg-tinnitus-suite-v.*';/, type: 'js_const_cache' },
    { file: 'manifest.json', regex: /"version": ".*",/, type: 'json_field' }
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
        } else {
            console.warn(`Unknown type for file ${cfg.file}, skipping.`);
            return;
        }
        
        content = content.replace(cfg.regex, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${cfg.file} to version ${version}`);
    }
});