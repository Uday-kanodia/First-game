import { execSync } from 'child_process';
import fs from 'fs';

fs.mkdirSync('/tmp/crops', { recursive: true });

const crops = {
  idle: '160x220+850+65',
  walk: '160x220+1020+65',
  hit: '160x220+1200+65',
  punch: '360x200+740+325',
  kick: '260x200+1100+325',
  grab_sprint: '200x200+30+325',
  grab_stumps: '280x200+430+325',
  super_charge: '220x200+30+550',
  super_shot: '530x225+240+530',
  win: '260x200+820+550',
  lose: '260x200+1090+550',
};

for (const [name, geom] of Object.entries(crops)) {
  execSync(`convert public/assets/aistudio/image_20261103223052_d57c2d9d.webp -crop ${geom} +repage /tmp/crops/${name}.png`);
}
console.log('Crops generated');
