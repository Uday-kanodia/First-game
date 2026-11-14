export interface StageEnvironment2D {
  id: string;
  name: string;
  stageBound: number;
  groundY: number; // in screen normalized / canvas coordinate space
  renderBackground: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number,
    cameraY: number,
    zoom: number,
    time: number
  ) => void;
  renderForeground: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number,
    cameraY: number,
    zoom: number,
    time: number
  ) => void;
  dispose: () => void;
}

export function createStadiumStage2D(): StageEnvironment2D {
  const stageBound = 12.0;
  const groundY = 0.72; // 72% from top of screen

  // Dynamic LED Jumbotron video feed (Google Flow AI match showcase)
  let videoElement: HTMLVideoElement | null = null;
  if (typeof document !== 'undefined') {
    videoElement = document.createElement('video');
    videoElement.src = '/assets/cinematic/thala_flow_cinematic.mp4';
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.autoplay = true;
    videoElement.crossOrigin = 'anonymous';
    videoElement.play().catch(() => {});
  }

  function renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number,
    cameraY: number,
    zoom: number,
    time: number
  ) {
    const cy = height * groundY + cameraY * 40 * zoom;

    // 1. Distant Stadium Arena Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#090d16');
    skyGrad.addColorStop(0.5, '#0f172a');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Sweeping Stadium Spotlights
    ctx.save();
    const beamCount = 4;
    for (let b = 0; b < beamCount; b++) {
      const angle = Math.sin(time * 0.8 + b * 1.5) * 0.35 - 0.2;
      const originX = width * (0.15 + b * 0.25) - cameraX * 15 * zoom;
      ctx.save();
      ctx.translate(originX, 0);
      ctx.rotate(angle);
      const beamGrad = ctx.createLinearGradient(0, 0, 0, height * 0.9);
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      beamGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.05)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.lineTo(120, height * 0.9);
      ctx.lineTo(-120, height * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 3. Giant LED Jumbotron Display in Center
    const screenW = Math.min(width * 0.72, 600) * zoom;
    const screenH = 132 * zoom;
    const screenX = width / 2 - screenW / 2 - cameraX * 25 * zoom;
    const screenY = cy - 275 * zoom;

    ctx.save();
    ctx.fillStyle = '#050811';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, 12);
    ctx.fill();
    ctx.stroke();

    let drawnVideo = false;
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      try {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(screenX + 3, screenY + 3, screenW - 6, screenH - 6, 9);
        ctx.clip();
        ctx.drawImage(videoElement, screenX + 3, screenY + 3, screenW - 6, screenH - 6);

        // Cyber scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = screenY + 3; y < screenY + screenH - 3; y += 4) {
          ctx.fillRect(screenX + 3, y, screenW - 6, 1.5);
        }
        ctx.restore();
        drawnVideo = true;
      } catch {
        drawnVideo = false;
      }
    }

    if (!drawnVideo) {
      // Fallback: Animated Audio Visualizer Bars inside Jumbotron
      ctx.fillStyle = '#38bdf8';
      const barCount = 20;
      const barW = (screenW * 0.7) / barCount;
      for (let i = 0; i < barCount; i++) {
        const bh = (Math.abs(Math.sin(time * 6 + i * 0.5)) * 35 + 10) * zoom;
        ctx.fillRect(screenX + screenW * 0.15 + i * (barW + 3), screenY + screenH - 22 * zoom - bh, barW, bh);
      }

      ctx.font = `bold ${Math.round(18 * zoom)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('CLASH OF TITANS 2D', screenX + screenW / 2, screenY + 34 * zoom);

      ctx.font = `bold ${Math.round(11 * zoom)}px monospace`;
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('WORLD CHAMPIONSHIP · LIVE IN SYNC', screenX + screenW / 2, screenY + 54 * zoom);
    } else {
      // Stadium Jumbotron Top Header Badge
      ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
      ctx.fillRect(screenX + 10, screenY + 8 * zoom, 160 * zoom, 18 * zoom);
      ctx.font = `bold ${Math.round(9 * zoom)}px monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('LIVE • GOOGLE FLOW ARENA', screenX + 10 + 80 * zoom, screenY + 20 * zoom);
    }
    ctx.restore();

    // 4. Darkened Atmospheric Silhouette Crowd Grandstands (Parallax Layer 1)
    const standTopY = cy - 135 * zoom;
    const standH = 135 * zoom;

    // Dark stadium grandstand background gradient
    const standGrad = ctx.createLinearGradient(0, standTopY, 0, cy);
    standGrad.addColorStop(0, '#040711');
    standGrad.addColorStop(0.4, '#080d1a');
    standGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = standGrad;
    ctx.fillRect(0, standTopY, width, standH);

    // Grandstand Tier LED Strip
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(0, standTopY + 45 * zoom, width, 2 * zoom);
    ctx.fillRect(0, standTopY + 85 * zoom, width, 2 * zoom);

    // Dark Silhouette Crowd Spectators (Dense, blurred, layered rows)
    ctx.save();
    const crowdParallaxX = cameraX * 38 * zoom;

    // Layer 1: Back row silhouettes (most distant, deepest shadow)
    const backRowY = standTopY + 36 * zoom;
    const backSpacing = 16 * zoom;
    const backStartX = -((crowdParallaxX * 0.6) % backSpacing) - 20;

    ctx.fillStyle = 'rgba(6, 10, 18, 0.88)';
    for (let x = backStartX; x < width + 30; x += backSpacing) {
      const hash = Math.sin(x * 12.9898);
      const bob = Math.sin(time * 3 + hash * 6) * 2 * zoom;
      const headR = (5 + Math.abs(hash) * 2) * zoom;
      const headX = x + backSpacing / 2;
      const headY = backRowY - bob;

      // Head
      ctx.beginPath();
      ctx.arc(headX, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      // Sloped shoulders
      ctx.beginPath();
      ctx.ellipse(headX, headY + headR * 1.5, headR * 1.8, headR * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Occasional faint camera flash in distant crowd
      if (Math.sin(time * 8 + hash * 20) > 0.96) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(headX + 2 * zoom, headY - 1 * zoom, 2 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(6, 10, 18, 0.88)';
      }
    }

    // Layer 2: Mid row silhouettes (blurred depth of field)
    const midRowY = standTopY + 76 * zoom;
    const midSpacing = 20 * zoom;
    const midStartX = -((crowdParallaxX * 0.8) % midSpacing) - 25;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.94)';
    for (let x = midStartX; x < width + 35; x += midSpacing) {
      const hash = Math.cos(x * 23.456);
      const bob = Math.sin(time * 4.5 + hash * 8) * 3 * zoom;
      const headR = (6 + Math.abs(hash) * 2.5) * zoom;
      const headX = x + midSpacing / 2;
      const headY = midRowY - bob;

      // Cheering arms occasionally raised
      if (hash > 0.45) {
        ctx.beginPath();
        ctx.roundRect(headX - headR * 1.4, headY - headR * 1.8, 3 * zoom, headR * 1.8, 1.5 * zoom);
        ctx.roundRect(headX + headR * 0.8, headY - headR * 1.6, 3 * zoom, headR * 1.6, 1.5 * zoom);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(headX, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(headX, headY + headR * 1.6, headR * 2.1, headR * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layer 3: Front row silhouettes (closest, darkest silhouettes right behind arena rim)
    const frontRowY = standTopY + 116 * zoom;
    const frontSpacing = 26 * zoom;
    const frontStartX = -(crowdParallaxX % frontSpacing) - 30;

    ctx.fillStyle = 'rgba(8, 12, 22, 0.98)';
    for (let x = frontStartX; x < width + 40; x += frontSpacing) {
      const hash = Math.sin(x * 45.123);
      const bob = Math.sin(time * 5 + hash * 10) * 3.5 * zoom;
      const headR = (7.5 + Math.abs(hash) * 2) * zoom;
      const headX = x + frontSpacing / 2;
      const headY = frontRowY - bob;

      ctx.beginPath();
      ctx.arc(headX, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(headX, headY + headR * 1.7, headR * 2.4, headR * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft atmospheric blur & stage fog gradient over crowd to push it back
    const crowdFog = ctx.createLinearGradient(0, standTopY, 0, cy);
    crowdFog.addColorStop(0, 'rgba(4, 7, 17, 0.4)');
    crowdFog.addColorStop(0.6, 'rgba(8, 13, 26, 0.35)');
    crowdFog.addColorStop(1, 'rgba(15, 23, 42, 0.6)');
    ctx.fillStyle = crowdFog;
    ctx.fillRect(0, standTopY, width, standH);

    ctx.restore();

    // 5. High-Tech Combat Arena Floor (Perspective & Neon Trim)
    const floorGrad = ctx.createLinearGradient(0, cy, 0, height);
    floorGrad.addColorStop(0, '#1e293b');
    floorGrad.addColorStop(0.3, '#0f172a');
    floorGrad.addColorStop(1, '#020617');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, cy, width, height - cy);

    // Neon Combat Ring Border
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4 * zoom;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12 * zoom;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    // Center Combat Ring Circle (Perspective Oval)
    const ringCenterX = width / 2 - cameraX * 80 * zoom;
    const ringRadiusX = 240 * zoom;
    const ringRadiusY = 55 * zoom;
    ctx.beginPath();
    ctx.ellipse(ringCenterX, cy + 45 * zoom, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center Stage Decal
    ctx.beginPath();
    ctx.ellipse(ringCenterX, cy + 45 * zoom, 50 * zoom, 12 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function renderForeground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _cameraX: number,
    _cameraY: number,
    _zoom: number,
    _time: number
  ) {
    // Subtle arena perimeter vignette
    const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  return {
    id: 'stadium',
    name: 'Apex Cyber Arena',
    stageBound,
    groundY,
    renderBackground,
    renderForeground,
    dispose: () => {
      if (videoElement) {
        try {
          videoElement.pause();
          videoElement.src = '';
          videoElement.load();
        } catch {
          // ignore
        }
      }
    },
  };
}

export function createStreetStage2D(): StageEnvironment2D {
  const stageBound = 11.5;
  const groundY = 0.74;

  function renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cameraX: number,
    cameraY: number,
    zoom: number,
    time: number
  ) {
    const cy = height * groundY + cameraY * 40 * zoom;

    // 1. Dark Rainy Cyberpunk Sky & Skyline
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0a0518');
    skyGrad.addColorStop(0.4, '#170c2a');
    skyGrad.addColorStop(1, '#241242');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant skyscraper silhouettes
    ctx.fillStyle = '#0e071c';
    const towerW = 70 * zoom;
    for (let i = 0; i < 15; i++) {
      const tx = i * 90 * zoom - cameraX * 18 * zoom;
      const th = (180 + Math.sin(i * 4) * 80) * zoom;
      ctx.fillRect(tx, cy - 120 * zoom - th, towerW, th + 120 * zoom);

      // Glowing skyscraper windows
      ctx.fillStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(6, 182, 212, 0.35)';
      for (let w = 0; w < 4; w++) {
        for (let h = 0; h < 6; h++) {
          ctx.fillRect(tx + 8 * zoom + w * 14 * zoom, cy - 120 * zoom - th + 20 * zoom + h * 22 * zoom, 7 * zoom, 10 * zoom);
        }
      }
      ctx.fillStyle = '#0e071c';
    }

    // 2. Gritty Brick Wall & Fire Escapes
    const wallH = 180 * zoom;
    const wallY = cy - wallH;
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, wallY, width, wallH);

    // Brick texture horizontal lines
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1;
    for (let y = wallY; y < cy; y += 14 * zoom) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Fire Escapes (Metal Platforms & Railings)
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 3 * zoom;
    const escapeX = width * 0.25 - cameraX * 45 * zoom;
    ctx.strokeRect(escapeX, wallY + 40 * zoom, 140 * zoom, 12 * zoom);
    ctx.strokeRect(escapeX + 160 * zoom, wallY + 80 * zoom, 150 * zoom, 12 * zoom);

    // 3. Glowing Neon Signs
    function drawNeonSign(text: string, color: string, x: number, y: number, fontSize: number) {
      ctx.save();
      ctx.font = `900 ${Math.round(fontSize * zoom)}px monospace`;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18 * zoom;
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    const neonPulse = Math.sin(time * 4) * 0.15 + 0.85;
    drawNeonSign('NEON BAR', `rgba(236, 72, 153, ${neonPulse})`, width * 0.2 - cameraX * 45 * zoom, wallY + 70 * zoom, 28);
    drawNeonSign('CYBER CLUB', '#06b6d4', width * 0.5 - cameraX * 45 * zoom, wallY + 45 * zoom, 32);
    drawNeonSign('RAMEN 24H', '#f59e0b', width * 0.8 - cameraX * 45 * zoom, wallY + 85 * zoom, 26);

    // 4. Steam Vents
    ctx.save();
    for (let s = 0; s < 3; s++) {
      const ventX = width * (0.3 + s * 0.25) - cameraX * 60 * zoom;
      const steamY = cy - ((time * 45 + s * 30) % 90) * zoom;
      const steamAlpha = Math.max(0, 1 - ((time * 45 + s * 30) % 90) / 90);
      ctx.fillStyle = `rgba(147, 197, 253, ${steamAlpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(ventX, steamY, (14 + s * 6) * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Wet Asphalt Road with Neon Puddle Reflections
    const roadGrad = ctx.createLinearGradient(0, cy, 0, height);
    roadGrad.addColorStop(0, '#09090b');
    roadGrad.addColorStop(0.3, '#18181b');
    roadGrad.addColorStop(1, '#050507');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, cy, width, height - cy);

    // Neon Puddle Reflection Glow
    ctx.save();
    const puddleX = width * 0.5 - cameraX * 70 * zoom;
    const pGrad = ctx.createRadialGradient(puddleX, cy + 35 * zoom, 10, puddleX, cy + 35 * zoom, 180 * zoom);
    pGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    pGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(puddleX, cy + 35 * zoom, 180 * zoom, 28 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Yellow Lane Marking
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4 * zoom;
    ctx.beginPath();
    ctx.moveTo(0, cy + 18 * zoom);
    ctx.lineTo(width, cy + 18 * zoom);
    ctx.stroke();
  }

  function renderForeground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    _cameraX: number,
    _cameraY: number,
    _zoom: number,
    time: number
  ) {
    // Subtle diagonal rain streaks
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1;
    const rainCount = 60;
    for (let r = 0; r < rainCount; r++) {
      const rx = (r * 37 + time * 450) % width;
      const ry = (r * 73 + time * 900) % height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  return {
    id: 'street',
    name: 'Neon Underbelly',
    stageBound,
    groundY,
    renderBackground,
    renderForeground,
    dispose: () => {},
  };
}

export {
  createStadiumStage2D as createStadiumStage,
  createStreetStage2D as createStreetStage,
  type StageEnvironment2D as StageEnvironment,
};
