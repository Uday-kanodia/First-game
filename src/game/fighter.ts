import {
  AttackType,
  Box2D,
  CharacterConfig,
  FighterState,
  InputCommands,
  MoveConfig,
} from './types';
import {
  computeHitbox,
  computeHurtbox,
  GRAVITY,
  resolveCombatHit,
  STAGE_HALF_WIDTH,
} from './physics';
import { LoadedFighter2D } from './characterLoader';

export class Fighter {
  public id: string;
  public playerIndex: 1 | 2;
  public config: CharacterConfig;
  public model: LoadedFighter2D;

  // Transform on 2D fighting plane (X, Y)
  public position = { x: 0, y: 0 };
  public velocity = { x: 0, y: 0 };
  public facing: number = 1; // +1 = facing right, -1 = facing left

  // Combat Stats
  public health: number = 1000;
  public maxHealth: number = 1000;
  public superMeter: number = 0; // 0 to 100
  public maxSuperMeter: number = 100;
  public roundsWon: number = 0;

  // State Machine
  public state: FighterState = 'idle';
  public isGrounded: boolean = true;
  public isBlocking: boolean = false;

  // Move Execution
  public currentMove: MoveConfig | null = null;
  public moveFrame: number = 0;
  public hasHitDuringMove: boolean = false;
  public hitstunFrames: number = 0;
  public blockstunFrames: number = 0;
  public invincibilityFrames: number = 0;

  // Combo tracking
  public currentComboHits: number = 0;
  public currentComboDamage: number = 0;
  public lastHitTime: number = 0;

  constructor(
    playerIndex: 1 | 2,
    config: CharacterConfig,
    model: LoadedFighter2D,
    initialX: number
  ) {
    this.playerIndex = playerIndex;
    this.id = config.id;
    this.config = config;
    this.model = model;

    this.health = config.health || 1000;
    this.maxHealth = this.health;
    this.position.x = initialX;
    this.position.y = 0;
    this.facing = playerIndex === 1 ? 1 : -1;
  }

  public resetRound(initialX: number, facing: number) {
    this.health = this.maxHealth;
    this.position.x = initialX;
    this.position.y = 0;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.facing = facing;
    this.state = 'idle';
    this.currentMove = null;
    this.moveFrame = 0;
    this.hitstunFrames = 0;
    this.blockstunFrames = 0;
    this.isGrounded = true;
    this.isBlocking = false;
    this.hasHitDuringMove = false;
    this.currentComboHits = 0;
    this.currentComboDamage = 0;
    this.playAnimation('idle');
  }

  public getHurtbox(): Box2D {
    const w = this.config.hitboxSizes.bodyWidth || 0.8;
    const h = this.config.hitboxSizes.bodyHeight || 1.8;
    return computeHurtbox(this.position.x, this.position.y, w, h, this.isBlocking);
  }

  public getHitbox(): Box2D | null {
    if (this.state !== 'attack' || !this.currentMove) return null;

    const { startupFrames, activeFrames } = this.currentMove;
    const isActive =
      this.moveFrame >= startupFrames &&
      this.moveFrame < startupFrames + activeFrames;

    if (!isActive) return null;

    return computeHitbox(this.position.x, this.position.y, this.facing, this.currentMove);
  }

  public playAnimation(_clipName: string) {
    // 2D animation frames are derived directly from fighter state, moveFrame, and timeline
  }

