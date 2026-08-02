const { loadImage } = require('@napi-rs/canvas');
const path = require('path');

async function check() {
  const bgPath = path.join(__dirname, '../../assets/stand_bg.png');
  const img = await loadImage(bgPath);
  console.log(`Image size: ${img.width}x${img.height}`);
}
check();
