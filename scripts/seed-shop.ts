import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const newItems = [
  // Flavors
  {
    name: "Bubblegum Flavor Refill",
    type: "food",
    price: 120,
    levelRequired: 3,
    emoji: "🍬",
    description: "Refills 50 scoops of sweet Bubblegum flavor."
  },
  {
    name: "Lemon Sorbet Refill",
    type: "food",
    price: 150,
    levelRequired: 4,
    emoji: "🍋",
    description: "Refills 50 scoops of refreshing Lemon Sorbet."
  },
  {
    name: "Mango Delight Refill",
    type: "food",
    price: 180,
    levelRequired: 5,
    emoji: "🥭",
    description: "Refills 50 scoops of tropical Mango Delight."
  },
  {
    name: "Coconut Cream Refill",
    type: "food",
    price: 200,
    levelRequired: 6,
    emoji: "🥥",
    description: "Refills 50 scoops of creamy Coconut Cream."
  },
  {
    name: "Salted Caramel Refill",
    type: "food",
    price: 240,
    levelRequired: 7,
    emoji: "🍯",
    description: "Refills 50 scoops of rich Salted Caramel."
  },
  {
    name: "Blueberry Splash Refill",
    type: "food",
    price: 280,
    levelRequired: 8,
    emoji: "🫐",
    description: "Refills 50 scoops of sweet Blueberry Splash."
  },
  {
    name: "Matcha Green Tea Refill",
    type: "food",
    price: 350,
    levelRequired: 9,
    emoji: "🍵",
    description: "Refills 50 scoops of premium Matcha Green Tea."
  },
  {
    name: "Cherry Blossom Refill",
    type: "food",
    price: 420,
    levelRequired: 10,
    emoji: "🍒",
    description: "Refills 50 scoops of delicate Cherry Blossom."
  },
  // Containers
  {
    name: "Box of Small Cones",
    type: "item",
    price: 10,
    levelRequired: 1,
    emoji: "🍦",
    description: "Adds 50 classic small waffle cones to your inventory."
  },
  {
    name: "Box of Large Cones",
    type: "item",
    price: 25,
    levelRequired: 2,
    emoji: "🍧",
    description: "Adds 50 large waffle cones to your inventory (yields +15% price)."
  },
  {
    name: "Box of Small Boxes",
    type: "item",
    price: 12,
    levelRequired: 1,
    emoji: "📦",
    description: "Adds 50 small serving boxes/cups to your inventory."
  },
  {
    name: "Box of Large Boxes",
    type: "item",
    price: 30,
    levelRequired: 3,
    emoji: "🗳️",
    description: "Adds 50 large serving boxes to your inventory (yields +10% price)."
  },
  // Equipment
  {
    name: "Display Case",
    type: "equipment",
    price: 400,
    levelRequired: 4,
    emoji: "🖼️",
    description: "A sleek glass display case that increases customer traffic speed by 15%."
  },
  {
    name: "Premium Tub",
    type: "equipment",
    price: 600,
    levelRequired: 5,
    emoji: "📥",
    description: "High-insulation tubs that prevent scoop spoilage on Australia stands."
  },
  {
    name: "Speed Oven",
    type: "equipment",
    price: 800,
    levelRequired: 7,
    emoji: "🔥",
    description: "A high-speed waffle cone oven that increases overall sales speed by 10%."
  },
  {
    name: "Tip Jar",
    type: "equipment",
    price: 250,
    levelRequired: 3,
    emoji: "🏺",
    description: "A cute glass jar on the counter that increases tips by 10%."
  },
  // Decorations / Cosmetics
  {
    name: "Cyberpunk Neon Theme",
    type: "decoration",
    price: 5000,
    levelRequired: 5,
    emoji: "🚨",
    description: "Equip a futuristic cyberpunk aesthetic with neon glowing frames."
  },
  {
    name: "Retro Arcade Theme",
    type: "decoration",
    price: 2500,
    levelRequired: 3,
    emoji: "🎬",
    description: "Equip a classic retro arcade visual theme for your ice cream cart."
  },
  {
    name: "Luxury Gold Theme",
    type: "decoration",
    price: 10000,
    levelRequired: 8,
    emoji: "🏆",
    description: "Equip a premium golden marble theme for the ultimate ice cream empire."
  }
];

async function run() {
  console.log('[Seeder] Seeding shop items...');
  for (const item of newItems) {
    await prisma.shopItem.upsert({
      where: { name: item.name },
      update: {
        price: item.price,
        levelRequired: item.levelRequired,
        emoji: item.emoji,
        description: item.description,
        type: item.type
      },
      create: item
    });
    console.log(`[+] Seeded/Updated item: ${item.name}`);
  }

  console.log('[Seeder] Migrating existing batches container limits...');
  const stands = await prisma.iceCreamStand.findMany({
    include: {
      batches: true,
      user: {
        include: {
          inventory: {
            include: { item: true }
          }
        }
      }
    }
  });

  for (const stand of stands) {
    const user = stand.user;
    const racksCount = user.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;
    
    // Calculate new capacities
    const maxSmallCones = 20 + (racksCount * 30) + ((stand.storageLevel - 1) * 50);
    const maxLargeCones = 10 + (racksCount * 15) + ((stand.storageLevel - 1) * 25);
    const maxSmallBoxes = 15 + ((stand.storageLevel - 1) * 30);
    const maxLargeBoxes = 10 + ((stand.storageLevel - 1) * 20);

    for (const batch of stand.batches) {
      // Set to fully stocked or current capacities if smallCones are 0
      await prisma.iceCreamBatch.update({
        where: { id: batch.id },
        data: {
          smallCones: maxSmallCones,
          maxSmallCones,
          largeCones: maxLargeCones,
          maxLargeCones,
          smallBoxes: maxSmallBoxes,
          maxSmallBoxes,
          largeBoxes: maxLargeBoxes,
          maxLargeBoxes
        }
      });
    }
    console.log(`[+] Initialized/updated batch container limits for stand: "${stand.name}" in ${stand.country}`);
  }

  console.log('[Seeder] Done!');
  process.exit(0);
}

run();
