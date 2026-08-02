import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as path from 'path';

export interface StandDrawData {
  name: string;
  country: string;
  cleanliness: number;
  unclaimedMoney: number;
  level: number;
  batches: Array<{
    flavor: string;
    scoops: number;
    maxScoops: number;
  }>;
  equippedTheme?: string;
}

export async function drawStandPOV(data: StandDrawData): Promise<Buffer> {
  const canvas = createCanvas(1200, 675);
  const ctx = canvas.getContext('2d');

  const theme = data.equippedTheme || 'default';

  const themeBgPath = path.join(__dirname, `../../assets/stands/${theme}_bg.jpg`);
  const defaultBgPath = path.join(__dirname, '../../assets/stand_bg.png');

  let bgImage = await loadImage(themeBgPath).catch(() => null);
  if (!bgImage) {
    bgImage = await loadImage(defaultBgPath).catch(() => null);
  }

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, 1200, 675);
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 460);
    skyGrad.addColorStop(0, '#a1c4fd');
    skyGrad.addColorStop(1, '#c2e9fb');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1200, 675);
  }

  if (theme === 'cyberpunk') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 460, 1200, 215);
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2;
    for (let x = 0; x < 1200; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 460);
      ctx.lineTo(x, 675);
      ctx.stroke();
    }
    for (let y = 460; y < 675; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(180, 280, 840, 260);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#06b6d4';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(180, 280, 840, 260);
    ctx.shadowColor = '#d946ef';
    ctx.strokeStyle = '#d946ef';
    ctx.beginPath();
    ctx.moveTo(240, 350);
    ctx.lineTo(960, 350);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(240, 490);
    ctx.lineTo(960, 490);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(140, 260, 920, 24);
    ctx.shadowColor = '#06b6d4';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(140, 260, 920, 24);
    ctx.shadowBlur = 0;

  } else if (theme === 'retro') {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 460, 1200, 215);
    ctx.fillStyle = '#27272a';
    const checkerSize = 48;
    for (let y = 460; y < 675; y += checkerSize) {
      for (let x = 0; x < 1200; x += checkerSize) {
        if ((Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0) {
          ctx.fillRect(x, y, checkerSize, checkerSize);
        }
      }
    }

    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(180, 280, 840, 260);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(180, 280, 840, 260);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(220, 280);
    ctx.lineTo(340, 280);
    ctx.lineTo(540, 540);
    ctx.lineTo(420, 540);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(360, 280);
    ctx.lineTo(480, 280);
    ctx.lineTo(680, 540);
    ctx.lineTo(560, 540);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#27272a';
    ctx.fillRect(140, 260, 920, 24);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(140, 260, 920, 24);

  } else if (theme === 'luxury') {
    const floorGrad = ctx.createLinearGradient(0, 460, 0, 675);
    floorGrad.addColorStop(0, '#171717');
    floorGrad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 460, 1200, 215);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 460);
    ctx.bezierCurveTo(200, 550, 400, 500, 600, 675);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(900, 460);
    ctx.bezierCurveTo(800, 560, 1000, 620, 600, 675);
    ctx.stroke();

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(180, 280, 840, 260);

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(240, 280);
    ctx.bezierCurveTo(290, 380, 220, 480, 340, 540);
    ctx.stroke();

    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.5)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.strokeRect(180, 280, 840, 260);

    ctx.strokeStyle = '#aa7c11';
    ctx.lineWidth = 2;
    ctx.strokeRect(185, 285, 830, 250);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(140, 260, 920, 24);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(140, 260, 920, 24);

  } else {
    if (!bgImage) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 460, 1200, 215);

      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(180, 280, 840, 260);

      ctx.fillStyle = '#f7fafc';
      ctx.fillRect(140, 260, 920, 24);
    }
  }

  const frontPositions = [
    { x: 300, y: 440 },
    { x: 480, y: 440 },
    { x: 660, y: 440 },
    { x: 840, y: 440 }
  ];

  const backPositions = [
    { x: 340, y: 370 },
    { x: 500, y: 370 },
    { x: 660, y: 370 },
    { x: 820, y: 370 }
  ];

  const flavorColors: Record<string, { main: string; highlight: string }> = {
    vanilla: { main: '#fff8dc', highlight: '#fffff0' },
    chocolate: { main: '#5c3a21', highlight: '#7b4f30' },
    strawberry: { main: '#ffb6c1', highlight: '#ffe4e1' },
    mint_chip: { main: '#98ff98', highlight: '#e0ffe0' },
    pistachio: { main: '#d0f0c0', highlight: '#e6f9e0' },
    bubblegum: { main: '#ffc0cb', highlight: '#ffb6c1' },
    lemon: { main: '#fff700', highlight: '#ffff80' },
    mango: { main: '#ffaa00', highlight: '#ffc83b' },
    coconut: { main: '#ffffff', highlight: '#f3f4f6' },
    caramel: { main: '#c68a4c', highlight: '#e0b07d' },
    blueberry: { main: '#4f46e5', highlight: '#818cf8' },
    matcha: { main: '#4d7c0f', highlight: '#65a30d' },
    cherry: { main: '#f43f5e', highlight: '#fb7185' }
  };

  const renderBatches = [...data.batches]
    .sort((a, b) => (b.scoops > 0 ? 1 : 0) - (a.scoops > 0 ? 1 : 0))
    .slice(0, 8);

  for (let i = 0; i < renderBatches.length; i++) {
    const batch = renderBatches[i]!;
    if (batch.scoops <= 0) continue;

    const colors = flavorColors[batch.flavor] || { main: '#ffffff', highlight: '#ffffff' };
    ctx.fillStyle = colors.main;

    if (i < 4) {
      const pos = frontPositions[i]!;
      ctx.beginPath();
      ctx.arc(pos.x - 12, pos.y + 5, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x + 12, pos.y + 5, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 10, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.highlight;
      ctx.beginPath();
      ctx.arc(pos.x - 8, pos.y - 18, 8, 0, Math.PI * 2);
      ctx.fill();

      if (batch.flavor === 'mint_chip') {
        ctx.fillStyle = '#2b1608';
        ctx.fillRect(pos.x - 8, pos.y - 15, 3, 3);
        ctx.fillRect(pos.x + 6, pos.y - 8, 3, 3);
        ctx.fillRect(pos.x - 12, pos.y, 3, 3);
        ctx.fillRect(pos.x + 10, pos.y + 2, 3, 3);
      }
    } else {
      const pos = backPositions[i - 4]!;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 5, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.highlight;
      ctx.beginPath();
      ctx.arc(pos.x - 6, pos.y - 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (data.cleanliness < 70) {
    ctx.fillStyle = 'rgba(74, 52, 38, 0.6)';
    ctx.beginPath();
    ctx.arc(200, 580, 22, 0, Math.PI * 2);
    ctx.arc(650, 600, 30, 0, Math.PI * 2);
    ctx.arc(1000, 560, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.beginPath();
    ctx.arc(450, 620, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(400, 20, 400, 65);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(400, 20, 400, 65);

  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.name.toUpperCase(), 600, 60);
  ctx.shadowBlur = 0;

  if (data.level >= 10) {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(80, 430, 24, 30);
    ctx.beginPath();
    ctx.arc(92, 420, 20, 0, Math.PI, true);
    ctx.fill();
    ctx.fillStyle = '#b7791f';
    ctx.fillRect(72, 460, 40, 10);
  }

  return canvas.toBuffer('image/png');
}

export interface MapCountryStatus {
  country: string;
  owned: boolean;
  isActive: boolean;
  hasManager: boolean;
}

export async function drawWorldMap(standsData: MapCountryStatus[]): Promise<Buffer> {
  const canvas = createCanvas(1024, 512);
  const ctx = canvas.getContext('2d');

  const bgPath = path.join(__dirname, '../../assets/world_map_bg.png');
  const bgImage = await loadImage(bgPath).catch(() => null);

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, 1024, 512);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSpacing = 32;
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#1b4332';

    ctx.fillRect(96, 96, 192, 128);
    ctx.fillRect(64, 128, 96, 64);
    ctx.fillRect(160, 224, 96, 48);
    ctx.fillRect(224, 64, 96, 64);
    ctx.fillRect(256, 256, 96, 128);
    ctx.fillRect(288, 384, 64, 96);
    ctx.fillRect(224, 288, 48, 64);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(352, 32, 128, 64);
    ctx.fillRect(480, 64, 32, 16);
    ctx.fillStyle = '#1b4332';

    ctx.fillRect(480, 96, 480, 160);
    ctx.fillRect(448, 128, 96, 96);
    ctx.fillRect(576, 64, 256, 48);
    ctx.fillRect(896, 128, 96, 128);
    ctx.fillRect(800, 256, 128, 64);
    ctx.fillRect(704, 256, 96, 48);

    ctx.fillRect(480, 224, 160, 128);
    ctx.fillRect(512, 352, 96, 96);
    ctx.fillRect(608, 320, 48, 48);

    ctx.fillRect(800, 352, 128, 96);
    ctx.fillRect(928, 384, 32, 64);
  }

  return canvas.toBuffer('image/png');
}
