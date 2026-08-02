import { createCanvas } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';

interface OrderDef {
  name: string;
  orderText: string;
  flavor: 'strawberry' | 'pistachio' | 'lemon' | 'matcha';
  container: 'smallCone' | 'largeCone' | 'smallBox' | 'largeBox';
  scoops: number;
  topping: 'fudge' | 'peanuts' | 'caramel' | 'cherry' | 'sprinkles';
  customerIndex: number;
}

const ORDERS: OrderDef[] = [
  {
    name: 'order_strawberry_smallBox_fudge',
    orderText: '1 Strawberry Scoop in a Small Box with Fudge!',
    flavor: 'strawberry',
    container: 'smallBox',
    scoops: 1,
    topping: 'fudge',
    customerIndex: 1,
  },
  {
    name: 'order_strawberry_largeBox_peanuts',
    orderText: '2 Strawberry Scoops in a Large Box with Peanuts!',
    flavor: 'strawberry',
    container: 'largeBox',
    scoops: 2,
    topping: 'peanuts',
    customerIndex: 2,
  },
  {
    name: 'order_pistachio_smallCone_caramel',
    orderText: '1 Pistachio Scoop in a Small Cone with Caramel!',
    flavor: 'pistachio',
    container: 'smallCone',
    scoops: 1,
    topping: 'caramel',
    customerIndex: 3,
  },
  {
    name: 'order_pistachio_largeCone_peanuts',
    orderText: '2 Pistachio Scoops in a Large Cone with Peanuts!',
    flavor: 'pistachio',
    container: 'largeCone',
    scoops: 2,
    topping: 'peanuts',
    customerIndex: 4,
  },
  {
    name: 'order_pistachio_smallBox_cherry',
    orderText: '1 Pistachio Scoop in a Small Box with a Cherry!',
    flavor: 'pistachio',
    container: 'smallBox',
    scoops: 1,
    topping: 'cherry',
    customerIndex: 5,
  },
  {
    name: 'order_pistachio_largeBox_sprinkles',
    orderText: '2 Pistachio Scoops in a Large Box with Sprinkles!',
    flavor: 'pistachio',
    container: 'largeBox',
    scoops: 2,
    topping: 'sprinkles',
    customerIndex: 6,
  },
  {
    name: 'order_lemon_smallCone_sprinkles',
    orderText: '1 Lemon Scoop in a Small Cone with Sprinkles!',
    flavor: 'lemon',
    container: 'smallCone',
    scoops: 1,
    topping: 'sprinkles',
    customerIndex: 7,
  },
  {
    name: 'order_lemon_largeCone_cherry',
    orderText: '2 Lemon Scoops in a Large Cone with a Cherry!',
    flavor: 'lemon',
    container: 'largeCone',
    scoops: 2,
    topping: 'cherry',
    customerIndex: 8,
  },
  {
    name: 'order_matcha_smallCone_fudge',
    orderText: '1 Matcha Scoop in a Small Cone with Fudge!',
    flavor: 'matcha',
    container: 'smallCone',
    scoops: 1,
    topping: 'fudge',
    customerIndex: 9,
  },
  {
    name: 'order_matcha_largeBox_caramel',
    orderText: '2 Matcha Scoops in a Large Box with Caramel!',
    flavor: 'matcha',
    container: 'largeBox',
    scoops: 2,
    topping: 'caramel',
    customerIndex: 10,
  },
];

const FLAVOR_COLORS: Record<string, { fill: string; highlight: string; shadow: string }> = {
  strawberry: { fill: '#FF6B8B', highlight: '#FFA8BA', shadow: '#E04867' },
  pistachio: { fill: '#93C572', highlight: '#BBE0A3', shadow: '#6E9C4E' },
  lemon: { fill: '#FFE135', highlight: '#FFF085', shadow: '#D4B81A' },
  matcha: { fill: '#778D45', highlight: '#99B064', shadow: '#566830' },
};