  /**
   * Fixed 60 FPS update logic
   */
  public updateFixed(
    input: InputCommands,
    opponent: Fighter,
    onAttackTriggered?: (move: MoveConfig) => void,
    onHitConnected?: (move: MoveConfig, result: ReturnType<typeof resolveCombatHit>) => void,
    onWhiff?: () => void
  ) {
    const dt = 1 / 60;

    // Auto-face opponent during neutral / moving
    if (
      this.state === 'idle' ||
      this.state === 'walk_fwd' ||
      this.state === 'walk_back'
    ) {
      this.facing = opponent.position.x >= this.position.x ? 1 : -1;
    }

    if (this.invincibilityFrames > 0) {
      this.invincibilityFrames--;
    }

    // 1. Process Hitstun / Blockstun
    if (this.state === 'hitstun') {
      this.hitstunFrames--;
      if (this.hitstunFrames <= 0) {
        this.state = 'idle';
        this.playAnimation('idle');
      }
    } else if (this.state === 'block') {
      if (this.blockstunFrames > 0) {
        this.blockstunFrames--;
      }
      if (!input.block && this.blockstunFrames <= 0) {
        this.state = 'idle';
        this.playAnimation('idle');
      }
    }

    // 2. Process Attack State
    if (this.state === 'attack' && this.currentMove) {
      this.moveFrame++;
      const { startupFrames, activeFrames, recoveryFrames } = this.currentMove;
      const totalFrames = startupFrames + activeFrames + recoveryFrames;

      // Check for hit during active frames
      if (
        this.moveFrame >= startupFrames &&
        this.moveFrame < startupFrames + activeFrames &&
        !this.hasHitDuringMove
      ) {
        const hitbox = this.getHitbox();
        const oppHurtbox = opponent.getHurtbox();

        if (hitbox) {
          // Check collision
          const isOverlapping =
            hitbox.minX <= oppHurtbox.maxX &&
            hitbox.maxX >= oppHurtbox.minX &&
            hitbox.minY <= oppHurtbox.maxY &&
            hitbox.maxY >= oppHurtbox.minY;

          if (isOverlapping) {
            this.hasHitDuringMove = true;
            const hitResult = resolveCombatHit(
              this.currentMove,
              opponent.isBlocking,
              !opponent.isGrounded
            );

            if (hitResult.hit) {
              // Apply damage and knockback to opponent
              opponent.receiveHit(hitResult, this.facing);

              // Meter gains
              this.addSuperMeter(hitResult.attackerMeterGain);
              opponent.addSuperMeter(hitResult.defenderMeterGain);

              if (onHitConnected) {
                onHitConnected(this.currentMove, hitResult);
              }
            } else if (onWhiff) {
              onWhiff();
            }
          }
        }
      }

      // Check if move finished
      if (this.moveFrame >= totalFrames) {
        if (!this.hasHitDuringMove && this.currentMove.type === 'grab' && onWhiff) {
          onWhiff(); // Whiff feedback
        }
        this.state = 'idle';
        this.currentMove = null;
        this.moveFrame = 0;
        this.hasHitDuringMove = false;
        this.playAnimation('idle');
      }
    }

    // 3. Process Neutral Inputs (when not in hitstun, not attacking, not dead)
    if (
      this.state !== 'hitstun' &&
      this.state !== 'attack' &&
      this.state !== 'grabbed' &&
      this.state !== 'win' &&
      this.state !== 'lose'
    ) {
      this.handleNeutralInput(input, onAttackTriggered);
    }

    // 4. Physics and position update
    this.updatePhysics(dt);

    // Pushback against opponent (prevent walking through each other)
    const dist = this.position.x - opponent.position.x;
    const minDist = 0.85;
    if (Math.abs(dist) < minDist && this.isGrounded && opponent.isGrounded) {
      const push = (minDist - Math.abs(dist)) * 0.5;
      const sign = dist >= 0 ? 1 : -1;
      this.position.x += sign * push;
      opponent.position.x -= sign * push;
    }
  }

  private handleNeutralInput(
    input: InputCommands,
    onAttackTriggered?: (move: MoveConfig) => void
  ) {
    // Check for attacks (Super > Grab > Kick > Punch)
    if (input.super && this.superMeter >= this.maxSuperMeter) {
      this.startMove(this.config.moves.super);
      this.superMeter = 0;
      if (onAttackTriggered) onAttackTriggered(this.config.moves.super);
      return;
    }

    if (input.grab) {
      this.startMove(this.config.moves.grab);
      if (onAttackTriggered) onAttackTriggered(this.config.moves.grab);
      return;
    }

    if (input.kick) {
      this.startMove(this.config.moves.kick);
      if (onAttackTriggered) onAttackTriggered(this.config.moves.kick);
      return;
    }

    if (input.punch) {
      this.startMove(this.config.moves.punch);
      if (onAttackTriggered) onAttackTriggered(this.config.moves.punch);
      return;
    }

    // Block
    if (input.block && this.isGrounded) {
      this.isBlocking = true;
      this.state = 'block';
      this.velocity.x = 0;
      this.playAnimation('block');
      return;
    }
    this.isBlocking = false;

    // Jump
    if (input.jump && this.isGrounded) {
      this.velocity.y = this.config.jumpForce || 11.0;
      this.isGrounded = false;
      this.state = 'jump';
      this.playAnimation('jump');
      // Air jump momentum
      this.velocity.x = input.moveX * (this.config.speed || 6.0) * 0.8;
      return;
    }

    // Ground Movement
    if (this.isGrounded) {
      const speed = this.config.speed || 6.0;
      if (Math.abs(input.moveX) > 0.1) {
        this.velocity.x = input.moveX * speed;
        const isFwd = (input.moveX > 0 && this.facing > 0) || (input.moveX < 0 && this.facing < 0);
        this.state = isFwd ? 'walk_fwd' : 'walk_back';
        this.playAnimation(isFwd ? 'walk_fwd' : 'walk_back');
      } else {
        this.velocity.x = 0;
        this.state = 'idle';
        this.playAnimation('idle');
      }
    }
  }

