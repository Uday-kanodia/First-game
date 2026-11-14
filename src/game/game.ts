import {
  AIDifficulty,
  CharacterConfig,
  ComicCaption,
  GameScreen,
  GameSettings,
} from './types';
import { Fighter } from './fighter';
import { CameraRig2D } from './cameraRig';
import { characterLoader } from './characterLoader';
import {
  createStadiumStage2D,
  createStreetStage2D,
  StageEnvironment2D,
} from './stages';
import { EffectsManager2D } from './effects';
import { audioManager } from './audioManager';
import { inputManager } from './input';
import { AIController } from './ai';
import { checkRoundWinner } from './physics';

export interface GameEvents {
  onStateChange?: (state: GameScreen) => void;
  onHUDUpdate?: (hud: HUDState) => void;
  onRoundAnnounce?: (text: string, subtext?: string) => void;
  onMatchFinish?: (
    winnerPlayer: 1 | 2,
    winnerConfig: CharacterConfig,
    loserConfig: CharacterConfig
  ) => void;
}

export interface SuperCinematicState {
  active: boolean;
  attackerId: string;
  attackerName: string;
  caption: string;
  videoUrl?: string;
  color?: string;
  moveType?: 'punch' | 'kick' | 'grab' | 'super';
  moveName?: string;
}

