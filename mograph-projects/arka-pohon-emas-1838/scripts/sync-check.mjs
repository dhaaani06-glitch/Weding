#!/usr/bin/env node
// VOYNANN MOGRAPH — audio/caption sync check for a finished MP4.
//
//   node scripts/sync-check.mjs out/final/<video>.mp4 public/audio/voiceover.mp3 [src/words.json]
//
// 1. Stream offsets: audio and video must both start at 0 in the container.
// 2. VO delay: cross-correlates the loudness envelope of the original voice-over with the final mix (music and SFX
//    included) and reports how many milliseconds the voice is shifted in the delivered file. |delay| > 40 ms fails
//    (more than ~2 frames at 60 fps, the point where lip/caption sync starts to feel late).
// 3. Caption timing (optional words.json): every word that starts a phrase (after a pause of 0.18 s or more) should start
//    where the voice actually starts again. Reports the median and worst gap; a median above 0.12 s or more than 15% of
//    phrase starts off by over 0.25 s fails (captions and word-pinned beats would feel early/late).
// Exit 0 = PASS, 1 = FAIL. Needs ffmpeg + ffprobe.
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';

const [video, vo, wordsPath] = process.argv.slice(2);
if (!video || !vo || !existsSync(video) || !existsSync(vo)) {
  console.error('usage: node scripts/sync-check.mjs <final.mp4> <voiceover audio> [words.json]');
  process.exit(2);
}
const SR = 8000, HOP = 8; // 1 ms envelope frames
let fail = false;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { console.log(`  ✗ ${m}`); fail = true; };

function pcm(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {maxBuffer: 1 << 30});
  if (r.status !== 0) throw new Error(`ffmpeg could not decode ${file}`);
  const b = r.stdout; return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
}
// Band-limited loudness envelope (speech band ~300–3400 Hz via two one-pole filters), 1 value per ms.
function envelope(x) {
  const y = new Float32Array(x.length); let lp = 0, hp = 0, prev = 0;
  const aL = 1 - Math.exp(-2 * Math.PI * 3400 / SR), aH = Math.exp(-2 * Math.PI * 300 / SR);
  for (let i = 0; i < x.length; i++) { lp += aL * (x[i] - lp); hp = aH * (hp + lp - prev); prev = lp; y[i] = hp; }
  const n = Math.floor(y.length / HOP); const e = new Float32Array(n);
  for (let k = 0; k < n; k++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = y[k * HOP + j]; s += v * v; } e[k] = Math.sqrt(s / HOP); }
  return e;
}
const toDb = (e) => e.map((v) => 20 * Math.log10(v + 1e-6));

console.log(`== sync check: ${video}`);

// 1) container start times
const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,start_time', '-of', 'csv=p=0', video], {encoding: 'utf8'});
const starts = Object.fromEntries(probe.trim().split('\n').map((l) => { const [type, st] = l.split(','); return [type, Number(st)]; }));
const sDiff = Math.abs((starts.audio ?? 0) - (starts.video ?? 0)) * 1000;
if (sDiff <= 5) ok(`streams start together (video ${(starts.video ?? 0).toFixed(3)} s, audio ${(starts.audio ?? 0).toFixed(3)} s)`);
else bad(`audio and video streams start ${sDiff.toFixed(0)} ms apart`);

