import { createCanvas } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';

const FLAVORS = ['vanilla', 'chocolate', 'strawberry', 'pistachio', 'lemon', 'matcha'];
const CONTAINERS = ['smallCone', 'largeCone', 'smallBox', 'largeBox'];

const FLAVOR_COLORS: Record<string, { fill: string; highlight: string; name: string }> = {
  vanilla: { fill: '#FDFBF7', highlight: '#FFFFFF', name: 'Vanilla' },
  chocolate: { fill: '#3D2314', highlight: '#5C3820', name: 'Chocolate' },
  strawberry: { fill: '#FF6B8B', highlight: '#FFA8BA', name: 'Strawberry' },
  pistachio: { fill: '#93C572', highlight: '#BBE0A3', name: 'Pistachio' },
  lemon: { fill: '#FFE135', highlight: '#FFF085', name: 'Lemon' },
  matcha: { fill: '#778D45', highlight: '#99B064', name: 'Matcha' },
};

function getContainerName(c: string): string {
  if (c === 'smallCone') return 'Small Cone';
  if (c === 'largeCone') return 'Large Cone';
  if (c === 'smallBox') return 'Small Box';
  return 'Large Box';
}

const CUSTOMER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const CUSTOMER_HEAD_COLORS = ['#FDE047', '#FED7AA', '#FDBA74', '#FEF08A'];

const outDir = path.join(__dirname, '../assets/customer_orders');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating 100 unique pixel art customer order images...');

for (let id = 1; id <= 100; id++) {
  const flavorKey = FLAVORS[(id - 1) % FLAVORS.length]!;
  const containerKey = CONTAINERS[Math.floor((id - 1) / FLAVORS.length) % CONTAINERS.length]!;
  const scoopsCount = containerKey.startsWith('large') ? 2 : 1;

  const flavorInfo = (FLAVOR_COLORS[flavorKey] || FLAVOR_COLORS.vanilla)!;
  const containerName = getContainerName(containerKey);
  const orderText = `${scoopsCount} ${flavorInfo.name} ${scoopsCount > 1 ? 'Scoops' : 'Scoop'} in a ${containerName}`;

  const canvas = createCanvas(1200, 675);
  const ctx = canvas.getContext('2d');

  // 1. Background gradient (Widescreen Stand Room)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 460);
  bgGrad.addColorStop(0, '#1E293B');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 675);

  // 2. Floor texture
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 460, 1200, 215);

  // Floor grid
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  for (let x = 0; x < 1200; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 460);
    ctx.lineTo(x, 675);
    ctx.stroke();
  }

  // 3. Counter Body
  ctx.fillStyle = '#64748B';
  ctx.fillRect(150, 420, 900, 180);
  ctx.fillStyle = '#475569';
  ctx.fillRect(150, 420, 900, 15);

  // Glass Case
  ctx.fillStyle = 'rgba(203, 213, 225, 0.25)';
  ctx.fillRect(200, 280, 800, 140);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.strokeRect(200, 280, 800, 140);

  // Tubs in Glass Case
  for (let t = 0; t < 4; t++) {
    const tx = 250 + t * 180;
    const isOrderedFlavor = (t % FLAVORS.length) === ((id - 1) % FLAVORS.length);
    const fColor = (isOrderedFlavor ? flavorInfo : FLAVOR_COLORS[FLAVORS[t % FLAVORS.length]!])!;

    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(tx - 40, 310, 80, 90);

    // Ice cream scoop in tub
    ctx.fillStyle = fColor.fill;
    ctx.beginPath();
    ctx.arc(tx, 330, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fColor.highlight;
    ctx.beginPath();
    ctx.arc(tx - 10, 320, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Shop Title Sign
  ctx.fillStyle = '#0284C7';
  ctx.fillRect(400, 20, 400, 60);
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 4;
  ctx.strokeRect(400, 20, 400, 60);

  ctx.fillStyle = '#F0F9FF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCOOPSHACK GOURMET GELATO', 600, 56);

  // 5. Customer Character NPC (Front of Counter)
  const custX = 600;
  const custY = 480;
  const bodyColor = CUSTOMER_COLORS[id % CUSTOMER_COLORS.length]!;
  const headColor = CUSTOMER_HEAD_COLORS[id % CUSTOMER_HEAD_COLORS.length]!;

  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(custX - 45, custY - 70, 90, 100);

  // Head
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.arc(custX, custY - 100, 40, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(custX - 15, custY - 110, 8, 8);
  ctx.fillRect(custX + 7, custY - 110, 8, 8);

  // Smile
  ctx.beginPath();
  ctx.arc(custX, custY - 95, 12, 0, Math.PI);
  ctx.stroke();

  // 6. Integrated Pixel Art Speech Bubble Artwork (Top Left over Customer)
  const bubbleX = 600;
  const bubbleY = 160;
  const bubbleWidth = 480;
  const bubbleHeight = 90;

  // Outer stroke
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(bubbleX - bubbleWidth / 2 - 4, bubbleY - bubbleHeight / 2 - 4, bubbleWidth + 8, bubbleHeight + 8);

  // Bubble fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight);

  // Bubble Tail
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(custX - 15, bubbleY + bubbleHeight / 2);
  ctx.lineTo(custX, custY - 140);
  ctx.lineTo(custX + 15, bubbleY + bubbleHeight / 2);
  ctx.fill();

  // Speech Bubble Text (Exact Official Order!)
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`"I'd like ${orderText}!"`, bubbleX, bubbleY - 10);

  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`ORDER #${id} • 100% OFFICIAL SCOOPSHACK DATA`, bubbleX, bubbleY + 22);

  // Write PNG buffer to order_X.jpg
  const buffer = canvas.toBuffer('image/jpeg');
  const filePath = path.join(outDir, `order_${id}.jpg`);
  fs.writeFileSync(filePath, buffer);
}

console.log('Successfully generated all 100 custom order image files!');
