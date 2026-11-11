'use strict';
/** Read-only filesystem space monitor for BMW MGU. Node 8 compatible. */
const cp = require('child_process');
const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const { withAlpha } = require('./kit/canvas');
const W = 1600, H = 520;

function parseDf(output) {
    const lines = String(output).trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    // POSIX df -P output: filesystem, 1024-blocks, used, available, capacity, mounted-on.
    const fields = lines[lines.length - 1].trim().split(/\s+/);
    if (fields.length < 6) return null;
    const total = Number(fields[1]), used = Number(fields[2]), avail = Number(fields[3]);
    if (![total, used, avail].every(function (n) { return isFinite(n) && n >= 0 && Math.floor(n) === n; }) || total <= 0 || used > total || avail > total || used + avail > total + 1024) return null;
    return { device: fields[0], totalKB: total, usedKB: used, availKB: avail, mount: fields.slice(5).join(' ') };
}
function inspect(target, runner) {
    try {
        const out = (runner || cp.execFileSync)('df', ['-Pk', '--', target], { encoding: 'utf8', timeout: 2500 });
        return parseDf(out);
    } catch (e) { return null; }
}
function readVolumes(dataDir, runner) {
    // The app data directory is the primary target: it reflects space accessible to this app.
    // /var/opt is informative only and may resolve to the same filesystem.
    const candidates = [{ label: 'APP DATA STORAGE', target: dataDir }, { label: 'VAR OPT STORAGE', target: '/var/opt' }];
    const seen = {}, result = [];
    candidates.forEach(function (item) {
        const v = inspect(item.target, runner);
        if (!v) { result.push({ label: item.label, error: 'Not accessible' }); return; }
        const key = v.device + '|' + v.mount;
        if (seen[key]) return;
        seen[key] = true;
        v.label = item.label;
        result.push(v);
    });
    return result;
}
function readVolumesAsync(dataDir, runner) {
    const exec = runner || cp.execFile;
    const candidates = [{ label: 'APP DATA STORAGE', target: dataDir }, { label: 'VAR OPT STORAGE', target: '/var/opt' }];
    function readOne(item) {
        return new Promise(function (resolve) {
            try {
                exec('df', ['-Pk', '--', item.target], { encoding: 'utf8', timeout: 2500 }, function (err, stdout) {
                    const v = err ? null : parseDf(stdout);
                    if (v) v.label = item.label;
                    resolve(v || { label: item.label, error: 'Not accessible' });
                });
            } catch (e) { resolve({ label: item.label, error: 'Not accessible' }); }
        });
    }
    // Check both targets: a failed app-data lookup must not hide a valid /var/opt reading.
    return Promise.all(candidates.map(readOne)).then(function (volumes) {
        const seen = {};
        return volumes.filter(function (v) {
            if (v.error) return true;
            const key = v.device + '|' + v.mount;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
    });
}
function fmt(kb) { return (kb * 1024 / 1000000000).toFixed(2); }
function drawVolume(cv, t, v, x, y, heading) {
    cv.text(heading, x, y, 28, t.dim, { font: 'bold', spacing: 1.5 });
    if (v.error) { cv.text('Storage information unavailable', x, y + 90, 36, t.accent2); return; }
    // Keep numeric and text fonts separate; the numeric font cannot display all letters.
    // df -Pk reports KiB; convert to decimal GB (1 GB = 1,000,000,000 bytes).
    const freeText = fmt(v.availKB);
    const numberSize = 84;
    const numberWidth = cv.textWidth(freeText, numberSize, { font: 'num' });
    cv.text(freeText, x, y + 112, numberSize, '#55D878', { font: 'num' });
    // Position the unit relative to the *actual rendered number width*, not a fixed offset.
    cv.text('GB FREE', x + numberWidth + 20, y + 112, 42, '#55D878', { font: 'bold' });
    cv.text(fmt(v.usedKB) + ' GB used  /  ' + fmt(v.totalKB) + ' GB total', x, y + 190, 30, t.text);
    const frac = Math.max(0, Math.min(1, v.usedKB / v.totalKB));
    cv.fillRect(x, y + 230, 1350, 15, withAlpha(t.tick, 0.3));
    cv.fillRect(x, y + 230, 1350 * frac, 15, t.accent);
}
mgu.run({
    async start(ctx) {
        const ui = ctx.ui, log = ctx.log;
        let timer = null, screenVisible = false, generation = 0, busy = false;
        async function render() {
            if (!screenVisible || busy) return;
            busy = true;
            const current = generation;
            try {
                const volumes = await readVolumesAsync(ctx.dataDir);
                if (!screenVisible || current !== generation) return;
                const t = ctx.theme(), cv = ctx.canvas(W, H).clear(t.bg);
                const primary = volumes.find(function (v) { return !v.error; });
                if (primary) {
                    drawVolume(cv, t, primary, 100, 90, 'MGU STORAGE');
                    // Most MGU paths share one partition; do not show duplicate totals.
                } else cv.text('Storage information unavailable', 80, 160, 36, t.text);
                cv.text('Read only  |  Free disk space may differ from app installation capacity', 80, 445, 20, t.dim);
                G.frame(cv, t, ['MGU Storage Monitor'], 0);
                await ui.image('MAIN_GFX', cv);
            } finally { busy = false; }
        }
        function redraw() { render().catch(function (e) { log.warn('storage display: ' + e); }); }
        ui.onVisible(function (name, visible) {
            if (name !== 'MAIN') return;
            clearInterval(timer); timer = null;
            generation++;
            // Do not issue disk reads or update the screen while hidden.
            screenVisible = !!visible;
            if (visible) { redraw(); timer = setInterval(redraw, 15000); }
        });
        // Initial render is driven by the visibility callback.
    }
});
module.exports = { parseDf: parseDf, inspect: inspect, readVolumes: readVolumes, readVolumesAsync: readVolumesAsync, fmt: fmt };
