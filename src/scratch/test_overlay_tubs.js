const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function test() {
  const bgPath = path.join(__dirname, '../../assets/stand_bg.png');
  const img = await loadImage(bgPath);
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 1024, 1024);
  const frontCoords = [
    { x: 208, y: 665, color: '#ffb6c1' },
    { x: 352, y: 665, color: '#fff8dc' },
    { x: 498, y: 665, color: '#98ff98' },
    { x: 652, y: 665, color: '#b0e0e6' }
  ];
  const backCoords = [
    { x: 240, y: 605, color: '#5c3a21' },
    { x: 370, y: 605, color: '#fff8dc' },
    { x: 505, y: 605, color: '#98ff98' },
    { x: 640, y: 605, color: '#b0e0e6' }
  ];
  for (const c of frontCoords) {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const c of backCoords) {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../../assets/test_overlay_tubs.png'), buffer);
  console.log("Saved test_overlay_tubs.png");
}

test();
