const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

function assess(report, lock) {
    if (!report.metadata || !report.vulnerabilities || report.error) throw new Error('Dependency audit did not complete');
    const blockers = [];
    for (const [name, entry] of Object.entries(report.vulnerabilities)) {
        if (!entry.nodes?.length || entry.nodes.some(node => lock.packages[node]?.dev !== true)) {
            blockers.push(`${name}: runtime or unknown dependency`);
        }
        for (const via of entry.via) {
            if (typeof via === 'string') {
                if (!report.vulnerabilities[via]) blockers.push(`${name}: unknown advisory chain ${via}`);
                continue;
            }
            // Unpatched upstream Stylelint glob dependency. Repository-controlled
            // patterns only; never shipped in main.js. Do not accept other CVEs.
            const accepted = name === 'braces'
                && via.url === 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'
                && entry.fixAvailable === false;
            if (!accepted) blockers.push(`${name}: ${via.url}`);
        }
    }
    return blockers;
}
module.exports = { assess };
if (require.main === module) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], {
        encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 120000, shell: process.platform === 'win32',
    });
    if (result.error || ![0, 1].includes(result.status)) throw result.error || new Error(result.stderr || 'npm audit failed');
    const report = JSON.parse(result.stdout);
    const blockers = assess(report, JSON.parse(fs.readFileSync('package-lock.json', 'utf8')));
    if (blockers.length) throw new Error(`Dependency audit blocked release:\n${blockers.join('\n')}`);
    console.log('Dependency audit passed (unpatched dev-only braces advisory explicitly accepted; all new/runtime advisories block).');
}
