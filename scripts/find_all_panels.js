import fs from 'fs';

const W = 1376;
const H = 768;
const buf = fs.readFileSync('/tmp/sheet.rgba');

function getPixel(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return [0, 0, 0, 0];
  const idx = (y * W + x) * 4;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// Find horizontal lines around y=300-340 (middle row top border)
console.log('--- Middle row top border ---');
for (let y = 300; y <= 340; y++) {
  const [r, g, b] = getPixel(700, y);
  if (r < 40 && g < 40 && b < 40) {
    console.log(`Middle top border at y=${y}: RGB(${r},${g},${b})`);
  }
}

// Find horizontal lines around y=500-540 (middle row bottom border)
console.log('--- Middle row bottom border ---');
for (let y = 500; y <= 540; y++) {
  const [r, g, b] = getPixel(700, y);
  if (r < 40 && g < 40 && b < 40) {
    console.log(`Middle bottom border at y=${y}: RGB(${r},${g},${b})`);
  }
}

// Find horizontal lines around y=720-760 (bottom row bottom border)
console.log('--- Bottom row bottom border ---');
for (let y = 730; y <= 765; y++) {
  const [r, g, b] = getPixel(700, y);
  if (r < 40 && g < 40 && b < 40) {
    console.log(`Bottom bottom border at y=${y}: RGB(${r},${g},${b})`);
  }
}

// Find vertical borders in middle row (around y=400)
console.log('--- Middle row vertical dividers ---');
for (let x = 20; x < 1360; x++) {
  const [r, g, b] = getPixel(x, 400);
  if (r < 25 && g < 25 && b < 25) {
    // Check if vertical line extends up and down
    let isLine = true;
    for (let dy = -10; dy <= 10; dy += 5) {
      const [r2] = getPixel(x, 400 + dy);
      if (r2 > 50) { isLine = false; break; }
    }
    if (isLine) {
      console.log(`Divider at x=${x}`);
    }
  }
}
