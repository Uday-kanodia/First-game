# Clash of Titans 2D - High-Octane 2D Fighting Game

A complete 2D fighting game web application built with **HTML5 Canvas 2D**, **Vite**, and **TypeScript/React**. Runs at 60 FPS in modern desktop and mobile browsers, deployable to static hosts (Netlify, Vercel, GitHub Pages) with zero backend requirements.

---

## 🎮 Game Features

- **1v1 Combat on a 2D Lane**: Classic left/right footwork, high jumping, crouching, and guard blocking, framed with a dynamic 2D camera that tracks both fighters, zooms based on distance (0.85x–1.25x), and delivers dramatic zooms on supers.
- **The 4 Core Attacks**:
  1. **PUNCH**: Fast startup (4-7 frames), low damage, safe on block (Thala: *Greatest Finisher* willow bat crack).
  2. **KICK**: Medium startup (7-11 frames), higher damage, longer horizontal reach (Thala: *Fitness King* bicycle kick).
  3. **GRAB**: Short-range, **unblockable throw**! Pierces through guarding opponents; whiffs against jumping opponents with heavy recovery frame penalty (Thala: *Lightning Speed* sprint & wicket smash with wood splinters).
  4. **SUPER**: Requires 100% Super Meter. Triggers a cinematic sequence: screen darkens, dynamic camera zoom, slow motion, energy particle burst, and massive damage (Thala: *Helicopter Shot* fiery whirlwind).
- **Hit Detection & Feel**: Fixed 60 FPS timestep physics decoupled from rendering, AABB hitboxes and hurtboxes, variable knockback, hit-stun, hit-pause (hitstop 45-80ms for crunchy game feel), screen shake, impact flashes, and bold comic-style pop-up text (`CRACK!`, `SLAM!`, `BOOM!`, `LIGHTNING SPEED!`, `HELICOPTER SHOT!`) near the attacker.
- **Balanced HP & Combat Math**: Generous HP pools (Thala: 1750, Titan: 1950, Dummy: 1600, Blaze: 1450), combo damage decay formula, 22 invulnerability frames after heavy throws/launches, and 10% block chip damage.
- **Best of 3 Rounds**: 99-second countdown timer, round announcements (`ROUND 1... FIGHT!`, `K.O.!`), and victory poses.
- **AI Opponents**: Easy, Medium, and Hard profiles with reaction delay simulation, footsies spacing, defensive blocking, and super execution.
- **2 Multi-Layer Parallax Stages**:
  1. *Apex Cyber Arena* (Grand stadium with sweeping spotlights, crowd cheers, animated LED jumbotron, and goal posts).
  2. *Neon Underbelly* (Cyberpunk alley with glowing neon signs, wet asphalt reflections, steam vents, and diagonal rain streaks).
- **Audio Synthesizer & Assets**: Web Audio API procedural sound synthesizer (punches, kicks, grabs, bat cracks, wicket smashes, announcer chimes, and combat rhythm BGM) + asset fallback.
- **Controls**:
  - **Keyboard P1**: `A`/`D` Move, `W` Jump, `S` Block, `J` Punch, `K` Kick, `L` Grab, `I` Super.
  - **Keyboard P2**: Arrow keys (`←`/`→`/`↑`/`↓`) + `1` Punch, `2` Kick, `3` Grab, `5` Super.
  - **Mobile**: On-screen touch joystick + 4 arcade action buttons.
  - **Gamepad**: Standard Gamepad API support (D-pad/stick, A/B/X/Y).

---

## 📁 File Structure

```text
/
├── index.html
├── metadata.json
├── package.json
├── style.css
├── tsconfig.json
├── vite.config.ts
├── README.md
├── public/
│   └── characters/
│       ├── index.json
│       ├── thala/
│       │   └── character.json
│       ├── dummy/
│       │   └── character.json
│       ├── titan/
│       │   └── character.json
│       └── blaze/
│           └── character.json
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── game.ts
    ├── fighter.ts
    ├── characterLoader.ts
    ├── cameraRig.ts
    ├── ai.ts
    ├── ui.ts
    ├── effects.ts
    ├── audioManager.ts
    ├── input.ts
    ├── stages.ts
    └── game/
        ├── types.ts
        ├── physics.ts
        ├── physics.test.ts
        ├── game.ts
        ├── fighter.ts
        ├── characterLoader.ts
        ├── cameraRig.ts
        ├── ai.ts
        ├── ui.ts
        ├── effects.ts
        ├── audioManager.ts
        ├── input.ts
        └── stages.ts
```

---

## 🔌 Data-Driven Character Plug-In System

You can add custom characters to the roster simply by dropping a new folder under `/public/characters/<id>/`.

### 1. Folder Layout

```text
/public/characters/<character_id>/
├── character.json       (Required: metadata, stats, moveset, hitbox dimensions, captions)
├── model.glb            (Optional: rigged 3D GLTF/GLB model with animations)
└── audio/               (Optional: custom sound effects)
    ├── punch.mp3
    ├── kick.mp3
    ├── grab.mp3
    ├── super.mp3
    ├── win.mp3
    └── lose.mp3
```

> **Zero Asset Fallback**: If `model.glb` is missing, the engine automatically generates a stylized, composite procedural 3D robotic warrior with expressively articulated joints (head, visor, chest, arms, fists, thighs, shins, boots) and smooth procedural animations. If audio files are missing, the engine plays procedural Web Audio synth sound effects.

