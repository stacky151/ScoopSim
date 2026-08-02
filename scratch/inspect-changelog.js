const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.changelog.findMany();
  console.log('--- ALL CHANGELOG ENTRIES ---');
  for (const log of logs) {
    console.log(`ID: ${log.id}`);
    console.log(`Title: ${log.title}`);
    console.log(`Category: ${log.category}`);
    console.log(`Description:\n${log.description}`);
    console.log('-----------------------------');
  }
}

main().catch(err => {
  console.error(err);
});
