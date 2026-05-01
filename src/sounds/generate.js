// One-shot generator for chunky mechanical/sci-fi keypress samples.
// Run once with:  node src/sounds/generate.js
// Produces key1..key5.wav and enter.wav alongside this file.
const fs = require('fs');
const path = require('path');

const SR = 44100;

function writeWav(filename, samples) {
  const n = samples.length;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filename, buf);
}

// Single-pole low-pass
function makeLpf(cutoff) {
  const dt = 1 / SR;
  const rc = 1 / (2 * Math.PI * cutoff);
  const alpha = dt / (rc + dt);
  let y = 0;
  return x => (y = y + alpha * (x - y));
}

// Highpass (1 - lpf)
function makeHpf(cutoff) {
  const lpf = makeLpf(cutoff);
  return x => x - lpf(x);
}

// Heavy mechanical clack: punchy attack, filtered noise body,
// tonal sub-thump, short reverb tail. Tuned for the Hackers-film
// "every keypress is a CRT-shake event" aesthetic.
function clack({
  duration = 0.16,
  pitch = 220,        // tonal pitch of the clack
  bodyFreq = 1800,    // noise lpf cutoff (brightness)
  thumpFreq = 70,     // sub-bass thump
  attackBoost = 1.0,  // initial transient strength
  tailMix = 0.25,     // amount of reverb tail
}) {
  const N = Math.floor(SR * duration);
  const samples = new Array(N).fill(0);

  const lpfBody  = makeLpf(bodyFreq);
  const hpfBody  = makeHpf(120);

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // Punchy noise envelope: very fast attack, fast decay
    const noiseEnv = Math.exp(-t * 28) * (1 + attackBoost * Math.exp(-t * 600));
    const noise = (Math.random() * 2 - 1) * noiseEnv;
    const noiseShaped = hpfBody(lpfBody(noise));

    // Tonal click for that mechanical character
    const toneEnv = Math.exp(-t * 60);
    const tone = Math.sin(2 * Math.PI * pitch * t) * toneEnv * 0.5;
    const tone2 = Math.sin(2 * Math.PI * pitch * 1.5 * t) * Math.exp(-t * 90) * 0.25;

    // Sub-thump for weight
    const thumpEnv = Math.exp(-t * 22);
    const thump = Math.sin(2 * Math.PI * thumpFreq * t) * thumpEnv * 0.55;

    // Cinematic ping (high frequency snap)
    const pingEnv = Math.exp(-t * 220);
    const ping = Math.sin(2 * Math.PI * 4200 * t) * pingEnv * 0.18;

    samples[i] = (noiseShaped * 1.6 + tone + tone2 + thump + ping) * 0.55;
  }

  // Cheap "early reflections" tail — adds a hint of reverb/space
  if (tailMix > 0) {
    const taps = [
      { d: 0.018, g: 0.45 },
      { d: 0.034, g: 0.30 },
      { d: 0.061, g: 0.22 },
      { d: 0.092, g: 0.14 },
    ];
    const out = samples.slice();
    for (const tap of taps) {
      const dN = Math.floor(SR * tap.d);
      for (let i = dN; i < N; i++) out[i] += samples[i - dN] * tap.g * tailMix;
    }
    for (let i = 0; i < N; i++) samples[i] = out[i];
  }

  // Normalize to ~0.9 peak
  let peak = 0;
  for (const s of samples) if (Math.abs(s) > peak) peak = Math.abs(s);
  if (peak > 0) {
    const g = 0.9 / peak;
    for (let i = 0; i < N; i++) samples[i] *= g;
  }

  // Soft fade-out so the tail doesn't click
  const fadeN = Math.floor(SR * 0.008);
  for (let i = 0; i < fadeN && i < N; i++) {
    samples[N - 1 - i] *= i / fadeN;
  }
  // Soft fade-in (1ms) to kill DC click on start
  const fadeInN = Math.floor(SR * 0.001);
  for (let i = 0; i < fadeInN; i++) samples[i] *= i / fadeInN;

  return samples;
}