export interface HUDState {
  p1Health: number;
  p1MaxHealth: number;
  p1Meter: number;
  p1Name: string;
  p1RoundsWon: number;
  p2Health: number;
  p2MaxHealth: number;
  p2Meter: number;
  p2Name: string;
  p2RoundsWon: number;
  timer: number;
  roundNumber: number;
  captions: ComicCaption[];
  p1Combo: number;
  p2Combo: number;
  screenDarkenOpacity: number;
  superCinematic?: SuperCinematicState | null;
}

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public cameraRig: CameraRig2D;
  public effects: EffectsManager2D;
  public aiController: AIController;

  private canvasContainer: HTMLElement;
  private currentScreen: GameScreen = 'title';
  private events: GameEvents = {};
  private currentSuperCinematic: SuperCinematicState | null = null;

  // Game Loop timing
  private isRunning = false;
  private animationFrameId: number = 0;
  private fixedAccumulator = 0;
  private lastTime = 0;
  private gameTime = 0;

  // Hit-pause (simulation freeze for impacts)
  private hitPauseTimer = 0;
  private slowMotionMultiplier = 1.0;

  // Active Stage
  private currentStage: StageEnvironment2D | null = null;
  private currentStageId: string = 'stadium';

  // Fighters
  public fighter1: Fighter | null = null;
  public fighter2: Fighter | null = null;
  public previewFighter: Fighter | null = null;

  // Match State
  private roundNumber = 1;
  private roundTimer = 99.0;
  private isRoundActive = false;
  private isMatchOver = false;
  private roundEndDelay = 0;

  // Settings
  public settings: GameSettings = {
    quality: 'high',
    sfxVolume: 0.8,
    musicVolume: 0.5,
    muted: false,
    aiDifficulty: 'medium',
    isTwoPlayer: false,
  };

  public isPaused = false;
  private dpr = 1;

  constructor(container: HTMLElement, events: GameEvents = {}) {
    this.canvasContainer = container;
    this.events = events;

    // Create 2D HTML5 Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'w-full h-full block select-none touch-none';
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to create 2D canvas context');
    }
    this.ctx = ctx;
    container.appendChild(this.canvas);

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cameraRig = new CameraRig2D();
    this.effects = new EffectsManager2D();
    this.aiController = new AIController(this.settings.aiDifficulty);

    this.loadSettings();
    this.setupWindowListeners();
    this.resizeCanvas();

    // Default stage & initial screen
    this.setStage('stadium');
    this.setScreen('title');

    this.startLoop();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('cot2d_game_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore localStorage errors
    }
  }

  public saveSettings() {
    try {
      localStorage.setItem('cot2d_game_settings', JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  public setQuality(quality: 'low' | 'medium' | 'high') {
    this.settings.quality = quality;
    if (quality === 'low') {
      this.dpr = 1;
    } else {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    }
    this.resizeCanvas();
    this.saveSettings();
  }

  public setAIDifficulty(diff: AIDifficulty) {
    this.settings.aiDifficulty = diff;
    this.aiController.setDifficulty(diff);
    this.saveSettings();
  }

  public setTwoPlayer(is2P: boolean) {
    this.settings.isTwoPlayer = is2P;
    this.saveSettings();
  }

  private setupWindowListeners() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentScreen === 'fighting') {
        this.togglePause();
      }
    });
  }

  private onResize = () => {
    this.resizeCanvas();
  };

  private resizeCanvas() {
    if (!this.canvasContainer) return;
    const width = this.canvasContainer.clientWidth || window.innerWidth;
    const height = this.canvasContainer.clientHeight || window.innerHeight;

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  public setScreen(screen: GameScreen) {
    this.currentScreen = screen;
    this.isPaused = false;

    if (screen === 'title') {
      this.cameraRig.setMode('title');
      this.removeFighters();
      audioManager.stopFightBgm();
    } else if (screen === 'char_select') {
      this.cameraRig.setMode('preview');
      this.removeFighters();
      audioManager.stopFightBgm();
    } else if (screen === 'fighting') {
      this.cameraRig.setMode('fight');
      audioManager.startFightBgm();
    } else if (screen === 'result') {
      audioManager.stopFightBgm();
    }

    if (this.events.onStateChange) {
      this.events.onStateChange(screen);
    }
  }

  public setStage(stageId: string) {
    this.currentStageId = stageId;
    if (this.currentStage) {
      this.currentStage.dispose();
      this.currentStage = null;
    }

    if (stageId === 'street') {
      this.currentStage = createStreetStage2D();
    } else {
      this.currentStage = createStadiumStage2D();
    }
  }

  public async setPreviewCharacter(charId: string) {
    this.previewFighter = null;
    try {
      const model = await characterLoader.loadCharacter(charId);
      this.previewFighter = new Fighter(1, model.config, model, 0);
      this.previewFighter.playAnimation('idle');
    } catch (e) {
      console.warn('Failed to load preview character:', e);
    }
  }

  public async startMatch(p1CharId: string, p2CharId: string, stageId: string) {
    this.setStage(stageId);
    this.removeFighters();

    const [p1Model, p2Model] = await Promise.all([
      characterLoader.loadCharacter(p1CharId),
      characterLoader.loadCharacter(p2CharId),
    ]);

    // Preload sound buffers for both combatants (move sfx + win/lose audio)
    await Promise.all([
      audioManager.loadCharacterAudio(p1CharId, p1Model.config),
      audioManager.loadCharacterAudio(p2CharId, p2Model.config),
    ]);

    this.fighter1 = new Fighter(1, p1Model.config, p1Model, -3.5);
    this.fighter2 = new Fighter(2, p2Model.config, p2Model, 3.5);

    this.roundNumber = 1;
    this.isMatchOver = false;
    this.fighter1.roundsWon = 0;
    this.fighter2.roundsWon = 0;

    this.startRound();
    this.setScreen('fighting');
  }

  public startRound() {
    if (!this.fighter1 || !this.fighter2) return;

    this.fighter1.resetRound(-3.5, 1);
    this.fighter2.resetRound(3.5, -1);
    this.roundTimer = 99.0;
    this.isRoundActive = false;
    this.roundEndDelay = 0;

    // Round announcement sequence
    const roundLabel = `ROUND ${this.roundNumber}`;
    audioManager.playAnnouncerChime('round');
    if (this.events.onRoundAnnounce) {
      this.events.onRoundAnnounce(roundLabel, 'GET READY');
    }

    setTimeout(() => {
      audioManager.playAnnouncerChime('fight');
      if (this.events.onRoundAnnounce) {
        this.events.onRoundAnnounce('FIGHT!', '');
      }
      this.isRoundActive = true;
    }, 1500);
  }

  private removeFighters() {
    this.fighter1 = null;
    this.fighter2 = null;
    this.previewFighter = null;
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
  }

  public triggerHitstop(durationSeconds = 0.065) {
    this.hitPauseTimer = durationSeconds;
  }

  // --- Main Engine Loop ---
  private startLoop() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05) * this.slowMotionMultiplier;
    this.gameTime += dt;

    // 1. Fixed Timestep Combat Simulation (60 FPS)
    const fixedDt = 1 / 60;
    this.fixedAccumulator += dt;

    if (!this.isPaused) {
      if (this.hitPauseTimer > 0) {
        this.hitPauseTimer -= dt;
      } else {
        while (this.fixedAccumulator >= fixedDt) {
          this.fixedUpdate();
          this.fixedAccumulator -= fixedDt;
        }
      }
    }

    // 2. Render 2D Frame
    this.render(dt);
  };

  private fixedUpdate() {
    if (this.currentScreen === 'fighting' && this.fighter1 && this.fighter2) {
      const p1Input = inputManager.getPlayer1Input();
      const p2Input = this.settings.isTwoPlayer
        ? inputManager.getPlayer2Input()
        : this.aiController.update(this.fighter2, this.fighter1);

      if (this.isRoundActive) {
        // Update timer
        this.roundTimer = Math.max(0, this.roundTimer - 1 / 60);

        // Update Fighters
        this.fighter1.updateFixed(
          p1Input,
          this.fighter2,
          (move) => this.onAttackTriggered(this.fighter1!, move),
          (move, hit) => this.onHitConnected(this.fighter1!, this.fighter2!, move, hit),
          () => audioManager.playWhiff()
        );

        this.fighter2.updateFixed(
          p2Input,
          this.fighter1,
          (move) => this.onAttackTriggered(this.fighter2!, move),
          (move, hit) => this.onHitConnected(this.fighter2!, this.fighter1!, move, hit),
          () => audioManager.playWhiff()
        );

        // Check Round End condition
        const winner = checkRoundWinner(
          this.fighter1.health,
          this.fighter2.health,
          this.roundTimer
        );

        if (winner !== -1 && this.isRoundActive) {
          this.handleRoundFinish(winner);
        }
      } else if (this.roundEndDelay > 0) {
        this.roundEndDelay -= 1 / 60;
        if (this.roundEndDelay <= 0 && !this.isMatchOver) {
          this.roundNumber++;
          this.startRound();
        }
      }
    }

    inputManager.endFrame();
  }

  private onAttackTriggered(attacker: Fighter, move: CharacterConfig['moves']['punch']) {
    const charId = attacker.config.id;
    const moveVideoUrl = move.videoPath || (charId === 'thala' ? `/characters/thala/video/${move.type}.mp4` : undefined);

    if (move.type === 'super') {
      audioManager.playCharacterMove(charId, 'super', () => audioManager.playSuper());
      const superColor = attacker.config.id === 'thala' ? '#f59e0b' : attacker.config.color;
      this.effects.spawnSuperBurst(attacker.position.x, attacker.position.y + 0.8, superColor);
      this.effects.triggerScreenDarken(1.1);
      this.effects.addCaption(
        move.caption || 'SUPER MOVE!',
        attacker.position.x,
        attacker.position.y,
        attacker.config.accentColor || '#f59e0b'
      );
      this.cameraRig.triggerSuper(attacker.position.x, attacker.facing, 1.1);

      // Trigger high-octane Super Cut-in sequence
      this.currentSuperCinematic = {
        active: true,
        attackerId: attacker.config.id,
        attackerName: attacker.config.name,
        caption: move.caption || 'HELICOPTER SHOT!',
        videoUrl: moveVideoUrl || (attacker.config.id === 'thala' ? '/characters/thala/video/super.mp4' : undefined),
        color: attacker.config.accentColor || '#f59e0b',
        moveType: 'super',
        moveName: move.name || 'Helicopter Shot',
      };

      setTimeout(() => {
        if (this.currentSuperCinematic?.attackerId === attacker.config.id && this.currentSuperCinematic?.moveType === 'super') {
          this.currentSuperCinematic = null;
        }
      }, 2600);

      // Slow-motion dramatic hit punch
      this.slowMotionMultiplier = 0.45;
      setTimeout(() => {
        this.slowMotionMultiplier = 1.0;
      }, 700);
    } else {
      // Punch, Kick, Grab
      if (move.type === 'punch') {
        audioManager.playCharacterMove(charId, 'punch', () => {
          if (charId === 'thala') {
            audioManager.playBatCrack();
          } else {
            audioManager.playPunch();
          }
        });
      } else if (move.type === 'kick') {
        audioManager.playCharacterMove(charId, 'kick', () => audioManager.playKick());
      } else if (move.type === 'grab') {
        audioManager.playCharacterMove(charId, 'grab', () => {
          if (charId === 'thala') {
            audioManager.playWicketSmash();
          } else {
            audioManager.playGrab();
          }
        });
      }

      // If this move has an associated action video clip (e.g. Thala's bat swing, kick, or wicket smash), trigger cut-in!
      if (moveVideoUrl) {
        this.currentSuperCinematic = {
          active: true,
          attackerId: attacker.config.id,
          attackerName: attacker.config.name,
          caption: move.caption || move.name,
          videoUrl: moveVideoUrl,
          color: attacker.config.accentColor || '#f59e0b',
          moveType: move.type,
          moveName: move.name,
        };

        const displayDuration = move.type === 'grab' ? 2200 : 1800;
        setTimeout(() => {
          if (this.currentSuperCinematic?.attackerId === attacker.config.id && this.currentSuperCinematic?.moveType === move.type) {
            this.currentSuperCinematic = null;
          }
        }, displayDuration);
      }
    }
  }

  private onHitConnected(
    attacker: Fighter,
    defender: Fighter,
    move: CharacterConfig['moves']['punch'],
    result: { blocked: boolean; damage: number; caption: string }
  ) {
    const hitX = (attacker.position.x + defender.position.x) / 2;
    const hitY = defender.position.y + 1.1;

    if (result.blocked) {
      audioManager.playBlock();
      this.effects.spawnHitSparks(hitX, hitY, '#38bdf8', 12);
      this.effects.addCaption('GUARDED!', attacker.position.x, hitY, '#94a3b8');
      this.cameraRig.shake(8, 10.0);
      this.triggerHitstop(0.04);
    } else {
      const isHeavy = move.type === 'super' || move.type === 'grab' || move.type === 'kick';
      if (attacker.config.id === 'thala' && move.type === 'punch') {
        audioManager.playBatCrack();
      } else {
        audioManager.playHitImpact(isHeavy);
      }

      const sparkColor = attacker.config.id === 'thala' ? '#f59e0b' : '#facc15';
      this.effects.spawnHitSparks(hitX, hitY, sparkColor, isHeavy ? 32 : 18);
      this.effects.addCaption(result.caption, attacker.position.x, hitY, attacker.config.color);
      this.cameraRig.shake(isHeavy ? 18 : 10, isHeavy ? 6.0 : 9.0);
      this.triggerHitstop(isHeavy ? 0.08 : 0.045);

      if (attacker.config.id === 'thala' && move.type === 'grab') {
        this.effects.spawnWoodSplinters(hitX, hitY, 24);
      } else if (move.type === 'grab') {
        this.effects.spawnDust(defender.position.x, 0);
      }
    }
  }

  private handleRoundFinish(winnerCode: number) {
    this.isRoundActive = false;
    this.roundEndDelay = 3.5;

    let announceText = 'K.O.!';
    if (this.roundTimer <= 0) {
      announceText = 'TIME OVER!';
    }
    audioManager.playAnnouncerChime('ko');

    if (winnerCode === 1) {
      this.fighter1!.roundsWon++;
      if (this.events.onRoundAnnounce) {
        this.events.onRoundAnnounce(announceText, `${this.fighter1!.config.name} WINS ROUND!`);
      }
    } else if (winnerCode === 2) {
      this.fighter2!.roundsWon++;
      if (this.events.onRoundAnnounce) {
        this.events.onRoundAnnounce(announceText, `${this.fighter2!.config.name} WINS ROUND!`);
      }
    } else {
      if (this.events.onRoundAnnounce) {
        this.events.onRoundAnnounce(announceText, 'DRAW GAME!');
      }
    }

    // Check match victory (best of 3: first to 2 rounds)
    if (this.fighter1!.roundsWon >= 2 || this.fighter2!.roundsWon >= 2) {
      this.isMatchOver = true;
      const winner = this.fighter1!.roundsWon >= 2 ? this.fighter1! : this.fighter2!;
      const loser = winner === this.fighter1 ? this.fighter2! : this.fighter1!;

      winner.playAnimation('win');
      loser.playAnimation('lose');

      this.cameraRig.triggerVictory(winner.position.x);

      setTimeout(() => {
        audioManager.playWinAudio(winner.config.id);
        this.setScreen('result');
        if (this.events.onMatchFinish) {
          this.events.onMatchFinish(
            winner === this.fighter1 ? 1 : 2,
            winner.config,
            loser.config
          );
        }
      }, 2500);
    }
  }

  private render(dt: number) {
    const width = this.canvasContainer.clientWidth || window.innerWidth;
    const height = this.canvasContainer.clientHeight || window.innerHeight;
    const ctx = this.ctx;

    // Update camera targets
    if (this.currentScreen === 'fighting' && this.fighter1 && this.fighter2) {
      this.cameraRig.update(dt, this.fighter1.position, this.fighter2.position);
    } else {
      this.cameraRig.update(dt);
    }

    // Coordinate conversion mapping
    const camX = this.cameraRig.x + this.cameraRig.shakeOffsetX;
    const camY = this.cameraRig.y + this.cameraRig.shakeOffsetY;
    const zoom = this.cameraRig.zoom;
    const groundFraction = this.currentStage ? this.currentStage.groundY : 0.72;

    const toScreenX = (worldX: number) => {
      return width / 2 + (worldX - camX) * 72 * zoom;
    };
    const toScreenY = (worldY: number) => {
      const baseGroundY = height * groundFraction + camY * 35 * zoom;
      return baseGroundY - worldY * 72 * zoom;
    };

    // Render 2D Frame
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Stage Parallax Background
    if (this.currentStage) {
      this.currentStage.renderBackground(ctx, width, height, camX, camY, zoom, this.gameTime);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Screen darken effect for supers
    if (this.effects.darkenOpacity > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${this.effects.darkenOpacity * 0.78})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 3. Render Fighters
    if (this.currentScreen === 'fighting' && this.fighter1 && this.fighter2) {
      this.fighter1.render(ctx, toScreenX, toScreenY, zoom);
      this.fighter2.render(ctx, toScreenX, toScreenY, zoom);
    } else if (this.currentScreen === 'char_select' && this.previewFighter) {
      this.previewFighter.render(ctx, toScreenX, toScreenY, zoom);
    }

    // 4. Effects (particles, splinters, super whirlwinds, comic popups, impact flash)
    this.effects.update(dt);
    this.effects.render(ctx, toScreenX, toScreenY, zoom);

    // 5. Stage Foreground (rain streaks, stage vignette)
    if (this.currentStage) {
      this.currentStage.renderForeground(ctx, width, height, camX, camY, zoom, this.gameTime);
    }

    ctx.restore();

    // Push HUD updates to React
    if (this.events.onHUDUpdate && this.fighter1 && this.fighter2) {
      this.events.onHUDUpdate({
        p1Health: this.fighter1.health,
        p1MaxHealth: this.fighter1.maxHealth,
        p1Meter: this.fighter1.superMeter,
        p1Name: this.fighter1.config.name,
        p1RoundsWon: this.fighter1.roundsWon,
        p2Health: this.fighter2.health,
        p2MaxHealth: this.fighter2.maxHealth,
        p2Meter: this.fighter2.superMeter,
        p2Name: this.fighter2.config.name,
        p2RoundsWon: this.fighter2.roundsWon,
        timer: Math.ceil(this.roundTimer),
        roundNumber: this.roundNumber,
        captions: this.effects.captions,
        p1Combo: this.fighter1.currentComboHits,
        p2Combo: this.fighter2.currentComboHits,
        screenDarkenOpacity: this.effects.darkenOpacity,
        superCinematic: this.currentSuperCinematic,
      });
    }
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.removeFighters();
    if (this.currentStage) {
      this.currentStage.dispose();
    }
    this.effects.dispose();
    audioManager.dispose();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
