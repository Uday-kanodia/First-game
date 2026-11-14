import { ComicCaption } from './types';

export interface Particle2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'smoke' | 'wood' | 'fire';
}

export class EffectsManager2D {
  private particles: Particle2D[] = [];
  public captions: ComicCaption[] = [];
  private nextCaptionId = 1;

  public isScreenDarkened = false;
  public darkenOpacity = 0;
  public flashOpacity = 0;

  public spawnHitSparks(x: number, y: number, color = '#facc15', count = 24) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 320;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color,
        size: 3 + Math.random() * 4,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.25,
        type: 'spark',
      });
    }
  }

  public spawnWoodSplinters(x: number, y: number, count = 20) {
    const woodColors = ['#d4a373', '#b08968', '#f59e0b', '#78350f'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 380;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        color: woodColors[Math.floor(Math.random() * woodColors.length)],
        size: 4 + Math.random() * 6,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.3,
        type: 'wood',
      });
    }
  }

  public spawnFireWhirlwind(x: number, y: number, count = 45) {
    const fireColors = ['#f59e0b', '#ef4444', '#f97316', '#fef08a', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 80;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + (Math.random() - 0.5) * 60,
        vx: -Math.sin(angle) * 260,
        vy: -120 - Math.random() * 240,
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        size: 6 + Math.random() * 9,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
        type: 'fire',
      });
    }
  }

  public spawnSuperBurst(x: number, y: number, color = '#f59e0b', count = 48) {
    this.spawnFireWhirlwind(x, y, count);
    this.spawnHitSparks(x, y, color, 30);
    this.triggerImpactFlash();
  }

  public spawnDust(x: number, y: number, count = 16) {
    for (let i = 0; i < count; i++) {
      const dir = (Math.random() - 0.5) * 220;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: dir,
        vy: -20 - Math.random() * 60,
        color: 'rgba(148, 163, 184, 0.6)',
        size: 6 + Math.random() * 8,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        type: 'smoke',
      });
    }
  }

  public addCaption(text: string, worldX: number, worldY: number, color = '#facc15') {
    this.captions.push({
      id: this.nextCaptionId++,
      text,
      x: worldX,
      y: worldY + 1.2,
      color,
      createdAt: performance.now(),
      duration: 1.5,
      scale: 1.0,
    });
  }

  public triggerScreenDarken(duration = 1.1) {
    this.isScreenDarkened = true;
    this.darkenOpacity = 0.75;
    setTimeout(() => {
      this.isScreenDarkened = false;
    }, duration * 1000);
  }

  public triggerImpactFlash() {
    this.flashOpacity = 0.4;
  }

  public update(dt: number) {
    // 1. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Gravity on sparks & wood
      if (p.type === 'spark' || p.type === 'wood') {
        p.vy += 650 * dt;
      } else if (p.type === 'smoke' || p.type === 'fire') {
        p.size += 8 * dt; // expand
      }
    }

    // 2. Update comic captions
    const now = performance.now();
    for (let i = this.captions.length - 1; i >= 0; i--) {
      const cap = this.captions[i];
      const elapsed = (now - cap.createdAt) / 1000;
      if (elapsed >= cap.duration) {
        this.captions.splice(i, 1);
      } else {
        cap.y += 0.4 * dt;
      }
    }

    // 3. Screen darken & flash decay
    if (!this.isScreenDarkened && this.darkenOpacity > 0) {
      this.darkenOpacity = Math.max(0, this.darkenOpacity - 2.5 * dt);
    }
    if (this.flashOpacity > 0) {
      this.flashOpacity = Math.max(0, this.flashOpacity - 4.0 * dt);
    }
  }

  public render(ctx: CanvasRenderingContext2D, toScreenX: (wx: number) => number, toScreenY: (wy: number) => number, zoom: number) {
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, 1.0 - p.life / p.maxLife);
      const sx = toScreenX(p.x);
      const sy = toScreenY(p.y);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'spark') {
        // High impact streak spark
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * zoom;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - p.vx * 0.03 * zoom, sy - p.vy * 0.03 * zoom);
        ctx.stroke();
      } else if (p.type === 'wood') {
        // Splinter rectangle
        ctx.fillRect(sx - (p.size / 2) * zoom, sy - (p.size / 2) * zoom, p.size * zoom * 1.5, p.size * zoom * 0.6);
      } else if (p.type === 'fire') {
        // Fiery glowing orb
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10 * zoom;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * zoom, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Soft dust / smoke
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    // Impact flash
    if (this.flashOpacity > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }

  public dispose() {
    this.particles = [];
    this.captions = [];
  }
}

// Keep EffectsManager alias for backwards compatibility
export { EffectsManager2D as EffectsManager };
