import { CharacterConfig, CharacterListItem, FighterState } from './types';

export interface LoadedFighter2D {
  config: CharacterConfig;
  render: (
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    facing: number,
    state: FighterState,
    animTime: number,
    zoom: number,
    moveType?: string
  ) => void;
}

// Pose anchors for individual transparent Thala sprites (anchored by feet position at bottom)
const THALA_POSE_ANCHORS: Record<string, { anchorX: number; anchorY: number }> = {
  idle: { anchorX: 0.5, anchorY: 1.0 },
  walk: { anchorX: 0.5, anchorY: 1.0 },
  jump: { anchorX: 0.5, anchorY: 0.9 },
  hit: { anchorX: 0.45, anchorY: 1.0 },
  block: { anchorX: 0.5, anchorY: 1.0 },
  punch: { anchorX: 0.28, anchorY: 1.0 },
  kick: { anchorX: 0.45, anchorY: 0.88 },
  grab_sprint: { anchorX: 0.5, anchorY: 1.0 },
  grab_stumps: { anchorX: 0.4, anchorY: 1.0 },
  super_charge: { anchorX: 0.5, anchorY: 1.0 },
  super_shot: { anchorX: 0.32, anchorY: 0.95 },
  win: { anchorX: 0.5, anchorY: 1.0 },
  lose: { anchorX: 0.5, anchorY: 1.0 },
};

interface ThalaSpriteData {
  image: HTMLImageElement;
  loaded: boolean;
  anchorX: number;
  anchorY: number;
}

export class CharacterLoader2D {
  private characterCache = new Map<string, CharacterConfig>();
  private thalaSprites = new Map<string, ThalaSpriteData>();

  constructor() {
    this.preloadThalaSprites();
  }

  private preloadThalaSprites() {
    for (const [name, anchor] of Object.entries(THALA_POSE_ANCHORS)) {
      const img = new Image();
      const spriteData: ThalaSpriteData = {
        image: img,
        loaded: false,
        anchorX: anchor.anchorX,
        anchorY: anchor.anchorY,
      };

      img.onload = () => {
        spriteData.loaded = true;
      };
      img.onerror = () => {
        console.warn(`Could not load Thala sprite /characters/thala/sprites/${name}.png`);
      };

      img.src = `/characters/thala/sprites/${name}.png`;
      this.thalaSprites.set(name, spriteData);
    }
  }

  public async getCharacterList(): Promise<CharacterListItem[]> {
    try {
      const res = await fetch('/characters/index.json');
      if (!res.ok) throw new Error('Could not fetch /characters/index.json');
      return await res.json();
    } catch {
      return [
        {
          id: 'thala',
          name: 'Thala',
          title: 'Veteran Wicketkeeper-Batsman',
          archetype: 'Legendary Finisher',
          color: '#2563eb',
          accentColor: '#f59e0b',
        },
        {
          id: 'dummy',
          name: 'Dummy',
          title: 'Combat Prototype',
          archetype: 'All-Rounder',
          color: '#38bdf8',
          accentColor: '#0284c7',
        },
        {
          id: 'titan',
          name: 'Titan-09',
          title: 'Heavy Armor Brawler',
          archetype: 'Heavy Grappler',
          color: '#f97316',
          accentColor: '#c2410c',
        },
        {
          id: 'blaze',
          name: 'Shadow Blaze',
          title: 'Cyber Ninja',
          archetype: 'Speed Striker',
          color: '#ec4899',
          accentColor: '#be185d',
        },
      ];
    }
  }

  public async loadCharacterConfig(charId: string): Promise<CharacterConfig> {
    if (this.characterCache.has(charId)) {
      return this.characterCache.get(charId)!;
    }

    try {
      const res = await fetch(`/characters/${charId}/character.json`);
      if (!res.ok) throw new Error(`Could not load character config for ${charId}`);
      const config: CharacterConfig = await res.json();
      this.characterCache.set(charId, config);
      return config;
    } catch {
      const fallbackConfig: CharacterConfig = {
        id: charId,
        name: charId.toUpperCase(),
        title: 'Combatant',
        health: 1600,
        speed: 6.2,
        jumpForce: 11.2,
        weight: 1.0,
        scale: 1.0,
        color: '#38bdf8',
        accentColor: '#0284c7',
        modelPath: '',
        hitboxSizes: { bodyWidth: 0.8, bodyHeight: 1.8, headRadius: 0.28 },
        moves: {
          punch: {
            type: 'punch',
            name: 'Jab',
            damage: 32,
            meterGain: 12,
            startupFrames: 5,
            activeFrames: 4,
            recoveryFrames: 8,
            range: 1.4,
            knockback: 2.2,
            hitstun: 14,
            caption: 'CRACK!',
            animationClip: 'punch',
            audioPath: '',
          },
          kick: {
            type: 'kick',
            name: 'Roundhouse',
            damage: 58,
            meterGain: 18,
            startupFrames: 9,
            activeFrames: 6,
            recoveryFrames: 14,
            range: 1.85,
            knockback: 4.5,
            hitstun: 22,
            caption: 'WHAM!',
            animationClip: 'kick',
            audioPath: '',
          },
          grab: {
            type: 'grab',
            name: 'Throw',
            damage: 88,
            meterGain: 25,
            startupFrames: 8,
            activeFrames: 5,
            recoveryFrames: 26,
            range: 1.15,
            knockback: 6.0,
            hitstun: 35,
            caption: 'SLAM!',
            animationClip: 'grab',
            audioPath: '',
            unblockable: true,
          },
          super: {
            type: 'super',
            name: 'Overdrive',
            damage: 200,
            meterGain: 0,
            startupFrames: 12,
            activeFrames: 14,
            recoveryFrames: 28,
            range: 2.4,
            knockback: 8.5,
            hitstun: 45,
            caption: 'METEOR BURST!',
            animationClip: 'super',
            audioPath: '',
          },
        },
        captions: {
          win: 'MISSION ACCOMPLISHED!',
          lose: 'SYSTEMS COMPROMISED...',
        },
      };
      return fallbackConfig;
    }
  }

