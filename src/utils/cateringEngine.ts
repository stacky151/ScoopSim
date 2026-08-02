import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';

export interface CateringContract {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  durationHours: number;
  cost: number;
  rewardMoney: number;
  levelRequired: number;
}

export const CATERING_CONTRACTS: Record<string, CateringContract> = {
  beach_party: {
    id: 'beach_party',
    name: 'Summer Beach Party',
    emoji: '🏖️',
    desc: 'Serve gelato to sunbathers and surfers at the coastal boardwalk.',
    durationHours: 1,
    cost: 1000,
    rewardMoney: 3500,
    levelRequired: 1,
  },
  music_festival: {
    id: 'music_festival',
    name: 'Music Festival VIP Lounge',
    emoji: '🎪',
    desc: 'Cater high-profile concert attendees with signature gourmet scoops.',
    durationHours: 4,
    cost: 3000,
    rewardMoney: 12000,
    levelRequired: 5,
  },
  corporate_gala: {
    id: 'corporate_gala',
    name: 'Corporate Tech Convention',
    emoji: '🏢',
    desc: 'Provide premium ice cream desserts for international tech summit executives.',
    durationHours: 8,
    cost: 8000,
    rewardMoney: 35000,
    levelRequired: 10,
  },
};

export async function buyTruck(userId: string) {
  const truckCost = 5000;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trucks: true },
  });

  if (!user) throw new Error('User not found.');
  if (user.money < truckCost) throw new Error(`You need **$${truckCost.toLocaleString()}** to purchase a Mobile Catering Truck.`);
  if (user.trucks.length >= 3) throw new Error('You have reached the maximum fleet capacity of **3 Ice Cream Trucks**.');

  return await safeTransaction(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { money: { decrement: truckCost } },
    });

    const newTruck = await prisma.cateringTruck.create({
      data: {
        userId,
        name: `Ice Cream Express #${user.trucks.length + 1}`,
        level: 1,
        status: 'IDLE',
      },
    });

    return newTruck;
  });
}

export async function dispatchTruck(userId: string, truckId: string, contractId: string) {
  const contract = CATERING_CONTRACTS[contractId];
  if (!contract) throw new Error('Invalid catering contract ID.');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trucks: true },
  });

  if (!user) throw new Error('User not found.');
  if (user.level < contract.levelRequired) throw new Error(`Requires Level **${contract.levelRequired}** to accept this contract.`);
  if (user.money < contract.cost) throw new Error(`You need **$${contract.cost.toLocaleString()}** upfront capital to accept this contract.`);

  const truck = user.trucks.find(t => t.id === truckId);
  if (!truck) throw new Error('Truck not found in your fleet.');
  if (truck.status === 'ON_CONTRACT') throw new Error('This truck is already dispatched on an active contract.');

  const endsAt = new Date(Date.now() + contract.durationHours * 3600000);

  return await safeTransaction(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { money: { decrement: contract.cost } },
    });

    const updatedTruck = await prisma.cateringTruck.update({
      where: { id: truckId },
      data: {
        status: 'ON_CONTRACT',
        contractId: contract.id,
        contractName: contract.name,
        contractEndsAt: endsAt,
        rewardMoney: contract.rewardMoney,
      },
    });

    return updatedTruck;
  });
}

export async function claimContractReward(userId: string, truckId: string) {
  const truck = await prisma.cateringTruck.findUnique({
    where: { id: truckId },
  });

  if (!truck || truck.userId !== userId) throw new Error('Truck not found in your fleet.');
  if (truck.status !== 'ON_CONTRACT') throw new Error('This truck is not currently on a contract.');

  const now = new Date();
  if (truck.contractEndsAt && truck.contractEndsAt > now) {
    const diffMs = truck.contractEndsAt.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    throw new Error(`Contract is still in progress! **${diffMins} minutes** remaining.`);
  }

  const reward = truck.rewardMoney;

  return await safeTransaction(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { money: { increment: reward } },
    });

    const resetTruck = await prisma.cateringTruck.update({
      where: { id: truckId },
      data: {
        status: 'IDLE',
        contractId: null,
        contractName: null,
        contractEndsAt: null,
        rewardMoney: 0,
      },
    });

    return { reward, resetTruck };
  });
}