  public startMove(move: MoveConfig) {
    this.state = 'attack';
    this.currentMove = move;
    this.moveFrame = 0;
    this.hasHitDuringMove = false;
    this.isBlocking = false;

    // Movement stops on attack startup
    if (this.isGrounded) {
      this.velocity.x = this.facing * (move.type === 'grab' ? 2.0 : 0.8);
    }

    this.playAnimation(move.animationClip || move.type);
  }

  public receiveHit(hit: ReturnType<typeof resolveCombatHit>, attackerFacing: number) {
    if (this.invincibilityFrames > 0) return;

    // Apply damage with combo scaling
    const comboScale = this.currentComboHits > 1 ? 1 / (1 + 0.3 * (this.currentComboHits - 1)) : 1;
    const finalDamage = Math.max(1, Math.round(hit.damage * comboScale));
    this.health = Math.max(0, this.health - finalDamage);

    if (hit.blocked) {
      this.state = 'block';
      this.blockstunFrames = hit.hitstun;
      this.velocity.x = attackerFacing * (hit.knockback * 0.5);
      this.playAnimation('block');
    } else {
      this.state = 'hitstun';
      this.hitstunFrames = hit.hitstun;
      this.velocity.x = attackerFacing * hit.knockback;
      this.velocity.y = hit.knockback > 5.5 ? 4.5 : 0; // Launch on heavy moves/grabs
      if (this.velocity.y > 0) {
        this.isGrounded = false;
        // Brief invincibility after launch/throw so player isn't juggled endlessly
        this.invincibilityFrames = 22;
      }

      // Cancel any ongoing attack
      this.currentMove = null;
      this.moveFrame = 0;
      this.hasHitDuringMove = false;

      this.playAnimation('hit');
    }
  }

  public addSuperMeter(amount: number) {
    this.superMeter = Math.min(this.maxSuperMeter, this.superMeter + amount);
  }

  private updatePhysics(dt: number) {
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Clamp to arena bounds
    const bound = STAGE_HALF_WIDTH;
    if (this.position.x < -bound) {
      this.position.x = -bound;
      this.velocity.x = 0;
    } else if (this.position.x > bound) {
      this.position.x = bound;
      this.velocity.x = 0;
    }

    // Vertical gravity
    if (this.position.y > 0.001) {
      this.velocity.y -= GRAVITY * dt;
      this.isGrounded = false;
    } else {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
      if (this.state === 'jump') {
        this.state = 'idle';
        this.playAnimation('idle');
      }
      // Horizontal ground friction
      this.velocity.x *= Math.max(0, 1 - 10 * dt);
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    toScreenX: (worldX: number) => number,
    toScreenY: (worldY: number) => number,
    zoom: number
  ) {
    const sx = toScreenX(this.position.x);
    const sy = toScreenY(this.position.y);
    const groundSy = toScreenY(0);

    // Oval contact shadow on ground beneath fighter
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    const shadowWidth = Math.max(16, (40 - Math.min(2.5, this.position.y) * 12) * zoom);
    const shadowHeight = Math.max(5, 10 * zoom);
    ctx.ellipse(sx, groundSy + 4 * zoom, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Invincibility flicker
    if (this.invincibilityFrames > 0 && Math.floor(this.invincibilityFrames / 3) % 2 === 0) {
      return;
    }

    // Render 2D fighter sprite / vector model
    this.model.render(
      ctx,
      sx,
      sy,
      this.facing,
      this.state,
      this.moveFrame / 60,
      zoom,
      this.currentMove?.type
    );
  }
}

