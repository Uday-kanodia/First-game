import fs from 'fs';
import { execSync } from 'child_process';

// Test chroma-keying on idle crop
// Panel color ~RGB 221, 229, 235
execSync(`convert /tmp/crops/idle.png -fuzz 18% -transparent "rgb(221,229,235)" /tmp/crops/idle_transparent.png`);
console.log('Chroma-key completed');
