import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initialItems = [
  {
    name: 'Vanilla Flavor Refill',
    type: 'food',
    price: 10,
    levelRequired: 1,
    emoji: '🍦',
    description: 'Refills 50 scoops of Classic Vanilla flavor.',
  },
  {
    name: 'Chocolate Flavor Refill',
    type: 'food',
    price: 25,
    levelRequired: 1,
    emoji: '🍫',
    description: 'Refills 50 scoops of rich Chocolate flavor.',
  },
  {
    name: 'Strawberry Flavor Refill',
    type: 'food',
    price: 50,
    levelRequired: 2,
    emoji: '🍓',
    description: 'Refills 50 scoops of Sweet Strawberry flavor.',
  },
  {
    name: 'Mint Chip Flavor Refill',
    type: 'food',
    price: 100,
    levelRequired: 5,
    emoji: '🌿',
    description: 'Refills 50 scoops of refreshing Mint Chocolate Chip.',
  },
  {
    name: 'Pistachio Gelato Refill',
    type: 'food',
    price: 250,
    levelRequired: 10,
    emoji: '🥜',
    description: 'Refills 50 scoops of premium Pistachio Gelato.',
  },

  {
    name: 'Box of Cones',
    type: 'item',
    price: 15,
    levelRequired: 1,
    emoji: '📐',
    description: 'Adds 50 classic waffle cones to your inventory.',
  },
  {
    name: 'Box of Cups',
    type: 'item',
    price: 20,
    levelRequired: 1,
    emoji: '🥣',
    description: 'Adds 50 serving cups/pots to your inventory.',
  },

  {
    name: 'Upgraded Freezer',
    type: 'equipment',
    price: 300,
    levelRequired: 3,
    emoji: '❄️',
    description: 'Increases maximum batch scoop storage by 50 scoops.',
  },
  {
    name: 'High-Capacity Cone Rack',
    type: 'equipment',
    price: 200,
    levelRequired: 2,
    emoji: '🪵',
    description: 'Increases maximum cone storage by 30 cones.',
  },

  {
    name: 'Neon Open Sign',
    type: 'decoration',
    price: 150,
    levelRequired: 2,
    emoji: '🚨',
    description: 'A glowing sign that increases active sale speed by 10%.',
  },
  {
    name: 'Luxury Counter',
    type: 'decoration',
    price: 500,
    levelRequired: 6,
    emoji: '🪟',
    description: 'A marble counter that increases tips by 15%.',
  },
];

async function main() {
  console.log('Seeding shop items...');
  for (const item of initialItems) {
    await prisma.shopItem.upsert({
      where: { name: item.name },
      update: item,
      create: item,
    });
    console.log(`- Seeded item: ${item.name}`);
  }
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
