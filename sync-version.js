const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');
const version = packageJson.version;

const filesToUpdate = [
    { file: 'storage.js', regex: /const APP_VERSION = ".*";/ },
    { file: 'sw.js', regex: /const CACHE_NAME = 'trahreg-tinnitus-suite-v.*';/ }
];

filesToUpdate.forEach(cfg => {
    const filePath = path.join(__dirname, cfg.file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let replacement = cfg.file === 'sw.js' 
            ? `const CACHE_NAME = 'trahreg-tinnitus-suite-v${version}';`
            : `const APP_VERSION = "${version}";`;
        
        content = content.replace(cfg.regex, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${cfg.file} to version ${version}`);
    }
});