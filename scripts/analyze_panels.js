import fs from 'fs';

const W = 1376;
const H = 768;
const buf = fs.readFileSync('/tmp/sheet.rgba');

function getPixel(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return [0, 0, 0, 0];
  const idx = (y * W + x) * 4;
  return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
}

// Let's scan along horizontal and vertical lines to detect panel borders
// Panel borders are typically dark lines (R<80, G<80, B<80) between y=50 and y=750
console.log('--- Scanning top row panel headers ---');
for (let y = 60; y < 85; y += 5) {
  let darkCount = 0;
  for (let x = 800; x < 1350; x++) {
    const [r, g, b] = getPixel(x, y);
    if (r < 80 && g < 80 && b < 80) darkCount++;
  }
  console.log(`y=${y}: dark pixels=${darkCount}`);
}

// Let's find vertical panel divider lines around x=830-860, 970-1010, 1150-1180
for (let x = 830; x <= 860; x++) {
  const [r, g, b] = getPixel(x, 150);
  if (r < 60 && g < 60 && b < 60) {
    console.log(`Border found at x=${x}, y=150: RGB(${r},${g},${b})`);
  }
}
for (let x = 970; x <= 1010; x++) {
  const [r, g, b] = getPixel(x, 150);
  if (r < 60 && g < 60 && b < 60) {
    console.log(`Border found at x=${x}, y=150: RGB(${r},${g},${b})`);
  }
}
for (let x = 1140; x <= 1180; x++) {
  const [r, g, b] = getPixel(x, 150);
  if (r < 60 && g < 60 && b < 60) {
    console.log(`Border found at x=${x}, y=150: RGB(${r},${g},${b})`);
  }
}