const variants = [
  { name: 'key1.wav', opts: { pitch: 240, bodyFreq: 1800, thumpFreq: 75, duration: 0.16 } },
  { name: 'key2.wav', opts: { pitch: 290, bodyFreq: 2100, thumpFreq: 80, duration: 0.14, attackBoost: 1.2 } },
  { name: 'key3.wav', opts: { pitch: 200, bodyFreq: 1400, thumpFreq: 65, duration: 0.18, attackBoost: 0.85 } },
  { name: 'key4.wav', opts: { pitch: 330, bodyFreq: 2400, thumpFreq: 90, duration: 0.13 } },
  { name: 'key5.wav', opts: { pitch: 260, bodyFreq: 1700, thumpFreq: 70, duration: 0.15, attackBoost: 1.1 } },
  { name: 'enter.wav', opts: { pitch: 110, bodyFreq: 1100, thumpFreq: 50, duration: 0.32, attackBoost: 1.6, tailMix: 0.55 } },
];

// ── Final-buffer normalize + fade helper (shared) ───────────────
function finishBuffer(samples) {
  const N = samples.length;
  let peak = 0;
  for (const s of samples) if (Math.abs(s) > peak) peak = Math.abs(s);
  if (peak > 0) {
    const g = 0.92 / peak;
    for (let i = 0; i < N; i++) samples[i] *= g;
  }
  const fadeN = Math.floor(SR * 0.006);
  for (let i = 0; i < fadeN && i < N; i++) samples[N - 1 - i] *= i / fadeN;
  const fadeInN = Math.floor(SR * 0.0015);
  for (let i = 0; i < fadeInN && i < N; i++) samples[i] *= i / fadeInN;
  return samples;
}

// Add early-reflection reverb tail
function addTail(samples, mix = 0.45, taps = [{d:0.03,g:0.5},{d:0.06,g:0.34},{d:0.10,g:0.22},{d:0.16,g:0.14}]) {
  const N = samples.length;
  const out = samples.slice();
  for (const tap of taps) {
    const dN = Math.floor(SR * tap.d);
    for (let i = dN; i < N; i++) out[i] += samples[i - dN] * tap.g * mix;
  }
  return out;
}

// ── Event-sound synthesizers ───────────────────────────────────

// Rising arpeggio chime (granted, deploy)
function chime({ duration = 0.8, freqs = [523.25, 659.25, 783.99, 1046.5], stagger = 0.07, tailMix = 0.55, decay = 4.5 }) {
  const N = Math.floor(SR * duration);
  let samples = new Array(N).fill(0);
  freqs.forEach((f, k) => {
    const startN = Math.floor(SR * stagger * k);
    for (let i = startN; i < N; i++) {
      const t = (i - startN) / SR;
      const env = Math.exp(-t * decay) * (1 - Math.exp(-t * 220));
      const s = Math.sin(2 * Math.PI * f * t) * 0.6
              + Math.sin(2 * Math.PI * f * 2 * t) * 0.18
              + Math.sin(2 * Math.PI * f * 3 * t) * 0.07;
      samples[i] += s * env * 0.55;
    }
  });
  if (tailMix > 0) samples = addTail(samples, tailMix);
  return finishBuffer(samples);
}

// Soft tanh saturation for harshness without hard-clipping
function saturate(x, drive = 1.5) { return Math.tanh(x * drive); }

// ── Sinister overlay sounds ────────────────────────────────────

