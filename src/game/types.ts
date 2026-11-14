/**
 * Core Type Definitions for Clash of Titans 3D Fighting Game
 */

export type AttackType = 'punch' | 'kick' | 'grab' | 'super';

export interface MoveConfig {
  type: AttackType;
  name: string;
  damage: number;
  meterGain: number;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  range: number;
  knockback: number;
  hitstun: number;
  caption: string;
  animationClip: string;
  audioPath: string;
  videoPath?: string;
  unblockable?: boolean;
}

export interface HitboxSizes {
  bodyWidth: number;
  bodyHeight: number;
  headRadius: number;
}

export interface CharacterCaptions {
  win: string;
  lose: string;
  counter?: string;
  blocked?: string;
}

export interface CharacterAudioConfig {
  win?: string;
  lose?: string;
  grab?: string;
  punch?: string;
  kick?: string;
  super?: string;
}

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  bio?: string;
  health: number;
  speed: number;
  jumpForce: number;
  weight: number;
  scale: number;
  color: string;
  accentColor: string;
  modelPath: string;
  hitboxSizes: HitboxSizes;
  moves: Record<AttackType, MoveConfig>;
  audio?: CharacterAudioConfig;
  video?: Record<string, string>;
  captions: CharacterCaptions;
}

export interface CharacterListItem {
  id: string;
  name: string;
  title: string;
  archetype: string;
  color: string;
  accentColor: string;
}

export type FighterState =
  | 'idle'
  | 'walk_fwd'
  | 'walk_back'
  | 'jump'
  | 'block'
  | 'attack'
  | 'hitstun'
  | 'grabbed'
  | 'knockdown'
  | 'win'
  | 'lose';

export interface Box2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface InputCommands {
  moveX: number; // -1 to 1
  jump: boolean;
  block: boolean;
  punch: boolean;
  kick: boolean;
  grab: boolean;
  super: boolean;
}

export interface ComicCaption {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
  duration: number; // in seconds
  scale: number;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GameScreen =
  | 'title'
  | 'char_select'
  | 'stage_select'
  | 'fighting'
  | 'result';

export interface GameSettings {
  quality: 'low' | 'medium' | 'high';
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  aiDifficulty: AIDifficulty;
  isTwoPlayer: boolean;
}
