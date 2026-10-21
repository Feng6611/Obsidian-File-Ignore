const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../scripts/audit-dependencies.cjs');
test('audit exception never permits runtime vulnerabilities, new advisories, or a patched exception', () => {
    const report={metadata:{},vulnerabilities:{braces:{nodes:['node_modules/braces'],via:[{url:'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'}],fixAvailable:false}}};
    const lock={packages:{'node_modules/braces':{dev:true}}};
    assert.deepEqual(assess(report,lock),[]);
    assert.ok(assess(report,{packages:{'node_modules/braces':{}}}).length);
    const clone=()=>JSON.parse(JSON.stringify(report));
    const unknown=clone();unknown.vulnerabilities.braces.via.push({url:'https://github.com/advisories/new'});
    assert.ok(assess(unknown,lock).length);
    const fixed=clone();fixed.vulnerabilities.braces.fixAvailable={name:'braces',version:'3.0.4'};
    assert.ok(assess(fixed,lock).length);
    assert.throws(()=>assess({error:{}},lock));
});
