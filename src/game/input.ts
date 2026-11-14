import { InputCommands } from './types';

export class InputManager {
  private keysHeld = new Set<string>();
  private keysJustPressed = new Set<string>();

  // Touch virtual controls
  private touchMoveX = 0;
  private touchJump = false;
  private touchBlock = false;
  private touchPunch = false;
  private touchKick = false;
  private touchGrab = false;
  private touchSuper = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scroll on arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!this.keysHeld.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keysHeld.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
    });
  }

  // --- Mobile Touch API ---
  public setTouchStick(normX: number) {
    this.touchMoveX = Math.max(-1, Math.min(1, normX));
  }

  public setTouchAction(action: 'jump' | 'block' | 'punch' | 'kick' | 'grab' | 'super', active: boolean) {
    switch (action) {
      case 'jump':
        this.touchJump = active;
        break;
      case 'block':
        this.touchBlock = active;
        break;
      case 'punch':
        this.touchPunch = active;
        break;
      case 'kick':
        this.touchKick = active;
        break;
      case 'grab':
        this.touchGrab = active;
        break;
      case 'super':
        this.touchSuper = active;
        break;
    }
  }

  public getPlayer1Input(): InputCommands {
    const gamepad = this.getGamepad(0);

    // Keyboard P1: A/D move, W jump, S block, J punch, K kick, L grab, I super
    let moveX = 0;
    if (this.keysHeld.has('KeyA')) moveX -= 1;
    if (this.keysHeld.has('KeyD')) moveX += 1;

    let jump = this.keysJustPressed.has('KeyW') || this.keysHeld.has('KeyW');
    let block = this.keysHeld.has('KeyS');
    let punch = this.keysJustPressed.has('KeyJ');
    let kick = this.keysJustPressed.has('KeyK');
    let grab = this.keysJustPressed.has('KeyL');
    let superMove = this.keysJustPressed.has('KeyI');

    // Merge Gamepad
    if (gamepad) {
      if (Math.abs(gamepad.axes[0]) > 0.25) {
        moveX = gamepad.axes[0];
      }
      if (gamepad.buttons[14]?.pressed) moveX = -1; // D-pad left
      if (gamepad.buttons[15]?.pressed) moveX = 1; // D-pad right
      if (gamepad.buttons[12]?.pressed) jump = true; // D-pad up
      if (gamepad.buttons[13]?.pressed) block = true; // D-pad down
      if (gamepad.buttons[2]?.pressed) punch = true; // X / Square
      if (gamepad.buttons[0]?.pressed) kick = true; // A / Cross
      if (gamepad.buttons[1]?.pressed) grab = true; // B / Circle
      if (gamepad.buttons[3]?.pressed || gamepad.buttons[5]?.pressed) superMove = true; // Y / Triangle or RB
    }

    // Merge Touch
    if (Math.abs(this.touchMoveX) > 0.1) moveX = this.touchMoveX;
    if (this.touchJump) jump = true;
    if (this.touchBlock) block = true;
    if (this.touchPunch) {
      punch = true;
      this.touchPunch = false; // consume
    }
    if (this.touchKick) {
      kick = true;
      this.touchKick = false; // consume
    }
    if (this.touchGrab) {
      grab = true;
      this.touchGrab = false; // consume
    }
    if (this.touchSuper) {
      superMove = true;
      this.touchSuper = false; // consume
    }

    return {
      moveX,
      jump,
      block,
      punch,
      kick,
      grab,
      super: superMove,
    };
  }

  public getPlayer2Input(): InputCommands {
    const gamepad = this.getGamepad(1);

    // Keyboard P2: Arrow keys + 1/2/3 punch/kick/grab, 5 super (both top row and numpad)
    let moveX = 0;
    if (this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('ArrowRight')) moveX += 1;

    let jump = this.keysJustPressed.has('ArrowUp') || this.keysHeld.has('ArrowUp');
    let block = this.keysHeld.has('ArrowDown');

    let punch =
      this.keysJustPressed.has('Digit1') || this.keysJustPressed.has('Numpad1');
    let kick =
      this.keysJustPressed.has('Digit2') || this.keysJustPressed.has('Numpad2');
    let grab =
      this.keysJustPressed.has('Digit3') || this.keysJustPressed.has('Numpad3');
    let superMove =
      this.keysJustPressed.has('Digit5') || this.keysJustPressed.has('Numpad5');

    if (gamepad) {
      if (Math.abs(gamepad.axes[0]) > 0.25) moveX = gamepad.axes[0];
      if (gamepad.buttons[14]?.pressed) moveX = -1;
      if (gamepad.buttons[15]?.pressed) moveX = 1;
      if (gamepad.buttons[12]?.pressed) jump = true;
      if (gamepad.buttons[13]?.pressed) block = true;
      if (gamepad.buttons[2]?.pressed) punch = true;
      if (gamepad.buttons[0]?.pressed) kick = true;
      if (gamepad.buttons[1]?.pressed) grab = true;
      if (gamepad.buttons[3]?.pressed || gamepad.buttons[5]?.pressed) superMove = true;
    }

    return {
      moveX,
      jump,
      block,
      punch,
      kick,
      grab,
      super: superMove,
    };
  }

  private getGamepad(index: number): Gamepad | null {
    if (typeof navigator.getGamepads !== 'function') return null;
    const gamepads = navigator.getGamepads();
    return gamepads[index] || null;
  }

  public endFrame() {
    this.keysJustPressed.clear();
  }
}

export const inputManager = new InputManager();