// Ominous vault-open drone — minor chord with detuned saws,
// crescendo with rising sub, tremolo for unease. Used for "ACCESS GRANTED".
function darkChord({ duration = 1.4, tailMix = 0.75 }) {
  const N = Math.floor(SR * duration);
  const samples = new Array(N).fill(0);
  const lpf = makeLpf(2200);
  // A minor-ish stack: A1, A2, C3, E3, plus a high A4 ghost
  const notes = [55, 110, 130.81, 164.81, 440];
  const noteGains = [0.55, 0.45, 0.4, 0.35, 0.12];

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const tn = t / duration;
    // Slow attack, sustain, slow decay
    const env = (1 - Math.exp(-t * 4.5)) * Math.exp(-Math.max(0, t - 0.7) * 2.2);
    let sig = 0;
    for (let k = 0; k < notes.length; k++) {
      const f = notes[k];
      // Two detuned saws + sine partial
      const s1 = 2 * (t * f * 0.992 - Math.floor(t * f * 0.992 + 0.5));
      const s2 = 2 * (t * f * 1.008 - Math.floor(t * f * 1.008 + 0.5));
      const sn = Math.sin(2 * Math.PI * f * t);
      sig += (s1 * 0.32 + s2 * 0.32 + sn * 0.36) * noteGains[k];
    }
    // Slow tremolo (~4Hz) for menace
    const trem = 1 + 0.20 * Math.sin(2 * Math.PI * 4.2 * t);
    sig = lpf(saturate(sig * trem, 1.35));
    // Rising sub crescendo — climbs into the foreground
    const subF = 36 + tn * 28;
    const subRise = Math.sin(2 * Math.PI * subF * t) * 0.5 * Math.pow(tn, 0.7);
    samples[i] = (sig * env + subRise) * 0.55;
  }
  return finishBuffer(addTail(samples, tailMix));
}

// Klaxon alarm — alternating tritone (devil's interval), distorted detuned
// saws, sub-throb on each pulse, noise grit. Used for "ACCESS DENIED".
function klaxon({ duration = 0.95, freq = 196, pulses = 4 }) {
  const N = Math.floor(SR * duration);
  const samples = new Array(N).fill(0);
  const lpf = makeLpf(2400);
  const altF = freq * Math.pow(2, 6/12); // tritone above

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const tn = t / duration;
    const pulsePhase = tn * pulses * 2;
    const pulseIdx = Math.floor(pulsePhase);
    const inPulseT = pulsePhase - pulseIdx;
    const f = (pulseIdx % 2 === 1) ? altF : freq;
    // Sharp pulse envelope: fast attack, hold, fast decay
    const gate = Math.min(1, inPulseT * 12) * Math.max(0, 1 - Math.pow(inPulseT, 2.2) * 1.4);

    // Detuned saws
    const s1 = 2 * (t * f          - Math.floor(t * f          + 0.5));
    const s2 = 2 * (t * f * 1.008  - Math.floor(t * f * 1.008  + 0.5));
    const s3 = 2 * (t * f * 0.992  - Math.floor(t * f * 0.992  + 0.5));
    const saw = (s1 + s2 + s3) / 3;
    // Sub-octave throb
    const sub = Math.sin(2 * Math.PI * f * 0.5 * t) * 0.45;
    // Noise crackle
    const noise = (Math.random() * 2 - 1) * 0.18;
    // Stacked + saturated for harsh klaxon character
    let sig = lpf(saturate((saw * 0.7 + sub + noise), 1.6)) * 0.65;
    // Overall fall-off across duration
    samples[i] = sig * gate * (1 - tn * 0.25);
  }
  return finishBuffer(addTail(samples, 0.35));
}

// Big industrial impact: massive sub-drop, metallic clang transient,
// noise body, tape-warble pitch wobble in tail. Used for "SYSTEM SHOCK".
function heavyImpact({ duration = 0.95 }) {
  const N = Math.floor(SR * duration);
  const samples = new Array(N).fill(0);
  const lpfMid = makeLpf(700);
  const lpfHigh = makeLpf(2200);

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // Sub bass drop — exponential pitch fall
    const subF = Math.max(22, 115 - Math.pow(t * 3.2, 1.4) * 70);
    const sub = Math.sin(2 * Math.PI * subF * t) * Math.exp(-t * 2.4) * 1.25;

    // Metallic clang at the transient (multiple inharmonic partials)
    const clangEnv = Math.exp(-t * 14) * (1 + Math.exp(-t * 1200) * 3.5);
    const clang = (
        Math.sin(2 * Math.PI *  847 * t) * 0.40
      + Math.sin(2 * Math.PI * 1318 * t) * 0.25
      + Math.sin(2 * Math.PI *  541 * t) * 0.32
      + Math.sin(2 * Math.PI * 2117 * t) * 0.16
    ) * clangEnv;

    // Mid-body filtered noise (the "punch")
    const bodyEnv = Math.exp(-t * 4.5);
    const body = lpfMid((Math.random() * 2 - 1)) * bodyEnv * 0.85;

    // Tape-warble tail: slowly modulated low pitch
    const wobble = Math.sin(2 * Math.PI * 38 * t * (1 + Math.sin(2 * Math.PI * 2.6 * t) * 0.28))
                 * Math.exp(-Math.max(0, t - 0.05) * 1.6) * 0.45;

    // Brief glitch hiss on attack
    const glitchEnv = Math.exp(-t * 80);
    const glitch = lpfHigh((Math.random() * 2 - 1)) * glitchEnv * 0.5;

    samples[i] = sub + clang + body + wobble + glitch;
  }
  // Compress to glue layers
  for (let i = 0; i < N; i++) samples[i] = saturate(samples[i] * 0.85, 1.0);
  return finishBuffer(addTail(samples, 0.55));
}

