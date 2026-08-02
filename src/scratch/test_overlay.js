const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function test() {
  const bgPath = path.join(__dirname, '../../assets/stand_bg.png');
  const img = await loadImage(bgPath);
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 1024, 1024);
  const coords = [
    { x: 195, y: 672, color: 'pink' },
    { x: 345, y: 672, color: 'yellow' },
    { x: 495, y: 672, color: 'lime' },
    { x: 650, y: 672, color: 'cyan' }
  ];
  for (const c of coords) {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeRect(c.x - 20, c.y - 20, 40, 40);
  }
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../../assets/test_overlay.png'), buffer);
  console.log("Saved test_overlay.png");
}

test();
