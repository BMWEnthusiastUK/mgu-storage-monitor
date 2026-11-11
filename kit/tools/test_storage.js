'use strict';
const assert = require('assert');
const path = require('path');
const Module = require('module');
const ROOT = path.join(__dirname, '..', '..');
const original = Module._load;
Module._load = function (req, parent, isMain) {
    if (req === './kit/mgu') return { run: function () {} };
    if (req.indexOf('./kit/') === 0) return original.call(this, path.join(ROOT, 'kit', 'runtime', req.slice(6)), parent, isMain);
    return original.call(this, req, parent, isMain);
};
const storage = require(path.join(ROOT, 'apps', 'ab_storage', 'main.js'));
const sample = 'Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 10000000 4000000 6000000 40% /var/opt\n';
assert.strictEqual(storage.parseDf(sample).availKB, 6000000);
assert.strictEqual(storage.parseDf('bad'), null);
assert.strictEqual(storage.parseDf('Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/sda1 100 -1 101 50% /\n'), null);
assert.strictEqual(storage.fmt(1048576), '1.07');
const runner = function (command, args) { assert.strictEqual(command, 'df'); assert.strictEqual(args[0], '-Pk'); return sample; };
assert.strictEqual(storage.readVolumes('/var/opt/ab_storage', runner).length, 1, 'same filesystem deduplicated');
assert.strictEqual(storage.readVolumes('/var/opt/ab_storage', function () { throw new Error('unavailable'); })[0].error, 'Not accessible');
console.log('storage: OK');

// Async fallback and de-duplication regressions.
(async function () {
    const fallback = await storage.readVolumesAsync('/missing', function (cmd, args, opts, cb) {
        process.nextTick(function () { args[3] === '/missing' ? cb(new Error('missing')) : cb(null, sample); });
    });
    assert.strictEqual(fallback.find(function (v) { return !v.error; }).availKB, 6000000, 'fallback must remain usable');
    const same = await storage.readVolumesAsync('/var/opt/app', function (cmd, args, opts, cb) {
        process.nextTick(function () { cb(null, sample); });
    });
    assert.strictEqual(same.length, 1, 'async same filesystem deduplicated');
    const failed = await storage.readVolumesAsync('/missing', function (cmd, args, opts, cb) {
        process.nextTick(function () { cb(new Error('not available')); });
    });
    assert.strictEqual(failed.filter(function (v) { return !v.error; }).length, 0);
    console.log('storage async: OK');
})().catch(function (e) { console.error(e); process.exitCode = 1; });
