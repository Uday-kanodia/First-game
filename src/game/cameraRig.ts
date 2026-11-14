export type CameraMode = 'fight' | 'super' | 'victory' | 'preview' | 'title';

export class CameraRig2D {
  public static SHAKE_ENABLED = false;

  public x: number = 0;
  public y: number = 0;
  public zoom: number = 1.0;

  private currentMode: CameraMode = 'title';

  // Target positions in 2D fight lane
  private targetX: number = 0;
  private targetY: number = 0;
  private targetZoom: number = 1.0;

  // Screen shake
  private shakeIntensity: number = 0;
  private shakeDecay: number = 8.0;
  public shakeOffsetX: number = 0;
  public shakeOffsetY: number = 0;

  // Super move cinematic camera
  private superTimer: number = 0;
  private superDuration: number = 1.0;
  private superFocusX: number = 0;
  private superFacing: number = 1;

  // Victory shot
  private victoryTimer: number = 0;
  private victoryFocusX: number = 0;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
  }

  public setMode(mode: CameraMode) {
    this.currentMode = mode;
  }

  public shake(intensity = 12, decay = 8.0) {
    if (!CameraRig2D.SHAKE_ENABLED) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = decay;
  }

  public triggerSuper(attackerX: number, facing: number, duration = 1.1) {
    this.currentMode = 'super';
    this.superTimer = 0;
    this.superDuration = duration;
    this.superFocusX = attackerX;
    this.superFacing = facing;
    this.shake(8, 5.0);
  }

  public triggerVictory(winnerX: number) {
    this.currentMode = 'victory';
    this.victoryTimer = 0;
    this.victoryFocusX = winnerX;
  }

  public update(
    dt: number,
    p1?: { x: number; y: number },
    p2?: { x: number; y: number }
  ) {
    // 1. Shake decay
    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * this.shakeIntensity * dt);
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 2. Mode target evaluation
    switch (this.currentMode) {
      case 'title': {
        const t = performance.now() * 0.0006;
        this.targetX = Math.sin(t) * 1.5;
        this.targetY = 0.3 + Math.cos(t * 0.8) * 0.2;
        this.targetZoom = 1.0;
        break;
      }
      case 'preview': {
        // Shift camera left so the 3D preview fighter and arena stage appear on the right, clear of the left info panel
        this.targetX = -2.2;
        this.targetY = 0.35;
        this.targetZoom = 1.25;
        break;
      }
      case 'fight': {
        if (!p1 || !p2) break;
        const midX = (p1.x + p2.x) / 2;
        const midY = Math.max(0, (p1.y + p2.y) / 2);
        const dist = Math.abs(p1.x - p2.x);

        // Zoom based on fighter distance
        // Close footsies (< 3.0 units) -> zoom in (1.18x)
        // Separated (> 6.0 units) -> pull back (0.88x)
        const zoomFactor = Math.max(0.85, Math.min(1.25, 1.25 - (dist - 2.5) * 0.07));

        this.targetX = midX;
        this.targetY = midY * 0.5;
        this.targetZoom = zoomFactor;
        break;
      }
      case 'super': {
        this.superTimer += dt;
        const p = Math.min(1, this.superTimer / this.superDuration);

        // Dynamic cinematic zoom punch on the attacker
        this.targetX = this.superFocusX + this.superFacing * 0.3;
        this.targetY = 0.5;
        this.targetZoom = 1.45 + Math.sin(p * Math.PI) * 0.15;

        if (this.superTimer >= this.superDuration) {
          this.currentMode = 'fight';
        }
        break;
      }
      case 'victory': {
        this.victoryTimer += dt;
        this.targetX = this.victoryFocusX;
        this.targetY = 0.4;
        this.targetZoom = 1.35;
        break;
      }
    }

    // 3. Smooth exponential damping
    const speed = this.currentMode === 'super' ? 12.0 : 6.0;
    this.x += (this.targetX - this.x) * Math.min(1, speed * dt);
    this.y += (this.targetY - this.y) * Math.min(1, speed * dt);
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, speed * dt);
  }
}

// Keep CameraRig alias for backwards compatibility
export { CameraRig2D as CameraRig };
