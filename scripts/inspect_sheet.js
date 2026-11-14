import fs from 'fs';
import { execSync } from 'child_process';

const W = 1376;
const H = 768;
const buf = fs.readFileSync('/tmp/sheet.rgba');

function getPixel(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return [0, 0, 0, 0];
  const idx = (y * W + x) * 4;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// Check sample colors at various points
const testPoints = [
  { name: 'Idle background', x: 890, y: 120 },
  { name: 'Idle jersey', x: 920, y: 160 },
  { name: 'Idle panel top border', x: 920, y: 64 },
  { name: 'Idle panel bottom border', x: 920, y: 280 },
  { name: 'Walk background', x: 1040, y: 120 },
  { name: 'Punch background', x: 800, y: 360 },
  { name: 'Kick background', x: 1180, y: 360 },
  { name: 'Super background', x: 400, y: 600 },
];

for (const p of testPoints) {
  const [r, g, b, a] = getPixel(p.x, p.y);
  console.log(`${p.name} at (${p.x}, ${p.y}): RGB(${r}, ${g}, ${b})`);
}