// 2) VO delay: FFT cross-correlation of the raw waveforms (the VO is summed into the mix, music is uncorrelated with it,
//    so the peak stays sharp even under a loud bed). Searches ±500 ms on the first ~32 s.
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2; const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
const xv = pcm(vo), xm = pcm(video);
const ev = envelope(xv);
const M = 1 << 18, NF = M * 2;
const take = (x) => { const r = new Float64Array(NF); const n = Math.min(M, x.length); for (let i = 0; i < n; i++) r[i] = x[i]; return r; };
const ar = take(xv), ai = new Float64Array(NF), br = take(xm), bi = new Float64Array(NF);
fft(ar, ai, false); fft(br, bi, false);
for (let i = 0; i < NF; i++) { const r = br[i] * ar[i] + bi[i] * ai[i], im = bi[i] * ar[i] - br[i] * ai[i]; ar[i] = r; ai[i] = im; }
fft(ar, ai, true);
let best = -Infinity, lagS = 0; const W = SR / 2;
for (let L = -W; L <= W; L++) { const v = ar[(L + NF) % NF]; if (v > best) { best = v; lagS = L; } }
let ea = 0, eb = 0; const n0 = Math.min(M, xv.length, xm.length);
for (let i = 0; i < n0; i++) { ea += xv[i] * xv[i]; const j = i + lagS; if (j >= 0 && j < xm.length) eb += xm[j] * xm[j]; }
const corr = best / NF / Math.sqrt(ea * eb || 1);
const lag = Math.round(lagS * 1000 / SR);
if (corr < 0.1) bad(`could not find the voice-over in the mix (correlation ${corr.toFixed(2)}): wrong VO file?`);
else if (Math.abs(lag) <= 40) ok(`voice-over delay ${lag >= 0 ? '+' : ''}${lag} ms (correlation ${corr.toFixed(2)})`);
else bad(`voice-over is ${lag > 0 ? 'late' : 'early'} by ${Math.abs(lag)} ms in the final mix (correlation ${corr.toFixed(2)})`);

// 3) caption/word timing against real phrase onsets in the VO
if (wordsPath) {
  if (!existsSync(wordsPath)) bad(`words file not found: ${wordsPath}`);
  else {
    const data = JSON.parse(readFileSync(wordsPath, 'utf8'));
    const words = (data.words ?? data).map((w) => ({start: w.start ?? w.s, end: w.end ?? w.e, word: w.word ?? w.text ?? w.w}));
    const db = toDb(ev);
    const floor = [...db].sort((x, y) => x - y)[Math.floor(db.length * 0.2)];
    const voiced = db.map((v) => v > floor + 12);
    const onsets = [];
    for (let i = 1; i < voiced.length; i++) {
      if (voiced[i] && !voiced[i - 1]) {
        let quiet = 0; for (let j = i - 1; j >= 0 && !voiced[j] && quiet < 400; j--) quiet++;
        if (quiet >= 120 || i < 300) onsets.push(i / 1000);
      }
    }
    const phraseStarts = words.filter((w, i) => i === 0 || (w.start - words[i - 1].end) >= 0.18);
    const gaps = phraseStarts.map((w) => {
      let d = Infinity; for (const o of onsets) { const g = w.start - o; if (Math.abs(g) < Math.abs(d)) d = g; }
      return {word: w.word, t: w.start, d};
    }).filter((g) => Number.isFinite(g.d));
    if (!gaps.length) bad('no phrase starts found in words.json');
    else {
      const abs = gaps.map((g) => Math.abs(g.d)).sort((x, y) => x - y);
      const med = abs[Math.floor(abs.length / 2)], far = gaps.filter((g) => Math.abs(g.d) > 0.25);
      const worst = gaps.reduce((m, g) => (Math.abs(g.d) > Math.abs(m.d) ? g : m));
      const msg = `${gaps.length} phrase starts: median offset ${(med * 1000).toFixed(0)} ms, ${far.length} over 250 ms (worst "${worst.word}" @${worst.t.toFixed(2)} s: ${(worst.d * 1000).toFixed(0)} ms)` +
        (data.method ? ` [${data.method}]` : '');
      if (med <= 0.12 && far.length <= Math.max(1, gaps.length * 0.15)) ok(`caption timing ${msg}`);
      else bad(`caption timing drifts from the voice: ${msg}`);
    }
  }
}
console.log(fail ? 'SYNC FAIL' : 'SYNC PASS');
process.exit(fail ? 1 : 0);