// Frequency sweep (purge / scramble / overclock)
function sweep({ duration = 0.45, fStart = 200, fEnd = 1500, harshness = 0.4, decay = 2.6, tailMix = 0.35 }) {
  const N = Math.floor(SR * duration);
  const samples = new Array(N).fill(0);
  const hpf = makeHpf(80);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const tn = t / duration;
    const f = fStart * Math.pow(fEnd / fStart, tn);
    phase += (2 * Math.PI * f) / SR;
    const env = Math.exp(-tn * decay) * (1 - Math.exp(-t * 200));
    const tone = Math.sin(phase) * 0.55
               + Math.sin(phase * 2) * 0.18;
    const grit = (Math.random() * 2 - 1) * harshness * 0.25;
    samples[i] = hpf((tone + grit) * env);
  }
  return finishBuffer(addTail(samples, tailMix));
}

// Quick digital blip (execute)
function blip({ duration = 0.2, freq = 1400, decay = 22 }) {
  const N = Math.floor(SR * duration);
  const samples = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = Math.exp(-t * decay) * (1 - Math.exp(-t * 600));
    const s = Math.sin(2 * Math.PI * freq * t) * 0.55
            + Math.sin(2 * Math.PI * freq * 2 * t) * 0.2;
    samples[i] = s * env;
  }
  return finishBuffer(addTail(samples, 0.25));
}

const events = [
  { name: 'access_granted.wav', gen: () => darkChord({ duration: 1.4 }) },
  { name: 'access_denied.wav',  gen: () => klaxon({ duration: 0.95, freq: 196, pulses: 4 }) },
  { name: 'shock.wav',          gen: () => heavyImpact({ duration: 0.95 }) },
  { name: 'btn_deploy.wav',     gen: () => chime({ freqs: [523.25, 783.99], duration: 0.45, stagger: 0.05, decay: 6, tailMix: 0.4 }) },
  { name: 'btn_purge.wav',      gen: () => sweep({ fStart: 1600, fEnd: 180, duration: 0.42, harshness: 0.7, decay: 2.4 }) },
  { name: 'btn_scramble.wav',   gen: () => sweep({ fStart: 500, fEnd: 1900, duration: 0.5, harshness: 0.85, decay: 2.0 }) },
  { name: 'btn_overclock.wav',  gen: () => sweep({ fStart: 220, fEnd: 1100, duration: 0.42, harshness: 0.45, decay: 2.2 }) },
  { name: 'btn_execute.wav',    gen: () => blip({ duration: 0.22, freq: 1400, decay: 18 }) },
];

const out = __dirname;
for (const v of variants) {
  const s = clack(v.opts);
  writeWav(path.join(out, v.name), s);
  console.log(`wrote ${v.name}: ${s.length} samples (${(s.length / SR).toFixed(2)}s)`);
}
for (const e of events) {
  const s = e.gen();
  writeWav(path.join(out, e.name), s);
  console.log(`wrote ${e.name}: ${s.length} samples (${(s.length / SR).toFixed(2)}s)`);
}
