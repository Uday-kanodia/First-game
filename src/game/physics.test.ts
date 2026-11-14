import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkAABBCollision,
  computeHurtbox,
  computeHitbox,
  resolveCombatHit,
  tickFighterPhysics,
  checkRoundWinner,
} from './physics';
import { MoveConfig } from './types';

const samplePunch: MoveConfig = {
  type: 'punch',
  name: 'Jab',
  damage: 60,
  meterGain: 10,
  startupFrames: 5,
  activeFrames: 4,
  recoveryFrames: 8,
  range: 1.5,
  knockback: 2.0,
  hitstun: 15,
  caption: 'CRACK!',
  animationClip: 'punch',
  audioPath: '',
  unblockable: false,
};

const sampleGrab: MoveConfig = {
  type: 'grab',
  name: 'Seismic Throw',
  damage: 180,
  meterGain: 25,
  startupFrames: 8,
  activeFrames: 5,
  recoveryFrames: 24,
  range: 1.2,
  knockback: 6.0,
  hitstun: 35,
  caption: 'SLAM!',
  animationClip: 'grab',
  audioPath: '',
  unblockable: true,
};

test('AABB collision correctly detects overlapping and separated boxes', () => {
  const box1 = { minX: 0, maxX: 2, minY: 0, maxY: 2 };
  const box2 = { minX: 1, maxX: 3, minY: 1, maxY: 3 };
  const box3 = { minX: 5, maxX: 7, minY: 5, maxY: 7 };

  assert.equal(checkAABBCollision(box1, box2), true);
  assert.equal(checkAABBCollision(box1, box3), false);
});

test('computeHitbox accounts for attacker facing direction', () => {
  const facingRight = computeHitbox(0, 0, 1, samplePunch);
  assert.ok(facingRight.maxX > 0);
  assert.ok(facingRight.minX >= 0);

  const facingLeft = computeHitbox(0, 0, -1, samplePunch);
  assert.ok(facingLeft.minX < 0);
  assert.ok(facingLeft.maxX <= 0);
});

test('resolveCombatHit calculates blocking damage reduction', () => {
  const unblockedHit = resolveCombatHit(samplePunch, false, false);
  assert.equal(unblockedHit.hit, true);
  assert.equal(unblockedHit.blocked, false);
  assert.equal(unblockedHit.damage, 60);

  const blockedHit = resolveCombatHit(samplePunch, true, false);
  assert.equal(blockedHit.hit, true);
  assert.equal(blockedHit.blocked, true);
  assert.ok(blockedHit.damage < 60);
  assert.equal(blockedHit.caption, 'GUARDED!');
});

test('resolveCombatHit makes grabs unblockable but whiff on airborne targets', () => {
  // Grab against blocking opponent on the ground: connects for full unblockable damage!
  const grabVsBlock = resolveCombatHit(sampleGrab, true, false);
  assert.equal(grabVsBlock.hit, true);
  assert.equal(grabVsBlock.blocked, false);
  assert.equal(grabVsBlock.damage, 180);
  assert.equal(grabVsBlock.caption, 'SLAM!');

  // Grab against airborne opponent: whiffs!
  const grabVsAir = resolveCombatHit(sampleGrab, false, true);
  assert.equal(grabVsAir.hit, false);
  assert.equal(grabVsAir.damage, 0);
  assert.equal(grabVsAir.caption, 'WHIFF!');
});

test('tickFighterPhysics respects stage bounds and ground collision', () => {
  const pos = { x: 13, y: 0 };
  const vel = { x: 5, y: 0 };
  const result = tickFighterPhysics(pos, vel, true, 0.016, 12);

  assert.ok(pos.x <= 12, 'Position clamped to stage bound');
  assert.equal(result.isGrounded, true);
});

test('checkRoundWinner evaluates victory, loss, double KO, and timeout', () => {
  assert.equal(checkRoundWinner(0, 500, 50), 2, 'P2 wins when P1 dies');
  assert.equal(checkRoundWinner(500, 0, 50), 1, 'P1 wins when P2 dies');
  assert.equal(checkRoundWinner(0, 0, 50), 0, 'Double KO is a draw');
  assert.equal(checkRoundWinner(600, 400, 0), 1, 'P1 wins on timeout with higher HP');
  assert.equal(checkRoundWinner(300, 300, 0), 0, 'Timeout with equal HP is draw');
  assert.equal(checkRoundWinner(500, 500, 40), -1, 'Round ongoing when both alive and time remains');
});