const CUSTOMER_PALETTES = [
  { body: '#EF4444', head: '#FDE047', shirtPattern: '#B91C1C' },
  { body: '#3B82F6', head: '#FED7AA', shirtPattern: '#1D4ED8' },
  { body: '#10B981', head: '#FDBA74', shirtPattern: '#047857' },
  { body: '#F59E0B', head: '#FEF08A', shirtPattern: '#B45309' },
  { body: '#8B5CF6', head: '#FDE047', shirtPattern: '#6D28D9' },
  { body: '#EC4899', head: '#FED7AA', shirtPattern: '#BE185D' },
  { body: '#06B6D4', head: '#FDBA74', shirtPattern: '#0E7490' },
  { body: '#84CC16', head: '#FEF08A', shirtPattern: '#4D7C0F' },
  { body: '#6366F1', head: '#FDE047', shirtPattern: '#4338CA' },
  { body: '#F97316', head: '#FED7AA', shirtPattern: '#C2410C' },
];

const outDir = path.join(__dirname, '../assets/customer_orders');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

for (const item of ORDERS) {
  const canvas = createCanvas(1376, 768);
  const ctx = canvas.getContext('2d');

  // 1. Background Scene (Retro Gelato Parlor Arcade)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 520);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(0.5, '#1E293B');
  bgGrad.addColorStop(1, '#334155');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1376, 768);

  // Checkered Tile Floor
  const tileSize = 64;
  for (let y = 520; y < 768; y += tileSize / 2) {
    for (let x = 0; x < 1376; x += tileSize) {
      const isAlt = (Math.floor(x / tileSize) + Math.floor(y / (tileSize / 2))) % 2 === 0;
      ctx.fillStyle = isAlt ? '#475569' : '#1E293B';
      ctx.fillRect(x, y, tileSize, tileSize / 2);
    }
  }

  // 2. Decorative Wall Arcade Lights / Banners
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(100, 40, 1176, 8);
  ctx.fillStyle = '#EF4444';
  for (let lx = 120; lx < 1260; lx += 80) {
    ctx.beginPath();
    ctx.arc(lx, 44, 6, 0, Math.PI * 2);
    ctx.fillStyle = (lx / 80) % 2 === 0 ? '#F59E0B' : '#EC4899';
    ctx.fill();
  }

  // 3. Shop Counter Bar
  ctx.fillStyle = '#475569';
  ctx.fillRect(100, 480, 1176, 200);
  // Counter Top Lip
  ctx.fillStyle = '#64748B';
  ctx.fillRect(80, 470, 1216, 20);
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(80, 470, 1216, 4);

  // Glass Freezer Case on Counter
  ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.fillRect(150, 340, 450, 130);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.strokeRect(150, 340, 450, 130);

  // Freezer Tubs inside glass
  const flavorsList = ['vanilla', 'chocolate', 'strawberry', 'pistachio', 'lemon', 'matcha'];
  for (let i = 0; i < 4; i++) {
    const tubX = 180 + i * 105;
    const fKey = flavorsList[i % flavorsList.length]!;
    const fColors = FLAVOR_COLORS[fKey] || { fill: '#FDFBF7', highlight: '#FFF', shadow: '#DDD' };

    ctx.fillStyle = '#334155';
    ctx.fillRect(tubX, 370, 80, 90);
    ctx.fillStyle = fColors.fill;
    ctx.beginPath();
    ctx.arc(tubX + 40, 395, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Customer Character (Center Right)
  const custX = 850;
  const custY = 530;
  const palette = CUSTOMER_PALETTES[(item.customerIndex - 1) % CUSTOMER_PALETTES.length]!;

  // Body / Shirt
  ctx.fillStyle = palette.body;
  ctx.fillRect(custX - 60, custY - 90, 120, 120);

  // Head
  ctx.fillStyle = palette.head;
  ctx.beginPath();
  ctx.arc(custX, custY - 130, 48, 0, Math.PI * 2);
  ctx.fill();

  // Pixel Hair
  ctx.fillStyle = '#334155';
  ctx.fillRect(custX - 52, custY - 180, 104, 30);

  // Eyes & Smile
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(custX - 20, custY - 140, 10, 12);
  ctx.fillRect(custX + 10, custY - 140, 10, 12);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(custX, custY - 120, 16, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // 5. Order Item Illustration (On Counter next to Customer)
  const itemX = 680;
  const itemY = 440;

  const fColors = FLAVOR_COLORS[item.flavor]!;

  // Draw Container
  if (item.container.includes('Cone')) {
    // Cone
    const coneHeight = item.container === 'largeCone' ? 90 : 70;
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(itemX - 25, itemY);
    ctx.lineTo(itemX + 25, itemY);
    ctx.lineTo(itemX, itemY + coneHeight);
    ctx.closePath();
    ctx.fill();

    // Waffle grid lines
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(itemX - 15, itemY + 15);
    ctx.lineTo(itemX + 10, itemY + 50);
    ctx.moveTo(itemX + 15, itemY + 15);
    ctx.lineTo(itemX - 10, itemY + 50);
    ctx.stroke();
  } else {
    // Box
    const boxWidth = item.container === 'largeBox' ? 90 : 70;
    const boxHeight = 55;
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(itemX - boxWidth / 2, itemY - 10, boxWidth, boxHeight);

    // Box Stripes
    ctx.fillStyle = '#0284C7';
    for (let bx = itemX - boxWidth / 2 + 10; bx < itemX + boxWidth / 2; bx += 20) {
      ctx.fillRect(bx, itemY - 10, 10, boxHeight);
    }
  }

  // Draw Ice Cream Scoops
  const scoopRadius = 32;
  const bottomScoopY = item.container.includes('Cone') ? itemY - 15 : itemY - 25;

  if (item.scoops === 1) {
    // Single Scoop
    ctx.fillStyle = fColors.shadow;
    ctx.beginPath();
    ctx.arc(itemX, bottomScoopY, scoopRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fColors.fill;
    ctx.beginPath();
    ctx.arc(itemX - 3, bottomScoopY - 3, scoopRadius - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fColors.highlight;
    ctx.beginPath();
    ctx.arc(itemX - 10, bottomScoopY - 12, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 2 Scoops
    const topScoopY = bottomScoopY - 40;

    // Bottom scoop
    ctx.fillStyle = fColors.fill;
    ctx.beginPath();
    ctx.arc(itemX, bottomScoopY, scoopRadius, 0, Math.PI * 2);
    ctx.fill();

    // Top scoop
    ctx.fillStyle = fColors.shadow;
    ctx.beginPath();
    ctx.arc(itemX, topScoopY, scoopRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fColors.fill;
    ctx.beginPath();
    ctx.arc(itemX - 3, topScoopY - 3, scoopRadius - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fColors.highlight;
    ctx.beginPath();
    ctx.arc(itemX - 10, topScoopY - 12, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw Toppings
  const topScoopY = item.scoops === 2 ? bottomScoopY - 40 : bottomScoopY;

  if (item.topping === 'fudge') {
    // Chocolate Fudge Drizzle
    ctx.fillStyle = '#361B0D';
    ctx.beginPath();
    ctx.arc(itemX, topScoopY - 10, 24, Math.PI, 0, false);
    ctx.lineTo(itemX + 24, topScoopY + 10);
    ctx.lineTo(itemX + 14, topScoopY + 22);
    ctx.lineTo(itemX + 4, topScoopY + 12);
    ctx.lineTo(itemX - 6, topScoopY + 24);
    ctx.lineTo(itemX - 18, topScoopY + 10);
    ctx.lineTo(itemX - 24, topScoopY + 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#5A321B';
    ctx.fillRect(itemX - 12, topScoopY - 18, 12, 6);
  } else if (item.topping === 'caramel') {
    // Caramel Drizzle
    ctx.fillStyle = '#E58E26';
    ctx.beginPath();
    ctx.arc(itemX, topScoopY - 10, 24, Math.PI, 0, false);
    ctx.lineTo(itemX + 22, topScoopY + 12);
    ctx.lineTo(itemX + 12, topScoopY + 20);
    ctx.lineTo(itemX + 2, topScoopY + 10);
    ctx.lineTo(itemX - 10, topScoopY + 22);
    ctx.lineTo(itemX - 22, topScoopY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F5B041';
    ctx.fillRect(itemX - 10, topScoopY - 18, 14, 5);
  } else if (item.topping === 'peanuts') {
    // Peanuts
    ctx.fillStyle = '#D99B26';
    const peanutLocs = [
      { x: -14, y: -16 },
      { x: 4, y: -20 },
      { x: 14, y: -12 },
      { x: -8, y: -8 },
      { x: 8, y: -4 },
      { x: -18, y: -2 },
    ];
    for (const p of peanutLocs) {
      ctx.fillRect(itemX + p.x, topScoopY + p.y, 8, 6);
      ctx.fillStyle = '#8C5E13';
      ctx.fillRect(itemX + p.x + 1, topScoopY + p.y + 1, 6, 4);
      ctx.fillStyle = '#D99B26';
    }
  } else if (item.topping === 'cherry') {
    // Cherry on top
    const cherryX = itemX;
    const cherryY = topScoopY - scoopRadius - 6;

    // Stem
    ctx.strokeStyle = '#15803D';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cherryX, cherryY);
    ctx.quadraticCurveTo(cherryX + 12, cherryY - 20, cherryX + 18, cherryY - 24);
    ctx.stroke();

    // Cherry ball
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(cherryX, cherryY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cherryX - 5, cherryY - 6, 4, 4);
  } else if (item.topping === 'sprinkles') {
    // Rainbow Sprinkles
    const sprinkleColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
    const offsets = [
      { x: -16, y: -18, r: 0 },
      { x: -4, y: -22, r: 45 },
      { x: 12, y: -16, r: 90 },
      { x: -10, y: -10, r: 30 },
      { x: 6, y: -12, r: 120 },
      { x: 18, y: -4, r: 15 },
      { x: -20, y: -4, r: 60 },
      { x: -2, y: -2, r: 105 },
    ];
    offsets.forEach((sp, idx) => {
      ctx.fillStyle = sprinkleColors[idx % sprinkleColors.length]!;
      ctx.save();
      ctx.translate(itemX + sp.x, topScoopY + sp.y);
      ctx.rotate((sp.r * Math.PI) / 180);
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    });
  }

  // 6. Speech Bubble (MUST ONLY contain the clean order text itself!)
  const bubbleX = 680;
  const bubbleY = 160;
  const bubbleWidth = 720;
  const bubbleHeight = 110;

  // Speech Bubble Border (Black 4px pixel border)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(bubbleX - bubbleWidth / 2 - 6, bubbleY - bubbleHeight / 2 - 6, bubbleWidth + 12, bubbleHeight + 12);

  // Bubble Fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight);

  // Bubble Tail pointing towards customer
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(custX - 40, bubbleY + bubbleHeight / 2);
  ctx.lineTo(custX - 20, custY - 170);
  ctx.lineTo(custX - 10, bubbleY + bubbleHeight / 2);
  ctx.fill();

  // Speech Bubble Text - STRICT RULE: ONLY CLEAN ORDER TEXT ITSELF!
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.orderText, bubbleX, bubbleY);

  // Output JPG buffer
  const buffer = canvas.toBuffer('image/jpeg');
  const filePath = path.join(outDir, `${item.name}.jpg`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: ${filePath}`);
}

console.log('All 10 topping order images successfully generated!');
