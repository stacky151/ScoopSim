import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const items = await prisma.shopItem.findMany();
  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}

run();
