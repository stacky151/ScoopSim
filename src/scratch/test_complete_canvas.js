const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function generate() {
  const bgPath = path.join(__dirname, '../../assets/stand_bg.png');
  const img = await loadImage(bgPath);
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 1024, 1024);
  const data = {
    name: "Stark Scoops",
    country: "USA",
    cleanliness: 75,
    unclaimedMoney: 150,
    level: 4,
    batches: [
      { flavor: 'vanilla', scoops: 35 },
      { flavor: 'strawberry', scoops: 0 },
      { flavor: 'mint_chip', scoops: 42 }
    ]
  };

  const frontTubs = [
    { name: 'strawberry', x: 208, y: 675, width: 90, height: 45 },
    { name: 'vanilla', x: 352, y: 675, width: 90, height: 45 },
    { name: 'mint_chip', x: 498, y: 675, width: 90, height: 45 },
    { name: 'bubblegum', x: 652, y: 675, width: 90, height: 45 }
  ];

  for (const tub of frontTubs) {
    const activeBatch = data.batches.find(b => b.flavor === tub.name);
    const isEmpty = tub.name === 'bubblegum' || !activeBatch || activeBatch.scoops <= 0;
    if (isEmpty) {
      ctx.fillStyle = '#3a3131';
      ctx.beginPath();
      ctx.ellipse(tub.x, tub.y, tub.width / 2, tub.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e1919';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  const flavorColors = {
    vanilla: { main: '#fff8dc', highlight: '#fffff0' },
    strawberry: { main: '#ffb6c1', highlight: '#ffe4e1' },
    mint_chip: { main: '#98ff98', highlight: '#e0ffe0' },
    chocolate: { main: '#5c3a21', highlight: '#7b4f30' },
    pistachio: { main: '#d0f0c0', highlight: '#e6f9e0' }
  };

  for (const tub of frontTubs) {
    if (tub.name === 'bubblegum') continue;
    const activeBatch = data.batches.find(b => b.flavor === tub.name);
    if (activeBatch && activeBatch.scoops > 0) {
      const colors = flavorColors[tub.name] || { main: '#ffffff', highlight: '#ffffff' };
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.arc(tub.x - 12, tub.y + 5, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tub.x + 12, tub.y + 5, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tub.x, tub.y - 10, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.highlight;
      ctx.beginPath();
      ctx.arc(tub.x - 8, tub.y - 18, 8, 0, Math.PI * 2);
      ctx.fill();
      if (tub.name === 'mint_chip') {
        ctx.fillStyle = '#2b1608';
        ctx.fillRect(tub.x - 8, tub.y - 15, 3, 3);
        ctx.fillRect(tub.x + 6, tub.y - 8, 3, 3);
        ctx.fillRect(tub.x - 12, tub.y, 3, 3);
        ctx.fillRect(tub.x + 10, tub.y + 2, 3, 3);
      }
    }
  }

  const backTubs = [
    { name: 'chocolate', x: 240, y: 605, width: 70, height: 35 },
    { name: 'pistachio', x: 370, y: 605, width: 70, height: 35 }
  ];

  for (const tub of backTubs) {
    const activeBatch = data.batches.find(b => b.flavor === tub.name);
    if (activeBatch && activeBatch.scoops > 0) {
      const colors = flavorColors[tub.name] || { main: '#ffffff', highlight: '#ffffff' };
      ctx.fillStyle = colors.main;
      ctx.beginPath();
      ctx.arc(tub.x, tub.y - 5, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.highlight;
      ctx.beginPath();
      ctx.arc(tub.x - 6, tub.y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2b2323';
      ctx.beginPath();
      ctx.ellipse(tub.x, tub.y, tub.width / 2, tub.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#161212';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  roundRect(ctx, 30, 30, 260, 95, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  roundRect(ctx, 30, 30, 260, 95, 12);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`💵 CASH: $${data.unclaimedMoney}`, 48, 56);
  ctx.fillText(`⭐ LEVEL: ${data.level}`, 48, 78);
  ctx.fillText(`🌍 COUNTRY: ${data.country}`, 48, 100);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  roundRect(ctx, 734, 30, 260, 95, 12);
  ctx.fill();
  roundRect(ctx, 734, 30, 260, 95, 12);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Arial';
  ctx.fillText(`🧹 CLEANLINESS: ${data.cleanliness}%`, 752, 58);

  ctx.fillStyle = '#334155';
  ctx.fillRect(752, 75, 224, 15);
  if (data.cleanliness > 60) ctx.fillStyle = '#22c55e';
  else if (data.cleanliness > 20) ctx.fillStyle = '#eab308';
  else ctx.fillStyle = '#ef4444';
  ctx.fillRect(752, 75, 224 * (data.cleanliness / 100), 15);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  ctx.fillText(data.name.toUpperCase(), 512, 75);
  ctx.shadowBlur = 0;

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../../assets/test_canvas.png'), buffer);
  console.log("Saved test_canvas.png");
}

generate();
