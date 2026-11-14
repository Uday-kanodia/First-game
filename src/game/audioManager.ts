import { AttackType, CharacterConfig } from './types';

/**
 * Web Audio API procedural synthesizer + asset loader fallback for fighting game SFX & Music.
 * Guarantees zero 404 dependencies while allowing custom audio files if present.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private isMuted: boolean = false;
  private sfxVol: number = 0.8;
  private musicVol: number = 0.5;

  private bgmOscs: OscillatorNode[] = [];
  private bgmInterval: number | null = null;
  private isBgmPlaying: boolean = false;

  // Cached decoded AudioBuffers for plug-in character moves and victory/defeat tracks
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private loadedCharacters: Set<string> = new Set();

  constructor() {
    // Lazy initialize on first user gesture
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('cot3d_audio_settings');
      if (saved) {
        const data = JSON.parse(saved);
        this.sfxVol = typeof data.sfxVol === 'number' ? data.sfxVol : 0.8;
        this.musicVol = typeof data.musicVol === 'number' ? data.musicVol : 0.5;
        this.isMuted = !!data.isMuted;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  public saveSettings() {
    try {
      localStorage.setItem(
        'cot3d_audio_settings',
        JSON.stringify({
          sfxVol: this.sfxVol,
          musicVol: this.musicVol,
          isMuted: this.isMuted,
        })
      );
    } catch {
      // Ignore
    }
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    this.saveSettings();
  }

  public setSfxVolume(vol: number) {
    this.sfxVol = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVol, this.ctx.currentTime, 0.05);
    }
    this.saveSettings();
  }

  public setMusicVolume(vol: number) {
    this.musicVol = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.05);
    }
    this.saveSettings();
  }

  public getSettings() {
    return {
      muted: this.isMuted,
      sfxVolume: this.sfxVol,
      musicVolume: this.musicVol,
    };
  }

  // --- Character Plug-in Audio Loader & Buffer Cache ---

  public async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.soundBuffers.has(url)) {
      return this.soundBuffers.get(url)!;
    }
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    const promise = (async () => {
      try {
        this.init();
        if (!this.ctx) return null;

        const res = await fetch(url);
        if (!res.ok) return null;

        const contentType = res.headers.get('content-type') || '';
        // If static host returns index.html for missing files, ignore
        if (contentType.includes('text/html')) return null;

        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.soundBuffers.set(url, audioBuffer);
        return audioBuffer;
      } catch {
        // Fall back gracefully to synthesized sounds
        return null;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, promise);
    return promise;
  }

  public async loadCharacterAudio(charId: string, config?: CharacterConfig): Promise<void> {
    const slots: Array<{ key: string; candidatePaths: string[] }> = [];

    // Helper to normalize path
    const normalize = (pathStr?: string): string[] => {
      if (!pathStr) return [];
      if (pathStr.startsWith('/') || pathStr.startsWith('http')) return [pathStr];
      return [
        `/characters/${charId}/${pathStr}`,
        `/${pathStr}`,
      ];
    };

    const moveTypes: AttackType[] = ['punch', 'kick', 'grab', 'super'];
    for (const move of moveTypes) {
      const explicitMovePath = config?.moves?.[move]?.audioPath;
      const explicitAudioPath = config?.audio?.[move];
      const candidates = [
        ...normalize(explicitMovePath),
        ...normalize(explicitAudioPath),
        `/characters/${charId}/audio/${move}.mp3`,
        `/characters/${charId}/audio/${move}.wav`,
        `/characters/${charId}/audio/${move}.ogg`,
      ];
      slots.push({ key: `${charId}:${move}`, candidatePaths: candidates });
    }

    // Win & Lose slots
    slots.push({
      key: `${charId}:win`,
      candidatePaths: [
        ...normalize(config?.audio?.win),
        `/characters/${charId}/audio/win.mp3`,
        `/characters/${charId}/audio/win.wav`,
        `/characters/${charId}/audio/win.ogg`,
      ],
    });

    slots.push({
      key: `${charId}:lose`,
      candidatePaths: [
        ...normalize(config?.audio?.lose),
        `/characters/${charId}/audio/lose.mp3`,
        `/characters/${charId}/audio/lose.wav`,
        `/characters/${charId}/audio/lose.ogg`,
      ],
    });

    await Promise.all(
      slots.map(async (slot) => {
        if (this.soundBuffers.has(slot.key)) return;
        for (const candidate of slot.candidatePaths) {
          const buf = await this.loadAudioBuffer(candidate);
          if (buf) {
            this.soundBuffers.set(slot.key, buf);
            break;
          }
        }
      })
    );

    this.loadedCharacters.add(charId);
  }

  public playBuffer(buffer: AudioBuffer, volume = 1.0, isMusic = false): AudioBufferSourceNode | null {
    this.init();
    if (!this.ctx) return null;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const targetGain = isMusic ? this.musicGain : this.sfxGain;
    if (targetGain) {
      if (volume !== 1.0) {
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(targetGain);
      } else {
        source.connect(targetGain);
      }
    } else if (this.masterGain) {
      source.connect(this.masterGain);
    } else {
      source.connect(this.ctx.destination);
    }

    source.start(0);
    return source;
  }

  public playCharacterMove(charId: string, moveType: AttackType, fallback?: () => void): boolean {
    const key = `${charId}:${moveType}`;
    const buffer = this.soundBuffers.get(key);
    if (buffer) {
      this.playBuffer(buffer, 1.0);
      return true;
    }

    // Fall back to synthesized sounds
    if (fallback) {
      fallback();
    } else {
      switch (moveType) {
        case 'punch':
          this.playPunch();
          break;
        case 'kick':
          this.playKick();
          break;
        case 'grab':
          this.playGrab();
          break;
        case 'super':
          this.playSuper();
          break;
      }
    }
    return false;
  }

  public playWinAudio(charId: string) {
    const key = `${charId}:win`;
    const buffer = this.soundBuffers.get(key);
    if (buffer) {
      this.playBuffer(buffer, 1.0);
      return;
    }
    // Fall back to synthesized triumphant win chime
    this.playAnnouncerChime('win');
  }

  public playLoseAudio(charId: string) {
    const key = `${charId}:lose`;
    const buffer = this.soundBuffers.get(key);
    if (buffer) {
      this.playBuffer(buffer, 1.0);
      return;
    }
    // Fall back to synthesized KO chime
    this.playAnnouncerChime('ko');
  }

  // --- Sound Effects ---

  public playPunch() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Pitch envelope punch body
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // High snap click
    this.playNoiseSnap(0.04, 800, 0.4);
  }

  public playKick() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy bass sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);

    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);

    this.playNoiseSnap(0.08, 600, 0.5);
  }

  public playGrab() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Whoosh up then heavy ground slam
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.setValueAtTime(0.9, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);

    this.playNoiseSnap(0.15, 300, 0.8, now + 0.16);
  }

  public playSuper() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Intense sci-fi power riser
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(120, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    gain1.gain.setValueAtTime(0.7, now);
    gain1.gain.linearRampToValueAtTime(1.0, now + 0.5);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 1.2);

    // Sub-bass detonation
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(300, now + 0.5);
    osc2.frequency.exponentialRampToValueAtTime(25, now + 1.4);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(1.0, now + 0.5);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 1.45);
  }

  public playBatCrack() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Solid willow wood crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);

    this.playNoiseSnap(0.05, 2400, 0.8, now);
  }

  public playWicketSmash() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Stumps splintering
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + i * 120, now + i * 0.03);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.15 + i * 0.03);

      gain.gain.setValueAtTime(0.7, now + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.03);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.03);
      osc.stop(now + 0.22 + i * 0.03);
    }
    this.playNoiseSnap(0.12, 1800, 0.7);
  }

  public playBlock() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Metallic shield deflection ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(840, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.1);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playHitImpact(heavy = false) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(heavy ? 140 : 200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + (heavy ? 0.2 : 0.12));

    gain.gain.setValueAtTime(heavy ? 1.0 : 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.22 : 0.14));

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + (heavy ? 0.25 : 0.15));

    this.playNoiseSnap(heavy ? 0.1 : 0.05, 1000, 0.6);
  }

  public playWhiff() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Air whoosh
    this.playNoiseSnap(0.12, 1200, 0.35);
  }

  public playAnnouncerChime(type: 'round' | 'fight' | 'ko' | 'win') {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const chord =
      type === 'fight'
        ? [261.63, 329.63, 392.0, 523.25] // C Major fanfare
        : type === 'ko'
        ? [330, 247, 164] // Dramatic drop
        : type === 'win'
        ? [392.0, 493.88, 587.33, 783.99] // High triumphant
        : [440, 554.37, 659.25]; // Round chime

    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.3, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + idx * 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.8 + idx * 0.05);
    });
  }

  private playNoiseSnap(duration: number, cutoff: number, gainVal: number, startTime?: number) {
    if (!this.ctx || !this.sfxGain) return;
    const t = startTime ?? this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  // --- Procedural Fight Beat (BGM) ---
  public startFightBgm() {
    this.init();
    if (!this.ctx || !this.musicGain || this.isBgmPlaying) return;
    this.isBgmPlaying = true;

    let step = 0;
    const tempo = 128; // BPM
    const stepDuration = 60 / tempo / 2; // eighth notes

    const bassNotes = [55, 55, 65.41, 55, 73.42, 65.41, 55, 82.41]; // A1 progression

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.isBgmPlaying) return;
      const t = this.ctx.currentTime;

      // Bass note
      const noteFreq = bassNotes[step % bassNotes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, t);

      // Low pass filter for dark cyber groove
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + stepDuration * 0.9);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + stepDuration);

      // Procedural hi-hat pulse
      if (step % 2 === 1) {
        this.playProceduralHat(t, 0.03, 0.15);
      }

      step++;
    }, stepDuration * 1000);
  }

  private playProceduralHat(t: number, duration: number, vol: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  public stopFightBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public dispose() {
    this.stopFightBgm();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioManager = new AudioManager();