  public async loadCharacter(charId: string): Promise<LoadedFighter2D> {
    const config = await this.loadCharacterConfig(charId);
    return this.loadModel(config);
  }

  public async loadModel(config: CharacterConfig): Promise<LoadedFighter2D> {
    if (config.id === 'thala') {
      return {
        config,
        render: (ctx, screenX, screenY, facing, state, animTime, zoom, moveType) => {
          this.renderThala(ctx, screenX, screenY, facing, state, animTime, zoom, moveType);
        },
      };
    }

    // Procedural 2D Fighting Game Sprites for Dummy, Titan-09, Shadow Blaze
    return {
      config,
      render: (ctx, screenX, screenY, facing, state, animTime, zoom, moveType) => {
        this.renderProcedural2DFighter(ctx, config, screenX, screenY, facing, state, animTime, zoom, moveType);
      },
    };
  }

  // --- THALA 2D RENDERER (INDIVIDUAL TRANSPARENT PNG SPRITES ANCHORED BY FEET) ---
  private renderThala(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    facing: number,
    state: FighterState,
    animTime: number,
    zoom: number,
    moveType?: string
  ) {
    // Select sprite key based on state & moveType
    let spriteKey = 'idle';

    switch (state) {
      case 'idle':
        spriteKey = 'idle';
        break;
      case 'walk_fwd':
      case 'walk_back':
        spriteKey = 'walk';
        break;
      case 'jump':
        spriteKey = 'jump';
        break;
      case 'block':
        spriteKey = 'block';
        break;
      case 'hitstun':
        spriteKey = 'hit';
        break;
      case 'attack':
        if (moveType === 'punch') {
          spriteKey = 'punch';
        } else if (moveType === 'kick') {
          spriteKey = 'kick';
        } else if (moveType === 'grab') {
          spriteKey = animTime > 0.22 ? 'grab_stumps' : 'grab_sprint';
        } else if (moveType === 'super') {
          spriteKey = animTime > 0.25 ? 'super_shot' : 'super_charge';
        }
        break;
      case 'win':
        spriteKey = 'win';
        break;
      case 'lose':
        spriteKey = 'lose';
        break;
    }

    const spriteData = this.thalaSprites.get(spriteKey) || this.thalaSprites.get('idle');

    if (!spriteData || !spriteData.loaded || !spriteData.image.naturalWidth) {
      // Fallback while loading
      ctx.save();
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(screenX - 25 * zoom, screenY - 140 * zoom, 50 * zoom, 140 * zoom);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(screenX, screenY);

    // Subtle breathing or movement bob
    let bob = 0;
    if (state === 'idle') bob = Math.sin(animTime * 5.0) * 3 * zoom;
    if (state === 'walk_fwd' || state === 'walk_back') bob = Math.abs(Math.sin(animTime * 8.0)) * 6 * zoom;

    // Contact shadow at feet level
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 38 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Horizontal facing flip
    ctx.scale(facing >= 0 ? 1 : -1, 1);

    // Target render size calibrated for 1.85m tall fighter anchored at feet
    const baseH = 175 * zoom;
    const idleHeight = this.thalaSprites.get('idle')?.image.naturalHeight || 194;
    const scale = baseH / idleHeight;

    const drawW = spriteData.image.naturalWidth * scale;
    const drawH = spriteData.image.naturalHeight * scale;

    const drawX = -drawW * spriteData.anchorX;
    const drawY = -drawH * spriteData.anchorY - bob;

    ctx.drawImage(
      spriteData.image,
      drawX,
      drawY,
      drawW,
      drawH
    );

    ctx.restore();
  }

  // --- PROCEDURAL 2D FIGHTING GAME SPRITE (DUMMY, TITAN, BLAZE) ---
  private renderProcedural2DFighter(
    ctx: CanvasRenderingContext2D,
    config: CharacterConfig,
    screenX: number,
    screenY: number,
    facing: number,
    state: FighterState,
    animTime: number,
    zoom: number,
    moveType?: string
  ) {
    ctx.save();
    ctx.translate(screenX, screenY);

    // Contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 36 * zoom * (config.scale || 1), 9 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Facing direction
    ctx.scale(facing >= 0 ? 1 : -1, 1);
    const s = (config.scale || 1.0) * zoom;

    const mainColor = config.color || '#38bdf8';
    const accentColor = config.accentColor || '#0284c7';
    const darkColor = '#1e293b';

    let bob = 0;
    let chestTilt = 0;
    let armLead = 0;
    let armBack = 0;
    let legLead = 0;
    let legBack = 0;

    switch (state) {
      case 'idle':
        bob = Math.sin(animTime * 5.0) * 4 * s;
        chestTilt = Math.sin(animTime * 2.5) * 0.04;
        armLead = 0.4 + Math.sin(animTime * 5.0) * 0.05;
        armBack = -0.3;
        legLead = 0.1;
        legBack = -0.1;
        break;
      case 'walk_fwd':
      case 'walk_back': {
        const cycle = animTime * 9.0;
        bob = Math.abs(Math.sin(cycle)) * 6 * s;
        chestTilt = 0.08;
        legLead = Math.sin(cycle) * 0.5;
        legBack = -legLead;
        armLead = -legLead * 0.7;
        armBack = legLead * 0.7;
        break;
      }
      case 'jump':
        legLead = -0.4;
        legBack = -0.5;
        armLead = 1.0;
        armBack = 0.8;
        break;
      case 'block':
        chestTilt = -0.15;
        armLead = 1.2;
        armBack = 1.2;
        break;
      case 'hitstun':
        chestTilt = -0.4;
        armLead = 0.8;
        armBack = -0.5;
        break;
      case 'attack':
        if (moveType === 'punch') {
          const p = Math.sin(Math.min(1, animTime / 0.22) * Math.PI);
          armLead = p * 1.5;
          chestTilt = p * 0.2;
        } else if (moveType === 'kick') {
          const p = Math.sin(Math.min(1, animTime / 0.32) * Math.PI);
          legLead = p * 1.6;
          chestTilt = -p * 0.3;
        } else if (moveType === 'grab') {
          const p = Math.sin(Math.min(1, animTime / 0.55) * Math.PI);
          armLead = p * 1.4;
          armBack = p * 1.4;
        } else if (moveType === 'super') {
          const p = Math.sin(animTime * 14.0) * 0.8;
          armLead = 1.2 + p * 0.5;
          armBack = -1.2 - p * 0.5;
        }
        break;
      case 'win':
        armLead = 2.4;
        armBack = 2.4;
        break;
      case 'lose':
        bob = -20 * s;
        chestTilt = 0.4;
        legLead = -0.6;
        break;
    }

    // Legs
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 14 * s;
    ctx.lineCap = 'round';

    // Back leg
    ctx.beginPath();
    ctx.moveTo(0, -65 * s - bob);
    ctx.lineTo(Math.sin(legBack) * 35 * s - 10 * s, -35 * s - bob);
    ctx.lineTo(Math.sin(legBack) * 50 * s - 10 * s, 0);
    ctx.stroke();

    // Lead leg (with boots)
    ctx.strokeStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(0, -65 * s - bob);
    ctx.lineTo(Math.sin(legLead) * 35 * s + 10 * s, -35 * s - bob);
    ctx.lineTo(Math.sin(legLead) * 50 * s + 12 * s, 0);
    ctx.stroke();

    // Torso / Chest
    ctx.save();
    ctx.translate(0, -95 * s - bob);
    ctx.rotate(chestTilt);

    // Abdomen & Chest
    ctx.fillStyle = darkColor;
    ctx.fillRect(-18 * s, 10 * s, 36 * s, 25 * s);

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.roundRect(-24 * s, -30 * s, 48 * s, 42 * s, 6 * s);
    ctx.fill();

    // Glowing core emblem
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10 * s;
    ctx.beginPath();
    ctx.arc(0, -10 * s, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.roundRect(-14 * s, -65 * s, 28 * s, 30 * s, 5 * s);
    ctx.fill();

    // Visor
    ctx.fillStyle = accentColor;
    ctx.fillRect(2 * s, -55 * s, 14 * s, 8 * s);

    // Back Arm
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.moveTo(-18 * s, -20 * s);
    ctx.lineTo(-28 * s + Math.sin(armBack) * 25 * s, -5 * s);
    ctx.lineTo(-24 * s + Math.sin(armBack) * 45 * s, 10 * s);
    ctx.stroke();

    // Lead Arm
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 13 * s;
    ctx.beginPath();
    ctx.moveTo(18 * s, -20 * s);
    ctx.lineTo(24 * s + Math.cos(armLead) * 25 * s, -20 * s + Math.sin(armLead) * 25 * s);
    ctx.lineTo(26 * s + Math.cos(armLead) * 45 * s, -20 * s + Math.sin(armLead) * 45 * s);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }
}

// Keep CharacterLoader alias for backwards compatibility
export { CharacterLoader2D as CharacterLoader };
export const characterLoader = new CharacterLoader2D();
