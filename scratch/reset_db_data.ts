import { prisma } from '../src/index';

async function resetData() {
  console.log('Resetting ScoopShack user game data...');
  await prisma.userQuest.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.userInventory.deleteMany({});
  await prisma.iceCreamBatch.deleteMany({});
  await prisma.iceCreamStand.deleteMany({});
  await prisma.cateringTruck.deleteMany({});
  await prisma.guildMember.deleteMany({});
  await prisma.guildPerk.deleteMany({});
  await prisma.guild.deleteMany({});
  await prisma.prestigeUpgrade.deleteMany({});
  await prisma.userTheme.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Database reset complete!');
  process.exit(0);
}

resetData().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
