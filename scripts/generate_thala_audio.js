import fs from 'fs';
import path from 'path';

function createWavBuffer(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat PCM = 1
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;
const targetDir = path.resolve('public/characters/thala/audio');
fs.mkdirSync(targetDir, { recursive: true });

// 1. PUNCH (English willow bat crack + explosive impact)
{
  const duration = 0.35;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 22);
    // Bat crack frequencies (380Hz decaying down, plus high transient snap)
    const tone = Math.sin(2 * Math.PI * (380 - t * 600) * t);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 40);
    samples[i] = (tone * 0.7 + noise * 0.5) * env;
  }
  fs.writeFileSync(path.join(targetDir, 'punch.wav'), createWavBuffer(samples, sampleRate));
}

// 2. KICK (Acrobatic flying leap whoosh + heavy thud)
{
  const duration = 0.45;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 12);
    const whoosh = Math.sin(2 * Math.PI * (180 + t * 400) * t) * (t < 0.15 ? t / 0.15 : 1);
    const impact = Math.sin(2 * Math.PI * 65 * t);
    const noise = (Math.random() * 2 - 1) * 0.3 * Math.exp(-Math.max(0, t - 0.15) * 20);
    samples[i] = (whoosh * 0.4 + impact * 0.8 + noise) * env;
  }
  fs.writeFileSync(path.join(targetDir, 'kick.wav'), createWavBuffer(samples, sampleRate));
}

// 3. GRAB (Lightning sprint whoosh + wicket stumps shattering)
{
  const duration = 0.65;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let s = 0;
    if (t < 0.25) {
      // Sprint dash whoosh
      const dashEnv = t / 0.25;
      s = (Math.random() * 2 - 1) * 0.4 * dashEnv;
    } else {
      // Stumps splintering
      const tSlam = t - 0.25;
      const slamEnv = Math.exp(-tSlam * 14);
      const wood1 = Math.sin(2 * Math.PI * 520 * tSlam);
      const wood2 = Math.sin(2 * Math.PI * 780 * tSlam);
      const wood3 = Math.sin(2 * Math.PI * 1100 * tSlam);
      const crackle = (Math.random() * 2 - 1) * 0.5;
      s = (wood1 * 0.4 + wood2 * 0.3 + wood3 * 0.2 + crackle) * slamEnv;
    }
    samples[i] = s;
  }
  fs.writeFileSync(path.join(targetDir, 'grab.wav'), createWavBuffer(samples, sampleRate));
}

// 4. SUPER (Helicopter blade whirlwind + colossal boundary blast)
{
  const duration = 1.4;
  const numSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Helicopter whirling drone rate accelerating
    const rotorRate = 12 + t * 24;
    const rotor = Math.sin(2 * Math.PI * rotorRate * t);
    const bassRumble = Math.sin(2 * Math.PI * (55 + t * 40) * t);
    const fireNoise = (Math.random() * 2 - 1) * (0.2 + t * 0.3);
    const riseEnv = Math.min(1, t / 0.8);
    const fallEnv = Math.exp(-Math.max(0, t - 0.9) * 6);
    samples[i] = (rotor * 0.4 + bassRumble * 0.4 + fireNoise * 0.4) * riseEnv * fallEnv;
  }
  fs.writeFileSync(path.join(targetDir, 'super.wav'), createWavBuffer(samples, sampleRate));
}

// 5. WIN (Bole Jo Koyal Baagon Mein melody motif)
// Notes: G4, A4, B4, D5, C5, B4, A4, G4 - iconic cheerful melody
{
  const melodyNotes = [
    { freq: 392.00, dur: 0.25 }, // G4
    { freq: 440.00, dur: 0.25 }, // A4
    { freq: 493.88, dur: 0.35 }, // B4
    { freq: 587.33, dur: 0.45 }, // D5
    { freq: 523.25, dur: 0.25 }, // C5
    { freq: 493.88, dur: 0.30 }, // B4
    { freq: 440.00, dur: 0.30 }, // A4
    { freq: 392.00, dur: 0.65 }, // G4
  ];

  let totalDur = 0;
  for (const n of melodyNotes) totalDur += n.dur;
  totalDur += 0.3; // Ring out

  const numSamples = Math.floor(sampleRate * totalDur);
  const samples = new Float32Array(numSamples);

  let curTime = 0;
  for (const note of melodyNotes) {
    const startIdx = Math.floor(curTime * sampleRate);
    const lenIdx = Math.floor(note.dur * sampleRate);
    for (let j = 0; j < lenIdx; j++) {
      const idx = startIdx + j;
      if (idx >= numSamples) break;
      const t = j / sampleRate;
      const env = Math.exp(-t * (2.5 / note.dur));
      // Warm flute / cheerful whistle harmonics
      const s1 = Math.sin(2 * Math.PI * note.freq * t);
      const s2 = 0.3 * Math.sin(2 * Math.PI * note.freq * 2 * t);
      const s3 = 0.1 * Math.sin(2 * Math.PI * note.freq * 3 * t);
      samples[idx] += (s1 + s2 + s3) * 0.5 * env;
    }
    curTime += note.dur;
  }
  fs.writeFileSync(path.join(targetDir, 'win.wav'), createWavBuffer(samples, sampleRate));
}

// 6. LOSE ("Maha Mahim Singh aa chuke aur jaa chuke" somber chord fall)
{
  const chords = [
    { f1: 220, f2: 261.63, dur: 0.45 }, // Am
    { f1: 196, f2: 246.94, dur: 0.45 }, // G
    { f1: 174.61, f2: 220, dur: 0.55 }, // F
    { f1: 164.81, f2: 207.65, dur: 0.8 }, // E
  ];

  let totalDur = 0;
  for (const c of chords) totalDur += c.dur;
  totalDur += 0.4;

  const numSamples = Math.floor(sampleRate * totalDur);
  const samples = new Float32Array(numSamples);

  let curTime = 0;
  for (const chord of chords) {
    const startIdx = Math.floor(curTime * sampleRate);
    const lenIdx = Math.floor(chord.dur * sampleRate);
    for (let j = 0; j < lenIdx; j++) {
      const idx = startIdx + j;
      if (idx >= numSamples) break;
      const t = j / sampleRate;
      const env = Math.exp(-t * 2.2);
      const s1 = Math.sin(2 * Math.PI * chord.f1 * t);
      const s2 = 0.5 * Math.sin(2 * Math.PI * chord.f2 * t);
      samples[idx] += (s1 + s2) * 0.45 * env;
    }
    curTime += chord.dur;
  }
  fs.writeFileSync(path.join(targetDir, 'lose.wav'), createWavBuffer(samples, sampleRate));
}

console.log('Successfully generated all Thala audio files in', targetDir);
