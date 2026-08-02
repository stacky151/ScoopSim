import { prisma } from '../index';

export async function getActiveGlobalEvent() {
  const now = new Date();

  let event = await prisma.globalEvent.findFirst({
    where: { endsAt: { gte: now } },
    orderBy: { startsAt: 'desc' },
  });

  if (!event) {
    const endsAt = new Date(now.getTime() + 48 * 3600000);
    event = await prisma.globalEvent.create({
      data: {
        title: 'World Gelato Expo 2026',
        description: 'Join forces with players worldwide to serve 500,000 scoops of ice cream! Unlocks a global +100% Cash Sales Multiplier for all players upon completion.',
        targetScoops: 500000,
        currentScoops: 0,
        startsAt: now,
        endsAt,
      },
    });
  }

  return event;
}

export async function addGlobalScoops(scoops: number) {
  if (scoops <= 0) return;

  try {
    const event = await getActiveGlobalEvent();
    if (event.isCompleted) return;

    const newTotal = event.currentScoops + scoops;
    const isCompleted = newTotal >= event.targetScoops;

    await prisma.globalEvent.update({
      where: { id: event.id },
      data: {
        currentScoops: { increment: scoops },
        isCompleted,
      },
    });
  } catch (error) {
    console.error('Error adding global scoops:', error);
  }
}
