import { AIDifficulty, InputCommands } from './types';
import { Fighter } from './fighter';

export class AIController {
  private difficulty: AIDifficulty;
  private decisionTimer: number = 0;
  private currentCommand: InputCommands = {
    moveX: 0,
    jump: false,
    block: false,
    punch: false,
    kick: false,
    grab: false,
    super: false,
  };

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
  }

  public setDifficulty(diff: AIDifficulty) {
    this.difficulty = diff;
  }

  public update(self: Fighter, opponent: Fighter): InputCommands {
    this.decisionTimer++;

    // Reaction frame interval based on difficulty
    const reactionInterval =
      this.difficulty === 'easy' ? 24 : this.difficulty === 'medium' ? 12 : 5;

    // Reset single-frame action buttons each tick
    this.currentCommand.punch = false;
    this.currentCommand.kick = false;
    this.currentCommand.grab = false;
    this.currentCommand.super = false;
    this.currentCommand.jump = false;

    if (this.decisionTimer % reactionInterval !== 0) {
      return this.currentCommand;
    }

    const dist = Math.abs(self.position.x - opponent.position.x);
    const toOpponent = opponent.position.x >= self.position.x ? 1 : -1;
    const isOpponentAttacking = opponent.state === 'attack';
    const hasSuper = self.superMeter >= self.maxSuperMeter;

    // Default: release block and reset move
    this.currentCommand.block = false;
    this.currentCommand.moveX = 0;

    switch (this.difficulty) {
      case 'easy': {
        // Slow, erratic, rare blocks, random attacks
        if (dist > 2.5) {
          // Walk forward
          this.currentCommand.moveX = toOpponent;
        } else if (dist < 1.3) {
          // Close quarters: 35% punch, 20% kick, 10% grab, 15% step back, 20% idle
          const r = Math.random();
          if (r < 0.35) this.currentCommand.punch = true;
          else if (r < 0.55) this.currentCommand.kick = true;
          else if (r < 0.65) this.currentCommand.grab = true;
          else if (r < 0.8) this.currentCommand.moveX = -toOpponent;
        } else {
          // Mid range: kick or walk forward
          if (Math.random() < 0.4) this.currentCommand.kick = true;
          else this.currentCommand.moveX = toOpponent;
        }

        // Rarely block
        if (isOpponentAttacking && Math.random() < 0.25) {
          this.currentCommand.block = true;
          this.currentCommand.moveX = 0;
        }

        // Fire super if available and close
        if (hasSuper && dist < 2.4 && Math.random() < 0.3) {
          this.currentCommand.super = true;
        }
        break;
      }

      case 'medium': {
        // Tactical spacing, reacts to telegraphs, good block rate
        if (isOpponentAttacking && dist < 2.2) {
          // 65% chance to block high/low
          if (Math.random() < 0.65) {
            this.currentCommand.block = true;
            this.currentCommand.moveX = 0;
            return this.currentCommand;
          }
        }

        // Super punish
        if (hasSuper && (isOpponentAttacking || dist < 2.5) && Math.random() < 0.6) {
          this.currentCommand.super = true;
          return this.currentCommand;
        }

        if (dist > 3.0) {
          // Approach
          this.currentCommand.moveX = toOpponent;
          if (Math.random() < 0.15 && self.isGrounded) {
            this.currentCommand.jump = true;
          }
        } else if (dist < 1.25) {
          // In grab range
          if (opponent.isBlocking && Math.random() < 0.5) {
            // Throw the blocking opponent!
            this.currentCommand.grab = true;
          } else {
            const r = Math.random();
            if (r < 0.4) this.currentCommand.punch = true;
            else if (r < 0.65) this.currentCommand.kick = true;
            else if (r < 0.8) this.currentCommand.grab = true;
            else this.currentCommand.moveX = -toOpponent; // Space out
          }
        } else {
          // Mid range (1.25 - 3.0): Footsies
          const r = Math.random();
          if (r < 0.45) {
            this.currentCommand.kick = true;
          } else if (r < 0.7) {
            this.currentCommand.moveX = toOpponent;
          } else {
            this.currentCommand.moveX = -toOpponent * 0.5;
          }
        }
        break;
      }

      case 'hard': {
        // Punishes whiffs, unblockable grabs on defense, 90% block on incoming, optimal supers
        if (isOpponentAttacking && dist < 2.4) {
          if (opponent.currentMove?.type === 'grab') {
            // Jump away from grabs!
            if (self.isGrounded) this.currentCommand.jump = true;
            this.currentCommand.moveX = -toOpponent;
            return this.currentCommand;
          } else if (Math.random() < 0.9) {
            // Block normal attacks
            this.currentCommand.block = true;
            this.currentCommand.moveX = 0;
            return this.currentCommand;
          }
        }

        // Punish with Super when opponent is recovering or vulnerable
        if (hasSuper && dist < 2.6) {
          this.currentCommand.super = true;
          return this.currentCommand;
        }

        // Close range punish
        if (dist < 1.2) {
          if (opponent.isBlocking) {
            // Grabs pierce block!
            this.currentCommand.grab = true;
          } else {
            // Fast jab into kick combo
            if (Math.random() < 0.6) this.currentCommand.punch = true;
            else this.currentCommand.kick = true;
          }
        } else if (dist < 2.0) {
          // Optimal kick range
          if (Math.random() < 0.65) {
            this.currentCommand.kick = true;
          } else {
            this.currentCommand.moveX = toOpponent;
          }
        } else {
          // Micro-spacing footsies
          this.currentCommand.moveX = toOpponent;
          if (Math.random() < 0.25 && self.isGrounded) {
            this.currentCommand.jump = true;
          }
        }
        break;
      }
    }

    return this.currentCommand;
  }
}
