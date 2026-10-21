const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { buildSync } = require('esbuild');
class TFile {}
class TFolder {}
function load(entry, obsidian = {}) {
    const code = buildSync({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['obsidian'] }).outputFiles[0].text;
    const module = { exports: {} };
    vm.runInNewContext(code, { module, exports: module.exports, process, console, require: id => id === 'obsidian' ? { TFile, TFolder, ...obsidian } : require(id) });
    return module.exports;
}
const { FileOperations } = load('src/fileOperations.ts');
function fixture(t, configDir = '.obsidian') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-ignore-test-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const adapter = { getBasePath: () => dir, rename: async (a,b) => fs.renameSync(path.join(dir,a), path.join(dir,b)) };
    const vault = { adapter, configDir, getAbstractFileByPath: () => null };
    const ops = new FileOperations(vault);
    const write = (name, text = 'original') => { fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true}); fs.writeFileSync(path.join(dir,name),text); };
    return { dir, ops, vault, write };
}
test('show preserves original dotfiles; recorded hide restores after restart', async t => {
    const {ops,write,dir,vault} = fixture(t);
    write('.gitignore'); write('.DS_Store'); write('note.md');
    const files = await ops.getFilesToProcess(['*']);
    assert.equal(ops.buildRenamePlan(files,false).items.length,0);
    const plan=ops.buildRenamePlan(files,true);
    assert.deepEqual(Array.from(plan.items,x=>x.oldPath), ['note.md']);
    const result=await ops.executePlanItem(plan.items[0],'hide');
    const restarted=new FileOperations(vault);
    const batch={action:'hide',pending:[],completed:[result.operation]};
    const matches=await restarted.getFilesToProcess(['*']);
    const restore=restarted.buildRenamePlan(matches,false,batch);
    assert.equal(restore.items.length,1);
    assert.equal(restore.items[0].newPath,'note.md');
    await restarted.executePlanItem(restore.items[0],'show');
    assert.equal(fs.readFileSync(path.join(dir,'note.md'),'utf8'),'original');
    assert.ok(fs.existsSync(path.join(dir,'.gitignore')));
    assert.ok(fs.existsSync(path.join(dir,'.DS_Store')));
});
test('collision never overwrites either file, including conflict after preview', async t => {
    const {ops,write,dir}=fixture(t); write('note.md');
    const plan=ops.buildRenamePlan(await ops.getFilesToProcess(['note.md']),true);
    write('.note.md','destination');
    const result=await ops.executePlanItem(plan.items[0],'hide');
    assert.equal(result.success,false);
    assert.equal(fs.readFileSync(path.join(dir,'note.md'),'utf8'),'original');
    assert.equal(fs.readFileSync(path.join(dir,'.note.md'),'utf8'),'destination');
    assert.equal(ops.buildRenamePlan(await ops.getFilesToProcess(['note.md']),true).skippedConflicts,1);
});
test('parent rename skips children; custom config, Git and trash stay protected', async t => {
    const {ops,write}=fixture(t,'custom/settings');
    write('temp/child.md');write('custom/notes/note.md');write('custom/settings/plugins/x.json');write('.git/config');write('.trash/x');
    const plan=ops.buildRenamePlan(await ops.getFilesToProcess(['**/*']),true);
    assert.ok(!plan.items.some(x=>x.oldPath==='custom'||x.oldPath.startsWith('custom/settings')));
    assert.ok(plan.items.some(x=>x.oldPath==='custom/notes'));
    const sibling = await ops.getFilesToProcess(['custom/notes/note.md']);
    assert.equal(sibling.length,1);
    assert.equal(ops.buildRenamePlan(sibling,true).items[0].oldPath,'custom/notes/note.md');
    assert.ok(!plan.items.some(x=>x.oldPath.startsWith('.git')||x.oldPath.startsWith('.trash')));
    assert.ok(plan.items.some(x=>x.oldPath==='temp'));
    assert.ok(!plan.items.some(x=>x.oldPath==='temp/child.md'));
});
test('broken links and directory links are listed without following them', {skip:process.platform==='win32'}, async t => {
    const {ops,write,dir}=fixture(t); write('target/child.md');
    fs.symlinkSync('missing',path.join(dir,'broken'));
    fs.symlinkSync('target',path.join(dir,'alias'));
    const files=await ops.getFilesToProcess(['*']);
    assert.ok(files.some(x=>x.path==='broken'));
    assert.ok(!files.some(x=>x.path.startsWith('alias/')));
});
test('rollback restores renamed contents and refuses occupied destination', async t => {
    const {ops,write,dir}=fixture(t);write('note.md');
    const plan=ops.buildRenamePlan(await ops.getFilesToProcess(['note.md']),true);
    const result=await ops.executePlanItem(plan.items[0],'hide');
    write('note.md','new file');
    await assert.rejects(ops.rollbackBatch([result.operation]),/target path already exists/);
    assert.equal(fs.readFileSync(path.join(dir,'note.md'),'utf8'),'new file');
    fs.unlinkSync(path.join(dir,'note.md'));
    const rollback=await ops.rollbackBatch([result.operation]);
    assert.equal(rollback.restored,1);
    assert.equal(fs.readFileSync(path.join(dir,'note.md'),'utf8'),'original');
});
test('rename confirmation uses translations and resolves on dismiss or proceed', async () => {
    let modal; const buttons=[];
    const element={empty(){},createEl(){return this;},createDiv(){return this;}};
    class Modal { constructor(){this.contentEl=element;modal=this;} open(){this.onOpen();} close(){this.onClose();} }
    class ButtonComponent { constructor(){buttons.push(this);} setButtonText(text){this.text=text;return this;} setCta(){return this;} onClick(fn){this.click=fn;return this;} }
    class Setting {setName(){return this;}setHeading(){return this;}}
    const {FileIgnoreSettingTab}=load('src/settings.ts',{PluginSettingTab:class {},Modal,ButtonComponent,Setting});
    const ui=Object.create(FileIgnoreSettingTab.prototype);
    ui.app={};ui.t={confirm:{proceed:'Proceed translated',cancel:'Cancel translated'}};
    const plan={items:[{oldPath:'a',newPath:'.a'}],skippedProtected:0,skippedNested:0,skippedConflicts:0};
    const dismissed=ui.confirmAction(true,plan);modal.close();assert.equal(await dismissed,false);
    const accepted=ui.confirmAction(true,plan);assert.equal(buttons.at(-2).text,'Proceed translated');buttons.at(-2).click();assert.equal(await accepted,true);
});
