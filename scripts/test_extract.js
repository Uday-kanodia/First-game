import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const SHEET_W = 1376;
const SHEET_H = 768;
const rawSheet = fs.readFileSync('/tmp/sheet.rgba');

function isPanelBg(r, g, b) {
  // Pale grey-blue panel color ~RGB(221, 229, 235)
  const dr = r - 221;
  const dg = g - 229;
  const db = b - 235;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  if (dist < 38) return true;

  // Also check pale whitish / grey-blue tones in that neighborhood
  if (r >= 210 && g >= 218 && b >= 222) return true;

  return false;
}

function isOuterBorderOrPadding(r, g, b) {
  // White panel gutters / borders
  if (r >= 245 && g >= 245 && b >= 245) return true;
  return false;
}

// Extract a region [x0, y0, w, h] from raw sheet into an RGBA Buffer
function extractCrop(x0, y0, w, h, options = {}) {
  const { removePanelText = true } = options;
  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = x0 + x;
      const srcY = y0 + y;
      if (srcX < 0 || srcX >= SHEET_W || srcY < 0 || srcY >= SHEET_H) continue;

      const srcIdx = (srcY * SHEET_W + srcX) * 4;
      const dstIdx = (y * w + x) * 4;

      const r = rawSheet[srcIdx];
      const g = rawSheet[srcIdx + 1];
      const b = rawSheet[srcIdx + 2];
      const a = rawSheet[srcIdx + 3];

      out[dstIdx] = r;
      out[dstIdx + 1] = g;
      out[dstIdx + 2] = b;
      out[dstIdx + 3] = a;
    }
  }

  // Flood fill from outer corners to mark connected background
  const visited = new Uint8Array(w * h);
  const queue = [];

  const pushIfBg = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const pIdx = idx * 4;
    const r = out[pIdx];
    const g = out[pIdx + 1];
    const b = out[pIdx + 2];

    if (isPanelBg(r, g, b) || isOuterBorderOrPadding(r, g, b)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  // Push all outer border pixels
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

    // Make transparent
    out[idx * 4 + 3] = 0;

    // 4-neighborhood
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
          const npIdx = nIdx * 4;
          const nr = out[npIdx];
          const ng = out[npIdx + 1];
          const nb = out[npIdx + 2];
          if (isPanelBg(nr, ng, nb) || isOuterBorderOrPadding(nr, ng, nb)) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  // Also chroma-key any interior holes (e.g. between legs, between arm and bat)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const pIdx = idx * 4;
      const r = out[pIdx];
      const g = out[pIdx + 1];
      const b = out[pIdx + 2];

      if (isPanelBg(r, g, b)) {
        out[pIdx + 3] = 0;
      }
    }
  }

  // Find tight bounding box of visible pixels (alpha > 30)
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (out[idx + 3] > 30) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no pixels found
  if (minX > maxX || minY > maxY) {
    return { buffer: out, width: w, height: h, minX: 0, minY: 0 };
  }

  // Crop to bounding box
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

  return { buffer: cropped, width: cropW, height: cropH, minX, minY, originalW: w, originalH: h };
}

fs.mkdirSync('/tmp/test_sprites', { recursive: true });

// Test idle
const idleCrop = extractCrop(858, 80, 118, 193);
fs.writeFileSync('/tmp/test_sprites/idle.rgba', idleCrop.buffer);
execSync(`convert -size ${idleCrop.width}x${idleCrop.height} -depth 8 rgba:/tmp/test_sprites/idle.rgba /tmp/test_sprites/idle.png`);
console.log(`Idle extracted: ${idleCrop.width}x${idleCrop.height}`);
