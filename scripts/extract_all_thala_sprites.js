import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const SHEET_W = 1376;
const SHEET_H = 768;
const rawSheet = fs.readFileSync('/tmp/sheet.rgba');

const outDir = path.resolve('public/characters/thala/sprites');
fs.mkdirSync(outDir, { recursive: true });

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Check if a pixel matches the pale grey-blue panel color ~RGB(221, 229, 235)
function isGreyBluePanel(r, g, b) {
  const dist = colorDist(r, g, b, 221, 229, 235);
  if (dist < 42) return true;
  // Also pale pastel blue-grey tones
  if (r >= 208 && g >= 218 && b >= 222) return true;
  // Panel divider lines / gutters / white borders
  if (r >= 244 && g >= 244 && b >= 244) return true;
  return false;
}

// Special check for WIN panel sky/crowd background
function isWinBg(r, g, b, yFrac) {
  // Pale panel color
  if (isGreyBluePanel(r, g, b)) return true;
  // Sky in win panel: blue sky R: 70..140, G: 130..190, B: 170..220 (at top of panel)
  if (yFrac < 0.35 && b > 160 && g > 120 && r < 145) return true;
  // Crowd silhouettes on sides: low saturation / greyish crowds outside Dhoni
  return false;
}

// Special check for LOSE panel dark background
function isLoseBg(r, g, b, yFrac, xFrac) {
  if (isGreyBluePanel(r, g, b)) return true;
  // Dark blue/black background outside Dhoni (seated in center)
  if ((xFrac < 0.25 || xFrac > 0.75 || yFrac < 0.2) && r < 40 && g < 55 && b < 80) return true;
  return false;
}

function processPose(name, x0, y0, w, h, bgCheckFn) {
  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = x0 + x;
      const srcY = y0 + y;
      if (srcX < 0 || srcX >= SHEET_W || srcY < 0 || srcY >= SHEET_H) continue;

      const srcIdx = (srcY * SHEET_W + srcX) * 4;
      const dstIdx = (y * w + x) * 4;

      out[dstIdx] = rawSheet[srcIdx];
      out[dstIdx + 1] = rawSheet[srcIdx + 1];
      out[dstIdx + 2] = rawSheet[srcIdx + 2];
      out[dstIdx + 3] = rawSheet[srcIdx + 3];
    }
  }

  // 1. Flood fill from borders to clear connected background
  const visited = new Uint8Array(w * h);
  const queue = [];

  const checkBg = (x, y) => {
    const idx = y * w + x;
    const pIdx = idx * 4;
    const r = out[pIdx];
    const g = out[pIdx + 1];
    const b = out[pIdx + 2];
    const yFrac = y / h;
    const xFrac = x / w;

    if (bgCheckFn) {
      return bgCheckFn(r, g, b, yFrac, xFrac);
    }
    return isGreyBluePanel(r, g, b);
  };

  const pushIfBg = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    if (checkBg(x, y)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w;
    const y = Math.floor(idx / w);

    out[idx * 4 + 3] = 0; // Transparent

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (!visited[nIdx]) {
          if (checkBg(nx, ny)) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  // 2. Also chroma-key any interior holes matching panel color
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = out[idx];
      const g = out[idx + 1];
      const b = out[idx + 2];
      if (isGreyBluePanel(r, g, b)) {
        out[idx + 3] = 0;
      }
    }
  }

  // 3. Remove thin black panel border artifacts if on the periphery
  // (Lines within 4px of image boundary with dark color)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < 3 || x >= w - 3 || y < 3 || y >= h - 3) {
        const idx = (y * w + x) * 4;
        const r = out[idx];
        const g = out[idx + 1];
        const b = out[idx + 2];
        if (r < 60 && g < 60 && b < 60) {
          out[idx + 3] = 0;
        }
      }
    }
  }

  // 4. Tight crop: find bounding box of visible pixels
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (out[idx + 3] > 25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    console.warn(`Warning: no visible pixels for ${name}`);
    return null;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = Buffer.alloc(cropW * cropH * 4);

  for (let cy = 0; cy < cropH; cy++) {
    for (let cx = 0; cx < cropW; cx++) {
      const srcIdx = ((minY + cy) * w + (minX + cx)) * 4;
      const dstIdx = (cy * cropW + cx) * 4;
      cropped[dstIdx] = out[srcIdx];
      cropped[dstIdx + 1] = out[srcIdx + 1];
      cropped[dstIdx + 2] = out[srcIdx + 2];
      cropped[dstIdx + 3] = out[srcIdx + 3];
    }
  }

  const tmpRgba = path.join('/tmp', `${name}.rgba`);
  const finalPng = path.join(outDir, `${name}.png`);

  fs.writeFileSync(tmpRgba, cropped);
  execSync(`convert -size ${cropW}x${cropH} -depth 8 rgba:${tmpRgba} ${finalPng}`);

  console.log(`[Extracted] ${name}: ${cropW}x${cropH} -> ${finalPng}`);
  return { name, width: cropW, height: cropH };
}

// Define the source coordinates for all 13 poses
const poses = [
  // Top row
  { name: 'idle', x: 858, y: 80, w: 118, h: 194 },
  { name: 'walk', x: 980, y: 80, w: 155, h: 194 },
  { name: 'jump', x: 1045, y: 80, w: 130, h: 194 },
  { name: 'hit', x: 1182, y: 80, w: 155, h: 194 },
  { name: 'block', x: 858, y: 80, w: 118, h: 194 },

  // Middle row
  { name: 'punch', x: 710, y: 310, w: 372, h: 200 },
  { name: 'kick', x: 1096, y: 310, w: 256, h: 200 },
  { name: 'grab_sprint', x: 25, y: 310, w: 190, h: 200 },
  { name: 'grab_stumps', x: 430, y: 310, w: 265, h: 200 },

  // Bottom row
  { name: 'super_charge', x: 25, y: 550, w: 220, h: 185 },
  { name: 'super_shot', x: 245, y: 530, w: 530, h: 205 },
  { name: 'win', x: 800, y: 550, w: 260, h: 185, bgFn: isWinBg },
  { name: 'lose', x: 1088, y: 550, w: 260, h: 185, bgFn: isLoseBg },
];

const results = [];
for (const p of poses) {
  const r = processPose(p.name, p.x, p.y, p.w, p.h, p.bgFn);
  if (r) results.push(r);
}

console.log('All 13 poses successfully extracted to:', outDir);