### 2. Roster Index Entry (`/public/characters/index.json`)

Register the character ID in `/public/characters/index.json`:

```json
[
  {
    "id": "dummy",
    "name": "Dummy",
    "title": "Combat Prototype",
    "archetype": "All-Rounder",
    "color": "#38bdf8",
    "accentColor": "#0284c7"
  },
  {
    "id": "my_warrior",
    "name": "Valkyrie",
    "title": "Aero Striker",
    "archetype": "Aerial Speed",
    "color": "#a855f7",
    "accentColor": "#7e22ce"
  }
]
```

### 3. Required Animation Clip Names in `model.glb`

When preparing a rigged 3D character in Blender / Maya, export with the following animation clips:
- `idle`: combat breathing / stance bobbing.
- `walk` (or `walk_fwd`): forward movement.
- `walk_back`: defensive backward retreat.
- `jump`: airborne tuck / ascension.
- `block`: cross-arm guard stance.
- `hit`: flinch / recoil from impact.
- `punch`: jab / straight strike.
- `kick`: roundhouse / sweep kick.
- `grab`: forward grapple reach & slam.
- `super`: explosive overdrive combo sequence.
- `win`: victory celebration pose.
- `lose`: defeat collapse / stagger.

### 4. 3D Model Scale & Orientation Tips

- **Facing Direction**: The model should face forward along the +Z axis in its rest pose (or +X depending on convention; the loader rotates Y to face the opponent).
- **Scale**: Target height of roughly 1.8 to 2.0 units in 3D world space. If your model is imported in centimeters (e.g. 180 units tall), specify `"scale": 0.01` in `character.json`.
- **Pivot**: Place the model's root origin at bottom center `(0, 0, 0)` flush on the ground.

### 5. Sample `character.json`

```json
{
  "id": "sample_hero",
  "name": "Sample Hero",
  "title": "Cyber Commando",
  "bio": "Equipped with titanium power knuckles and hyper-velocity thrusters.",
  "health": 1000,
  "speed": 6.2,
  "jumpForce": 11.5,
  "weight": 1.0,
  "scale": 1.0,
  "color": "#38bdf8",
  "accentColor": "#0284c7",
  "modelPath": "model.glb",
  "hitboxSizes": {
    "bodyWidth": 0.8,
    "bodyHeight": 1.8,
    "headRadius": 0.28
  },
  "moves": {
    "punch": {
      "type": "punch",
      "name": "Linear Jab",
      "damage": 65,
      "meterGain": 12,
      "startupFrames": 5,
      "activeFrames": 4,
      "recoveryFrames": 8,
      "range": 1.4,
      "knockback": 2.2,
      "hitstun": 14,
      "caption": "CRACK!",
      "animationClip": "punch",
      "audioPath": "audio/punch.mp3",
      "unblockable": false
    },
    "kick": {
      "type": "kick",
      "name": "Impact Roundhouse",
      "damage": 120,
      "meterGain": 18,
      "startupFrames": 9,
      "activeFrames": 6,
      "recoveryFrames": 14,
      "range": 1.85,
      "knockback": 4.5,
      "hitstun": 22,
      "caption": "WHAM!",
      "animationClip": "kick",
      "audioPath": "audio/kick.mp3",
      "unblockable": false
    },
    "grab": {
      "type": "grab",
      "name": "Seismic Throw",
      "damage": 180,
      "meterGain": 25,
      "startupFrames": 8,
      "activeFrames": 5,
      "recoveryFrames": 26,
      "range": 1.15,
      "knockback": 6.0,
      "hitstun": 35,
      "caption": "SLAM!",
      "animationClip": "grab",
      "audioPath": "audio/grab.mp3",
      "unblockable": true
    },
    "super": {
      "type": "super",
      "name": "Overdrive Protocol",
      "damage": 340,
      "meterGain": 0,
      "startupFrames": 12,
      "activeFrames": 14,
      "recoveryFrames": 28,
      "range": 2.4,
      "knockback": 8.5,
      "hitstun": 45,
      "caption": "METEOR BURST!",
      "animationClip": "super",
      "audioPath": "audio/super.mp3",
      "unblockable": false
    }
  },
  "captions": {
    "win": "OBJECTIVE COMPLETE. TARGET NEUTRALIZED.",
    "lose": "SYSTEMS FAILING... DISENGAGING COMBAT.",
    "counter": "COUNTER HIT!",
    "blocked": "GUARDED!"
  }
}
```

---

## 🚀 Run & Deploy Instructions

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run dev server (accessible at http://localhost:3000)
npm run dev

# 3. Run physics & combat unit tests
npx tsx --test src/game/physics.test.ts
```

### Production Build
```bash
# Compile and build optimized static assets
npm run build
```
The output directory will be `dist/`.

### Static Hosting Deployment (Netlify / Vercel / GitHub Pages)
- **Netlify**: Connect your GitHub repo, set Build Command to `npm run build` and Publish Directory to `dist`.
- **Vercel**: Deploy as a Vite project with root directory `./` and output `dist`.
- **GitHub Pages**: Upload the contents of `dist/` or use the GitHub Pages static deploy workflow.
