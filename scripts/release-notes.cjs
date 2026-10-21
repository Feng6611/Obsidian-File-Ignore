const fs = require('node:fs');
const version = require('../manifest.json').version;
const text = fs.readFileSync('CHANGELOG.md', 'utf8').split(`## ${version}\n`)[1];
if (!text) throw new Error('Missing changelog');
process.stdout.write(text.split('\n## ')[0].trim() + '\n');
