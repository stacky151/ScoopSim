import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { getRandomCustomerQuote, CustomerArchetype } from '../constants/customerDialogues';
import { getExpRequiredForLevel } from './simulationEngine';

export const activeUserCombos = new Map<string, number>();

export interface OfficialOrder {
  id: number;
  flavor: string;
  container: string;
  imageFile: string;
  label: string;
}

const FLAVORS = ['vanilla', 'chocolate', 'strawberry', 'pistachio', 'lemon', 'matcha'];
const CONTAINERS = ['smallCone', 'largeCone', 'smallBox', 'largeBox'];

function getContainerName(c: string): string {
  if (c === 'smallCone') return 'Small Cone';
  if (c === 'largeCone') return 'Large Cone';
  if (c === 'smallBox') return 'Small Box';
  return 'Large Box';
}

function getFlavorName(f: string): string {
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export const OFFICIAL_ORDERS: OfficialOrder[] = [];

for (let i = 0; i < 100; i++) {
  const flavor = FLAVORS[i % FLAVORS.length]!;
  const container = CONTAINERS[Math.floor(i / FLAVORS.length) % CONTAINERS.length]!;
  const scoopsCount = container.startsWith('large') ? 2 : 1;
  const id = i + 1;
  const imageFile = `order_${flavor}_${container}.jpg`;
  const label = `${scoopsCount} ${getFlavorName(flavor)} ${scoopsCount > 1 ? 'Scoops' : 'Scoop'} in a ${getContainerName(container)}`;

  OFFICIAL_ORDERS.push({
    id,
    flavor,
    container,
    imageFile,
    label,
  });
}

export interface ActiveCustomerOrder {
  userId: string;
  archetype: CustomerArchetype;
  quote: string;
  officialOrder: OfficialOrder;
  requestedFlavor: string;
  requestedContainer: string;
  step: 'flavor' | 'container' | 'cash_register' | 'ready_to_serve';
  selectedFlavor?: string;
  selectedContainer?: string;
  rewardCash: number;
  rewardExp: number;
  createdAt: number;
  expiresAt: number;
  orderTotal: number;
  customerPaid: number;
  requiredChange: number;
  userGivenChange: number;
}

const activeUserOrders = new Map<string, ActiveCustomerOrder>();

export async function generateCustomerOrderAsync(userId: string, userLevel: number): Promise<{ order: ActiveCustomerOrder | null; isStockDepleted: boolean }> {
  const activeStand = await prisma.iceCreamStand.findFirst({
    where: { userId, isActive: true },
    include: { batches: true }
  }) || await prisma.iceCreamStand.findFirst({
    where: { userId },
    include: { batches: true }
  });

  if (!activeStand || activeStand.batches.length === 0) {
    activeUserOrders.delete(userId);
    return { order: null, isStockDepleted: true };
  }

  const availableFlavors = new Set<string>();
  const availableContainers = new Set<string>();

  for (const b of activeStand.batches) {
    if (b.scoops > 0) availableFlavors.add(b.flavor);
    if (b.smallCones > 0) availableContainers.add('smallCone');
    if (b.largeCones > 0) availableContainers.add('largeCone');
    if (b.smallBoxes > 0) availableContainers.add('smallBox');
    if (b.largeBoxes > 0) availableContainers.add('largeBox');
  }

  if (availableFlavors.size === 0 || availableContainers.size === 0) {
    activeUserOrders.delete(userId);
    return { order: null, isStockDepleted: true };
  }

  const validOrders = OFFICIAL_ORDERS.filter(o =>
    availableFlavors.has(o.flavor) && availableContainers.has(o.container)
  );

  const officialOrder = validOrders.length > 0
    ? validOrders[Math.floor(Math.random() * validOrders.length)]!
    : OFFICIAL_ORDERS[0]!;

  const { archetype, quote } = getRandomCustomerQuote();
  const baseReward = 150 + userLevel * 25;
  const rewardExp = 50;

  const orderTotal = baseReward;
  let customerPaid = orderTotal;
  const requireChangeChance = Math.random() < 0.5;
  if (requireChangeChance) {
    const possibleBills = [5, 10, 20, 50, 100].filter(b => b > orderTotal);
    if (possibleBills.length > 0) {
      customerPaid = possibleBills[Math.floor(Math.random() * possibleBills.length)]!;
    } else {
      customerPaid = Math.ceil(orderTotal / 10) * 10 + 10;
    }
  }
  const requiredChange = Math.max(0, customerPaid - orderTotal);

  const order: ActiveCustomerOrder = {
    userId,
    archetype,
    quote,
    officialOrder,
    requestedFlavor: officialOrder.flavor,
    requestedContainer: officialOrder.container,
    step: 'flavor',
    rewardCash: baseReward,
    rewardExp,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    orderTotal,
    customerPaid,
    requiredChange,
    userGivenChange: 0,
  };

  activeUserOrders.set(userId, order);
  return { order, isStockDepleted: false };
}

export function getActiveUserOrder(userId: string): ActiveCustomerOrder | null {
  return activeUserOrders.get(userId) || null;
}

export function clearActiveUserOrder(userId: string) {
  activeUserOrders.delete(userId);
}

export function addChangeAmount(userId: string, amount: number): ActiveCustomerOrder | null {
  const order = activeUserOrders.get(userId);
  if (!order) return null;
  if (amount === 0) {
    order.userGivenChange = 0;
  } else {
    order.userGivenChange += amount;
  }
  return order;
}

export async function processOrderStep(userId: string, type: 'flavor' | 'container' | 'change_add' | 'serve', choice: string) {
  const order = activeUserOrders.get(userId);
  if (!order) throw new Error('No active customer order found. Click "Serve Customer" to begin!');

  const now = Date.now();
  if (now > order.expiresAt) {
    activeUserOrders.delete(userId);
    activeUserCombos.set(userId, 0);
    return {
      order,
      stepComplete: true,
      isExpired: true,
      isPerfect: false,
      isWrong: true,
      reviewStars: 1,
      reviewQuote: "⏰ 1 Star! You took too long to make my order! I'm leaving!",
      standRating: 4.5,
      rewardCash: 0,
      rewardExp: 0,
    };
  }

  if (type === 'flavor') {
    order.selectedFlavor = choice;
    order.step = 'container';
    return { order, stepComplete: true, isCorrect: choice === order.requestedFlavor };
  }

  if (type === 'container') {
    order.selectedContainer = choice;
    order.step = 'cash_register';
    return { order, stepComplete: true, isCorrect: choice === order.requestedContainer };
  }

  if (type === 'change_add') {
    const amt = Number(choice) || 0;
    if (amt === 0) order.userGivenChange = 0;
    else order.userGivenChange += amt;
    return { order, stepComplete: true };
  }

  if (type === 'serve') {
    const flavorMatch = order.selectedFlavor === order.requestedFlavor;
    const containerMatch = order.selectedContainer === order.requestedContainer;
    const changeDiff = order.userGivenChange - order.requiredChange;
    const isExactChange = changeDiff === 0;
    const isOverpaid = changeDiff > 0;
    const isUnderpaid = changeDiff < 0;

    const isPerfect = flavorMatch && containerMatch && isExactChange;
    const isWrong = (!flavorMatch && !containerMatch) || isUnderpaid;

    let comboCount = activeUserCombos.get(userId) || 0;
    let isFeverMode = false;
    let finalRewardCash = order.rewardCash;
    let finalRewardExp = order.rewardExp;
    let reviewStars = 5;
    let ratingDelta = 0.1;
    let reviewQuote = "⭐⭐⭐⭐⭐ 5 Stars! Perfect order & exact change!";

    if (isPerfect) {
      comboCount++;
      activeUserCombos.set(userId, comboCount);
      if (comboCount >= 3) {
        isFeverMode = true;
        finalRewardCash = Math.round(finalRewardCash * 2.0);
        finalRewardExp = Math.round(finalRewardExp * 2.0);
        reviewQuote = "🔥 FEVER FRENZY! ⭐⭐⭐⭐⭐ 5 Stars! Lightning fast service & exact change!";
      } else {
        finalRewardCash = Math.round(finalRewardCash * 1.5);
        reviewStars = 5;
        ratingDelta = 0.1;
        reviewQuote = `⭐⭐⭐⭐⭐ 5 Stars! Perfect serve & exact change! (${comboCount}x Combo Streak)`;
      }
    } else if (isOverpaid) {
      comboCount++;
      activeUserCombos.set(userId, comboCount);
      finalRewardCash = Math.max(10, finalRewardCash - changeDiff);
      reviewStars = 4;
      ratingDelta = 0.05;
      reviewQuote = `⭐⭐⭐⭐ 4 Stars. Thanks for the extra change ($${changeDiff} overpaid!), but be careful with cash!`;
    } else if (isWrong || isUnderpaid) {
      comboCount = 0;
      activeUserCombos.set(userId, 0);
      finalRewardCash = 0;
      reviewStars = 1;
      ratingDelta = -0.2;
      reviewQuote = isUnderpaid
        ? `⭐ 1 Star! You shortchanged me by $${Math.abs(changeDiff)}! Terrible cashier service! (Combo Broken!)`
        : "⭐ 1 Star! Terrible service! Wrong flavor AND container! (Combo Broken!)";
    } else {
      comboCount = 0;
      activeUserCombos.set(userId, 0);
      reviewStars = 3;
      ratingDelta = 0.0;
      reviewQuote = "⭐⭐⭐ 3 Stars. Decent, but not quite perfect.";
    }

    activeUserOrders.delete(userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    let newExp = user.exp + finalRewardExp;
    let newLevel = user.level;
    let expNeeded = getExpRequiredForLevel(newLevel);
    while (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      expNeeded = getExpRequiredForLevel(newLevel);
    }

    const activeStand = await prisma.iceCreamStand.findFirst({ where: { userId, isActive: true }, include: { batches: true } }) || await prisma.iceCreamStand.findFirst({ where: { userId }, include: { batches: true } });
    let updatedStandRating = 5.0;
    if (activeStand) {
      const currentRating = activeStand.rating ?? 5.0;
      updatedStandRating = Math.max(1.0, Math.min(5.0, Number((currentRating + ratingDelta).toFixed(1))));
      const newReviews = (activeStand.totalReviews ?? 0) + 1;

      const targetBatch = activeStand.batches.find(b => b.flavor === order.requestedFlavor);
      if (targetBatch) {
        const isLarge = order.requestedContainer.startsWith('large');
        const scoopsToDeduct = isLarge ? 2 : 1;
        let updateData: any = {
          scoops: Math.max(0, targetBatch.scoops - scoopsToDeduct)
        };
        if (order.requestedContainer === 'smallCone') updateData.smallCones = Math.max(0, targetBatch.smallCones - 1);
        if (order.requestedContainer === 'largeCone') updateData.largeCones = Math.max(0, targetBatch.largeCones - 1);
        if (order.requestedContainer === 'smallBox') updateData.smallBoxes = Math.max(0, targetBatch.smallBoxes - 1);
        if (order.requestedContainer === 'largeBox') updateData.largeBoxes = Math.max(0, targetBatch.largeBoxes - 1);

        await safeTransaction(async () => {
          await prisma.iceCreamBatch.update({
            where: { id: targetBatch.id },
            data: updateData
          });
        });
      }

      await safeTransaction(async () => {
        await prisma.iceCreamStand.update({
          where: { id: activeStand.id },
          data: {
            rating: updatedStandRating,
            totalReviews: newReviews,
          }
        });
      });
    }

    await safeTransaction(async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          money: { increment: finalRewardCash },
          exp: newExp,
          level: newLevel,
        },
      });
    });

    return {
      order,
      stepComplete: true,
      isPerfect,
      isWrong,
      isOverpaid,
      isUnderpaid,
      reviewStars,
      reviewQuote,
      standRating: updatedStandRating,
      rewardCash: finalRewardCash,
      rewardExp: finalRewardExp,
    };
  }

  throw new Error('Invalid minigame step.');
}
