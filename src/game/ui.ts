/**
 * UI helper constants and formatting utilities for HUD, captions, and stats.
 */

import { CharacterConfig, ComicCaption } from './types';

export function formatHealth(current: number, max: number): string {
  return `${Math.max(0, Math.round(current))} / ${max}`;
}

export function formatSuperMeter(meter: number): string {
  if (meter >= 100) return 'MAX READY!';
  return `${Math.floor(meter)}%`;
}

export function getCaptionStyle(caption: ComicCaption) {
  return {
    color: caption.color,
    transform: `scale(${caption.scale})`,
  };
}

export function formatCharacterStats(config: CharacterConfig) {
  return {
    health: config.health,
    speed: config.speed,
    jumpForce: config.jumpForce,
    moves: {
      punch: config.moves.punch.damage,
      kick: config.moves.kick.damage,
      grab: config.moves.grab.damage,
      super: config.moves.super.damage,
    },
  };
}
