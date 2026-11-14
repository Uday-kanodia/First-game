import { AttackType, Box2D, MoveConfig } from './types';

/**
 * Pure logic and math functions for 2D combat physics on a 1D/2D fight lane.
 */

export const GRAVITY = 28.0;
export const STAGE_HALF_WIDTH = 12.0;

/**
 * Checks if two 2D axis-aligned bounding boxes overlap.
 */
export function checkAABBCollision(a: Box2D, b: Box2D): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

/**
 * Calculates a fighter's body hurtbox based on position and size.
 */
export function computeHurtbox(
  posX: number,
  posY: number,
  width: number,
  height: number,
  isCrouchingOrBlocking = false
): Box2D {
  const actualHeight = isCrouchingOrBlocking ? height * 0.75 : height;
  return {
    minX: posX - width / 2,
    maxX: posX + width / 2,
    minY: posY,
    maxY: posY + actualHeight,
  };
}

/**
 * Calculates the active attack hitbox for a fighter facing +1 (right) or -1 (left).
 */
export function computeHitbox(
  attackerX: number,
  attackerY: number,
  facing: number,
  move: MoveConfig
): Box2D {
  const reach = move.range;
  const boxWidth = reach * 0.9;
  const boxHeight = move.type === 'kick' ? 0.9 : move.type === 'grab' ? 0.8 : 0.7;
  const heightOffset = move.type === 'kick' ? 0.6 : 0.9;

  let minX: number;
  let maxX: number;

  if (facing >= 0) {
    minX = attackerX + 0.1;
    maxX = attackerX + reach;
  } else {
    minX = attackerX - reach;
    maxX = attackerX - 0.1;
  }

  return {
    minX,
    maxX,
    minY: attackerY + heightOffset - boxHeight / 2,
    maxY: attackerY + heightOffset + boxHeight / 2,
  };
}

export interface HitResult {
  hit: boolean;
  damage: number;
  blocked: boolean;
  knockback: number;
  hitstun: number;
  attackerMeterGain: number;
  defenderMeterGain: number;
  caption: string;
}

/**
 * Resolves combat calculation when an attack connects.
 * - Grabs are unblockable! If opponent is blocking, grab hits for full damage.
 * - If normal attack hits a blocking opponent, damage is reduced by 80%, knockback is halved, and hitstun is short (guard block).
 * - Super meter builds up for both parties.
 */
export function resolveCombatHit(
  move: MoveConfig,
  isDefenderBlocking: boolean,
  isDefenderAirborne: boolean
): HitResult {
  const isGrab = move.type === 'grab' || move.unblockable;

  // Grabs whiff if defender is airborne!
  if (isGrab && isDefenderAirborne) {
    return {
      hit: false,
      damage: 0,
      blocked: false,
      knockback: 0,
      hitstun: 0,
      attackerMeterGain: 0,
      defenderMeterGain: 0,
      caption: 'WHIFF!',
    };
  }

  // Blocking logic:
  // If grab -> unblockable!
  // If non-grab and defender is blocking:
  const blocked = !isGrab && isDefenderBlocking;

  // Block reduces damage to 10% chip damage
  const damage = blocked ? Math.max(1, Math.round(move.damage * 0.1)) : move.damage;
  const knockback = blocked ? move.knockback * 0.35 : move.knockback;
  const hitstun = blocked ? Math.round(move.hitstun * 0.4) : move.hitstun;

  const attackerMeterGain = blocked ? Math.round(move.meterGain * 0.4) : move.meterGain;
  const defenderMeterGain = Math.round(move.meterGain * 0.35);

  const caption = blocked
    ? 'GUARDED!'
    : isGrab
    ? move.caption || 'SLAM!'
    : move.caption || 'HIT!';

  return {
    hit: true,
    damage,
    blocked,
    knockback,
    hitstun,
    attackerMeterGain,
    defenderMeterGain,
    caption,
  };
}

/**
 * Updates 2D position with velocity, friction, gravity, and arena bounds.
 */
export function tickFighterPhysics(
  pos: { x: number; y: number },
  vel: { x: number; y: number },
  isGrounded: boolean,
  dt: number,
  stageBound = STAGE_HALF_WIDTH
): { isGrounded: boolean } {
  // Apply velocity
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;

  // Arena bounds clamping
  if (pos.x < -stageBound) {
    pos.x = -stageBound;
    vel.x = 0;
  } else if (pos.x > stageBound) {
    pos.x = stageBound;
    vel.x = 0;
  }

  // Gravity
  if (pos.y > 0.001) {
    vel.y -= GRAVITY * dt;
    isGrounded = false;
  } else {
    pos.y = 0;
    vel.y = 0;
    isGrounded = true;
    // Ground horizontal friction
    vel.x *= Math.max(0, 1 - 12 * dt);
  }

  return { isGrounded };
}

/**
 * Checks round outcome:
 * Returns:
 *  1: Player 1 wins round
 *  2: Player 2 wins round
 *  0: Draw / Double KO
 * -1: Round continues
 */
export function checkRoundWinner(
  p1Health: number,
  p2Health: number,
  timerSeconds: number
): number {
  if (p1Health <= 0 && p2Health <= 0) return 0; // Double KO
  if (p1Health <= 0) return 2; // P2 wins
  if (p2Health <= 0) return 1; // P1 wins

  if (timerSeconds <= 0) {
    if (p1Health > p2Health) return 1;
    if (p2Health > p1Health) return 2;
    return 0; // Time over draw
  }

  return -1; // Round ongoing
}
