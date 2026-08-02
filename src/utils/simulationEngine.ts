import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { getCountryWeather, getWeatherMultiplier, WEATHER_CONFIGS } from './weatherEngine';
import { addGlobalScoops } from './eventEngine';
import { e } from '../constants/emojis';

export interface EventEffects {
  criticTrafficTicks?: number;
  pricePenaltyTicks?: number;
  festivalTicks?: number;
  rumorFlavor?: string;
  rumorTicks?: number;
}

export const standEventEffects = new Map<string, EventEffects>();

export function getPrestigeUpgradesMultipliers(upgrades: any[]) {
  const speedLvl = upgrades.find(u => u.type === 'speed_mult')?.level || 0;
  const tipLvl = upgrades.find(u => u.type === 'tip_mult')?.level || 0;
  const doubleLvl = upgrades.find(u => u.type === 'double_scoop_mult')?.level || 0;
  const discountLvl = upgrades.find(u => u.type === 'supplier_discount')?.level || 0;

  return {
    speedFactor: 1.0 - (Math.min(speedLvl, 10) * 0.05),
    tipBonus: tipLvl * 0.05,
    doubleScoopChance: 0.20 + (Math.min(doubleLvl, 5) * 0.10),
  };
}

export function getExpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.25, Math.max(1, level) - 1));
}

export interface FlavorConfig {
  name: string;
  basePrice: number;
}

export const FLAVOR_CONFIGS: Record<string, FlavorConfig> = {
  vanilla: { name: 'Vanilla', basePrice: 5 },
  chocolate: { name: 'Chocolate', basePrice: 7 },
  strawberry: { name: 'Strawberry', basePrice: 9 },
  mint_chip: { name: 'Mint Chip', basePrice: 10 },
  pistachio: { name: 'Pistachio Gelato', basePrice: 15 },
  bubblegum: { name: 'Bubblegum', basePrice: 12 },
  lemon: { name: 'Lemon Sorbet', basePrice: 15 },
  mango: { name: 'Mango Delight', basePrice: 18 },
  coconut: { name: 'Coconut Cream', basePrice: 20 },
  caramel: { name: 'Salted Caramel', basePrice: 24 },
  blueberry: { name: 'Blueberry Splash', basePrice: 28 },
  matcha: { name: 'Matcha Green Tea', basePrice: 35 },
  cherry: { name: 'Cherry Blossom', basePrice: 42 },
};

export const COUNTRY_FAVORITES: Record<string, string[]> = {
  USA: ['vanilla', 'bubblegum'],
  Italy: ['chocolate', 'pistachio', 'caramel'],
  Japan: ['mint_chip', 'matcha', 'cherry'],
  Brazil: ['strawberry', 'vanilla', 'mango', 'coconut'],
  Egypt: ['vanilla', 'lemon', 'mango'],
  France: ['chocolate', 'strawberry', 'blueberry', 'caramel'],
  Australia: ['mint_chip', 'lemon', 'coconut'],
  Belgium: ['chocolate', 'blueberry'],
  Iceland: ['vanilla', 'mint_chip', 'blueberry'],
  'South Africa': ['pistachio', 'mango', 'coconut'],
  Mexico: ['mango', 'strawberry', 'lemon'],
  India: ['mango', 'pistachio', 'coconut'],
  Germany: ['chocolate', 'vanilla', 'cherry'],
  Spain: ['caramel', 'strawberry', 'lemon'],
  Canada: ['caramel', 'blueberry', 'vanilla'],
};

export interface CountryConfig {
  name: string;
  price: number;
  rebirths: number;
  favorites: string[];
  description: string;
  benefit: string;
  doubt: string;
}

export const COUNTRIES_CONFIG: Record<string, CountryConfig> = {
  USA: {
    name: 'USA',
    price: 0,
    rebirths: 0,
    favorites: ['vanilla'],
    description: 'High base customer volume, standard tipping environment.',
    benefit: '• **Base Flow**: Balanced traffic.',
    doubt: '• **Standard Tips**: No bonus tipping.'
  },
  Italy: {
    name: 'Italy',
    price: 10000,
    rebirths: 1,
    favorites: ['chocolate', 'pistachio'],
    description: 'Home of Gelato, premium local pricing but hygiene inspectors are rigorous.',
    benefit: '• **Gelato Lovers**: Gelato flavors (Chocolate & Pistachio) sell at 1.8x base price.',
    doubt: '• **Strict Inspectors**: Cleanliness decays 1.2x faster.'
  },
  Japan: {
    name: 'Japan',
    price: 25000,
    rebirths: 2,
    favorites: ['mint_chip'],
    description: 'Tech-savvy crowd. High chance of VIP visits, but seasonal typhoons hit hard.',
    benefit: '• **High Tech**: +25% higher VIP customer spawn rate.',
    doubt: '• **Typhoon Season**: Typhoon weather cuts sales by 50%.'
  },
  Brazil: {
    name: 'Brazil',
    price: 50000,
    rebirths: 3,
    favorites: ['strawberry', 'vanilla'],
    description: 'Tropical heatwaves spawn more often, but humidity speeds up cleanliness decay.',
    benefit: '• **Hot Sun**: Heatwaves spawn 2x more often.',
    doubt: '• **High Humidity**: Cleanliness decays 1.3x faster.'
  },
  Egypt: {
    name: 'Egypt',
    price: 100000,
    rebirths: 4,
    favorites: ['vanilla'],
    description: 'Extreme desert heat drives crowds to your stand, but sandstorms require constant cleaning.',
    benefit: '• **Desert Heat**: +40% customer traffic.',
    doubt: '• **Sandstorms**: Cleanliness decays 1.5x faster.'
  },
  France: {
    name: 'France',
    price: 200000,
    rebirths: 5,
    favorites: ['chocolate', 'strawberry'],
    description: 'Gourmet taste leads to massive tips, but hiring employees is extremely expensive.',
    benefit: '• **Gourmet Tips**: +20% tip bonus.',
    doubt: '• **Labor Laws**: Hiring staff costs 30% more.'
  },
  Australia: {
    name: 'Australia',
    price: 350000,
    rebirths: 6,
    favorites: ['mint_chip'],
    description: 'Sunny all year round, but intense sun spoils inventory if sales halt.',
    benefit: '• **Sun Constant**: 0% chance of Rainy/Cloudy weather.',
    doubt: '• **Spoilage**: Open stand drains 1 scoop per tick extra if idle.'
  },
  Belgium: {
    name: 'Belgium',
    price: 500000,
    rebirths: 7,
    favorites: ['chocolate'],
    description: 'World-famous waffle cones yield high revenue, but cold rain is frequent.',
    benefit: '• **Waffle Cones**: +35% cone sale revenue.',
    doubt: '• **Cold Rain**: Rainy/Cloudy weather is 2x more frequent.'
  },
  Iceland: {
    name: 'Iceland',
    price: 750000,
    rebirths: 8,
    favorites: ['vanilla', 'mint_chip'],
    description: 'Freezer temperatures preserve cleanliness, but customer flow is slow.',
    benefit: '• **Frost Climate**: 0% cleanliness decay rate.',
    doubt: '• **Cold Street**: Customer traffic is 40% slower.'
  },
  'South Africa': {
    name: 'South Africa',
    price: 1000000,
    rebirths: 9,
    favorites: ['pistachio'],
    description: 'High safari tourism yields massive VIP multipliers, but loadshedding hits power.',
    benefit: '• **Safari Tourism**: VIPs pay 1.5x more on top of multipliers.',
    doubt: '• **Loadshedding**: 10% chance per tick to halt speed multipliers.'
  },
  Mexico: {
    name: 'Mexico',
    price: 1250000,
    rebirths: 10,
    favorites: ['mango', 'strawberry', 'lemon'],
    description: 'High demand for fruit sorbets and spicy toppings.',
    benefit: '• **Fruit Fiesta**: Fruit sorbet flavors sell at +25% revenue.',
    doubt: '• **Hot Climate**: Cleanliness decays 1.1x faster.'
  },
  India: {
    name: 'India',
    price: 1500000,
    rebirths: 11,
    favorites: ['mango', 'pistachio', 'coconut'],
    description: 'Massive street market crowds drive huge traffic volume.',
    benefit: '• **Street Market**: +35% customer arrival speed.',
    doubt: '• **Monsoon Season**: Rainy weather is frequent.'
  },
  Germany: {
    name: 'Germany',
    price: 1800000,
    rebirths: 12,
    favorites: ['chocolate', 'vanilla', 'cherry'],
    description: 'High labor efficiency and strict quality standards.',
    benefit: '• **Efficiency**: Worker wages overhead is 15% cheaper.',
    doubt: '• **Strict Quality**: Low cleanliness drops tip rates.'
  },
  Spain: {
    name: 'Spain',
    price: 2200000,
    rebirths: 13,
    favorites: ['caramel', 'strawberry', 'lemon'],
    description: 'Warm evening promenades boost customer tipping.',
    benefit: '• **Evening Promenade**: +30% tip payout on sunny days.',
    doubt: '• **Siesta Hours**: Afternoon customer traffic slows down slightly.'
  },
  Canada: {
    name: 'Canada',
    price: 2500000,
    rebirths: 14,
    favorites: ['caramel', 'blueberry', 'vanilla'],
    description: 'Cold northern weather preserves stand cleanliness.',
    benefit: '• **Nordic Climate**: Cleanliness decays 50% slower.',
    doubt: '• **Snowy Days**: Customer traffic is 15% slower.'
  }
};

export function getPriceMultiplier(flavor: string, country: string): number {
  const favorites = COUNTRY_FAVORITES[country] || [];
  if (favorites.includes(flavor)) {
    if (country === 'Italy') return 1.8;
    return 1.5;
  }
  return 1.0;
}

export interface ContainerChoice {
  type: 'smallCone' | 'largeCone' | 'smallBox' | 'largeBox';
  priceMult: number;
  label: string;
}

export function chooseContainer(batch: {
  smallCones: number;
  largeCones: number;
  smallBoxes: number;
  largeBoxes: number;
}): ContainerChoice | null {
  const options: { type: 'smallCone' | 'largeCone' | 'smallBox' | 'largeBox'; weight: number; priceMult: number; label: string; stock: number }[] = [
    { type: 'smallCone', weight: 45, priceMult: 1.0, label: 'Small Cone', stock: batch.smallCones },
    { type: 'largeCone', weight: 20, priceMult: 1.15, label: 'Large Cone', stock: batch.largeCones },
    { type: 'smallBox', weight: 25, priceMult: 1.0, label: 'Small Box', stock: batch.smallBoxes },
    { type: 'largeBox', weight: 10, priceMult: 1.10, label: 'Large Box', stock: batch.largeBoxes }
  ];

  const available = options.filter(o => o.stock > 0);
  const first = available[0];
  if (!first) return null;

  const totalWeight = available.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const opt of available) {
    roll -= opt.weight;
    if (roll <= 0) {
      return { type: opt.type, priceMult: opt.priceMult, label: opt.label };
    }
  }
  return { type: first.type, priceMult: first.priceMult, label: first.label };
}

export function getActiveDurationMinutes(level: number): number {
  const durations = [60, 120, 240, 480, 720, 1440];
  return durations[Math.min(level - 1, durations.length - 1)] || 60;
}

export function getCountryTrafficMultiplier(country: string): number {
  if (country === 'Egypt') return 0.6;
  if (country === 'Iceland') return 1.4;
  return 1.0;
}

export function getCountryCleanlinessDeclineMultiplier(country: string): number {
  if (country === 'Italy') return 1.2;
  if (country === 'Brazil') return 1.3;
  if (country === 'Egypt') return 1.5;
  if (country === 'Iceland') return 0;
  return 1.0;
}

export async function calculateOfflineEarnings(standId: string) {
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      batches: true,
      user: {
        include: {
          workers: true,
          prestigeUpgrades: true,
          inventory: {
            include: { item: true }
          }
        }
      }
    }
  });

  if (!stand) return null;

  const now = new Date();
  const user = stand.user;
  const hasCleaner = user.workers.some(w => w.type === 'cleaner');
  const hasCashier = user.workers.some(w => w.type === 'cashier');
  const hasMaker = user.workers.some(w => w.type === 'maker');
  const hasManager = user.workers.some(w => w.type === 'manager');

  const hasDisplayCase = user.inventory.some(inv => inv.item.name === 'Display Case');
  const hasPremiumTub = user.inventory.some(inv => inv.item.name === 'Premium Tub');
  const hasSpeedOven = user.inventory.some(inv => inv.item.name === 'Speed Oven');
  const hasTipJar = user.inventory.some(inv => inv.item.name === 'Tip Jar');

  const isFullyAutomated = hasManager && hasCashier && hasMaker && hasCleaner;

  if (!isFullyAutomated) {
    if (stand.isActive) {
      await safeTransaction(async () => {
        await prisma.iceCreamStand.update({
          where: { id: standId },
          data: { isActive: false }
        });
      });
    }
    return { stand, vipEvent: null, sales: [], strikeTriggered: false };
  }

  let isActiveSession = stand.isActive;
  let activeEndTime = now;

  const MAX_OFFLINE_SECONDS = 86400;
  const rawSecondsElapsed = Math.floor((activeEndTime.getTime() - new Date(stand.lastUpdated).getTime()) / 1000);
  const secondsElapsed = Math.min(rawSecondsElapsed, MAX_OFFLINE_SECONDS);
  if (secondsElapsed < 10) {
    if (!isActiveSession && stand.isActive) {
      await safeTransaction(async () => {
        await prisma.iceCreamStand.update({
          where: { id: standId },
          data: { isActive: false }
        });
      });
      return prisma.iceCreamStand.findUnique({
        where: { id: standId },
        include: { batches: true }
      });
    }
    return stand;
  }


  const cashier = user.workers.find(w => w.type === 'cashier');
  const maker = user.workers.find(w => w.type === 'maker');
  const cleaner = user.workers.find(w => w.type === 'cleaner');

  const weatherMult = getWeatherMultiplier(stand.country);
  const trafficMult = getCountryTrafficMultiplier(stand.country);
  const prestigeBuffs = getPrestigeUpgradesMultipliers(user.prestigeUpgrades || []);
  let saleIntervalSeconds = 60 * weatherMult * trafficMult * prestigeBuffs.speedFactor;
  if (cashier) saleIntervalSeconds *= Math.max(0.25, 0.75 - ((cashier.level - 1) * 0.05));
  if (maker) saleIntervalSeconds *= Math.max(0.40, 0.90 - ((maker.level - 1) * 0.05));
  if (hasDisplayCase) saleIntervalSeconds *= 0.85;
  if (hasSpeedOven) saleIntervalSeconds *= 0.90;

  const cleanDecMult = getCountryCleanlinessDeclineMultiplier(stand.country);
  let cleanerMult = cleaner ? Math.max(0.05, 0.25 - ((cleaner.level - 1) * 0.05)) : 1.0;
  let cleanDeclineInterval = 120 / cleanerMult;
  if (cleanDecMult > 0) {
    cleanDeclineInterval = cleanDeclineInterval / cleanDecMult;
  }
  let currentCleanliness = stand.cleanliness;
  let totalSales = 0;
  let moneyEarned = 0;

  let timeRemaining = secondsElapsed;
  const simulatedBatches = stand.batches.map(b => ({ ...b }));

  const localInventory = user.inventory.map(inv => ({
    itemId: inv.itemId,
    itemName: inv.item.name,
    quantity: inv.quantity,
  }));

  const freezersCount = user.inventory.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
  const racksCount = user.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;
  const maxScoopsLimit = 50 + (freezersCount * 50) + ((stand.storageLevel - 1) * 100);
  const maxSmallConesLimit = 20 + (racksCount * 30) + ((stand.storageLevel - 1) * 50);
  const maxLargeConesLimit = 10 + (racksCount * 15) + ((stand.storageLevel - 1) * 25);
  const maxSmallBoxesLimit = 15 + ((stand.storageLevel - 1) * 30);
  const maxLargeBoxesLimit = 10 + ((stand.storageLevel - 1) * 20);

  let workerOverheadRate = 0;
  for (const w of user.workers) {
    if (w.type === 'cleaner') workerOverheadRate += 0.5 * w.level;
    else if (w.type === 'cashier') workerOverheadRate += 0.75 * w.level;
    else if (w.type === 'maker') workerOverheadRate += 1.0 * w.level;
    else if (w.type === 'manager') workerOverheadRate += 1.5 * w.level;
  }

  let totalWages = 0;
  let strikeTriggered = false;

  while (timeRemaining > 0 && currentCleanliness > 0) {
    const stepTime = Math.min(timeRemaining, saleIntervalSeconds);
    timeRemaining -= stepTime;

    const currentPool = hasManager ? user.money : stand.unclaimedMoney;
    if ((currentPool + moneyEarned) < (totalWages + workerOverheadRate)) {
      strikeTriggered = true;
      break;
    }
    totalWages += workerOverheadRate;

    const cleanDrop = cleanDecMult === 0 ? 0 : (stepTime / cleanDeclineInterval);
    currentCleanliness = Math.max(0, currentCleanliness - cleanDrop * 10);

    let efficiency = 1.0;
    if (currentCleanliness < 20) efficiency = 0.5;
    if (currentCleanliness === 0) efficiency = 0;
    if (efficiency === 0) break;

    const isTyphoon = stand.country === 'Japan' && getCountryWeather(stand.country).type === 'rainstorm';
    const finalEfficiency = isTyphoon ? efficiency * 0.5 : efficiency;

    const salesInThisStep = Math.floor((stepTime / saleIntervalSeconds) * finalEfficiency);
    if (salesInThisStep <= 0) {
      if (stand.country === 'Australia' && !hasPremiumTub && !strikeTriggered) {
        const activeBatches = simulatedBatches.filter(b => b.scoops > 0);
        if (activeBatches.length > 0) {
          const b = activeBatches[Math.floor(Math.random() * activeBatches.length)]!;
          b.scoops = Math.max(0, b.scoops - 1);
        }
      }
      continue;
    }

    for (let i = 0; i < salesInThisStep; i++) {
      let availableBatches = simulatedBatches.filter(b => b.scoops > 0 && (b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0));
      if (hasManager) {
        for (const batch of simulatedBatches) {
          if (batch.scoops <= 0) {
            let flavorItemName = `${batch.flavor.replaceAll('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Flavor Refill`;
            if (batch.flavor === 'pistachio') flavorItemName = 'Pistachio Gelato Refill';
            const invRecord = localInventory.find(inv => inv.itemName === flavorItemName && inv.quantity > 0);
            if (invRecord) {
              invRecord.quantity--;
              batch.scoops = maxScoopsLimit;
            } else if ((currentPool + moneyEarned) >= 50) {
              moneyEarned -= 50;
              batch.scoops = maxScoopsLimit;
            }
          }
          if (batch.smallCones <= 0) {
            const coneRecord = localInventory.find(inv => inv.itemName === 'Box of Small Cones' && inv.quantity > 0);
            if (coneRecord) {
              coneRecord.quantity--;
              batch.smallCones = maxSmallConesLimit;
            } else if ((currentPool + moneyEarned) >= 20) {
              moneyEarned -= 20;
              batch.smallCones = maxSmallConesLimit;
            }
          }
          if (batch.largeCones <= 0) {
            const coneRecord = localInventory.find(inv => inv.itemName === 'Box of Large Cones' && inv.quantity > 0);
            if (coneRecord) {
              coneRecord.quantity--;
              batch.largeCones = maxLargeConesLimit;
            } else if ((currentPool + moneyEarned) >= 35) {
              moneyEarned -= 35;
              batch.largeCones = maxLargeConesLimit;
            }
          }
          if (batch.smallBoxes <= 0) {
            const cupRecord = localInventory.find(inv => inv.itemName === 'Box of Small Boxes' && inv.quantity > 0);
            if (cupRecord) {
              cupRecord.quantity--;
              batch.smallBoxes = maxSmallBoxesLimit;
            } else if ((currentPool + moneyEarned) >= 25) {
              moneyEarned -= 25;
              batch.smallBoxes = maxSmallBoxesLimit;
            }
          }
          if (batch.largeBoxes <= 0) {
            const cupRecord = localInventory.find(inv => inv.itemName === 'Box of Large Boxes' && inv.quantity > 0);
            if (cupRecord) {
              cupRecord.quantity--;
              batch.largeBoxes = maxLargeBoxesLimit;
            } else if ((currentPool + moneyEarned) >= 40) {
              moneyEarned -= 40;
              batch.largeBoxes = maxLargeBoxesLimit;
            }
          }
        }
        availableBatches = simulatedBatches.filter(b => b.scoops > 0 && (b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0));
      }

      if (availableBatches.length === 0) break;

      const batch = availableBatches[Math.floor(Math.random() * availableBatches.length)];
      if (!batch) break;
      const isDouble = Math.random() < prestigeBuffs.doubleScoopChance && batch.scoops >= 2;
      const container = chooseContainer(batch);
      if (!container) break;

      if (container.type === 'smallCone') batch.smallCones--;
      else if (container.type === 'largeCone') batch.largeCones--;
      else if (container.type === 'smallBox') batch.smallBoxes--;
      else if (container.type === 'largeBox') batch.largeBoxes--;

      let price = 0;
      if (isDouble) {
        batch.scoops -= 2;
        const config = FLAVOR_CONFIGS[batch.flavor] || { basePrice: 5 };
        const mult = getPriceMultiplier(batch.flavor, stand.country);
        let tipBonus = user.inventory.some(inv => inv.item.name === 'Luxury Counter') ? 1.15 : 1.0;
        if (hasTipJar) tipBonus += 0.10;
        if (stand.country === 'France') tipBonus += 0.20;
        tipBonus += prestigeBuffs.tipBonus;

        const interestMult = 1.0 + ((stand.interestLevel - 1) * 0.05);

        price = Math.round((config.basePrice * 2) * mult * container.priceMult * tipBonus * interestMult * 1.8);
        totalSales += 2;
      } else {
        batch.scoops--;
        const config = FLAVOR_CONFIGS[batch.flavor] || { basePrice: 5 };
        const mult = getPriceMultiplier(batch.flavor, stand.country);
        let tipBonus = user.inventory.some(inv => inv.item.name === 'Luxury Counter') ? 1.15 : 1.0;
        if (hasTipJar) tipBonus += 0.10;
        if (stand.country === 'France') tipBonus += 0.20;
        tipBonus += prestigeBuffs.tipBonus;

        const interestMult = 1.0 + ((stand.interestLevel - 1) * 0.05);

        price = Math.round(config.basePrice * mult * container.priceMult * tipBonus * interestMult);
        totalSales++;
      }

      if ((container.type === 'smallCone' || container.type === 'largeCone') && stand.country === 'Belgium') {
        price = Math.round(price * 1.35);
      }

      moneyEarned += price;
    }
  }

  if (strikeTriggered) {
    isActiveSession = false;
  }

  const netEarnings = moneyEarned - totalWages;

  await safeTransaction(async () => {
    await prisma.$transaction(async (tx) => {
      for (const batch of simulatedBatches) {
        await tx.iceCreamBatch.update({
          where: { id: batch.id },
          data: {
            scoops: batch.scoops,
            smallCones: batch.smallCones,
            maxSmallCones: maxSmallConesLimit,
            largeCones: batch.largeCones,
            maxLargeCones: maxLargeConesLimit,
            smallBoxes: batch.smallBoxes,
            maxSmallBoxes: maxSmallBoxesLimit,
            largeBoxes: batch.largeBoxes,
            maxLargeBoxes: maxLargeBoxesLimit,
            maxScoops: maxScoopsLimit,
          }
        });
      }

      if (hasManager) {
        for (const inv of localInventory) {
          const original = user.inventory.find(i => i.itemId === inv.itemId);
          if (original && original.quantity !== inv.quantity) {
            await tx.userInventory.update({
              where: { userId_itemId: { userId: user.id, itemId: inv.itemId } },
              data: { quantity: inv.quantity }
            });
          }
        }
      }

      await tx.iceCreamStand.update({
        where: { id: stand.id },
        data: {
          cleanliness: Math.round(currentCleanliness),
          unclaimedMoney: hasManager ? stand.unclaimedMoney : stand.unclaimedMoney + netEarnings,
          lastUpdated: now,
          isActive: isActiveSession,
        }
      });

      if (totalSales > 0) {
        addGlobalScoops(totalSales).catch(() => {});
        const expGained = totalSales;
        let newExp = user.exp + expGained;
        let newLevel = user.level;
        let expNeeded = newLevel * 100;
        while (newExp >= expNeeded) {
          newExp -= expNeeded;
          newLevel++;
          expNeeded = newLevel * 100;
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            exp: newExp,
            level: newLevel,
            ...(hasManager && netEarnings !== 0 ? { money: { increment: netEarnings } } : {})
          }
        });

        await incrementQuestProgress(tx, user.id, 'sell_scoops', totalSales);
        if (hasManager && moneyEarned > 0) {
          await incrementQuestProgress(tx, user.id, 'collect_cash', moneyEarned);
        }
      }
    });
  });

  return prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: { batches: true }
  });
}

export async function processActiveTick(standId: string) {
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      batches: true,
      user: {
        include: {
          workers: true,
          prestigeUpgrades: true,
          inventory: {
            include: { item: true }
          }
        }
      }
    }
  });

  if (!stand) return null;

  const now = new Date();
  const user = stand.user;

  const hasManager = user.workers.some(w => w.type === 'manager');
  if (!hasManager && stand.activeUntil) {
    if (now.getTime() >= new Date(stand.activeUntil).getTime()) {
      await safeTransaction(async () => {
        await prisma.iceCreamStand.update({
          where: { id: standId },
          data: { isActive: false }
        });
      });
      return { stand: { ...stand, isActive: false }, vipEvent: null, sales: [], strikeTriggered: false };
    }
  }

  const hasCleaner = user.workers.some(w => w.type === 'cleaner');
  const hasCashier = user.workers.some(w => w.type === 'cashier');
  const hasMaker = user.workers.some(w => w.type === 'maker');

  const hasNeonSign = user.inventory.some(inv => inv.item.name === 'Neon Open Sign');
  const hasLuxuryCounter = user.inventory.some(inv => inv.item.name === 'Luxury Counter');
  const hasDisplayCase = user.inventory.some(inv => inv.item.name === 'Display Case');
  const hasPremiumTub = user.inventory.some(inv => inv.item.name === 'Premium Tub');
  const hasSpeedOven = user.inventory.some(inv => inv.item.name === 'Speed Oven');
  const hasTipJar = user.inventory.some(inv => inv.item.name === 'Tip Jar');

  let effects = standEventEffects.get(standId) || {};
  const isEventActive = (effects.criticTrafficTicks && effects.criticTrafficTicks > 0) ||
                        (effects.pricePenaltyTicks && effects.pricePenaltyTicks > 0) ||
                        (effects.festivalTicks && effects.festivalTicks > 0) ||
                        (effects.rumorTicks && effects.rumorTicks > 0);

  let spawnedEventText: string | null = null;
  let eventEarnings = 0;
  let forceStandClose = false;

  let workerOverhead = 0;
  for (const w of user.workers) {
    if (w.type === 'cleaner') workerOverhead += 0.5 * w.level;
    else if (w.type === 'cashier') workerOverhead += 0.75 * w.level;
    else if (w.type === 'maker') workerOverhead += 1.0 * w.level;
    else if (w.type === 'manager') workerOverhead += 1.5 * w.level;
  }

  let currentCleanliness = stand.cleanliness;

  if (!isEventActive && Math.random() < 0.05) {
    const eventRoll = Math.random();
    if (eventRoll < 0.25) {
      if (currentCleanliness >= 80) {
        effects.criticTrafficTicks = 10;
        eventEarnings = 1000;
        spawnedEventText = `${e('event_critic')} **VIP Food Critic Review**: Your stand cleanliness is pristine! Awarded **+$1,000** and **2x customer traffic speed** for 10 ticks!`;
      } else {
        effects.pricePenaltyTicks = 10;
        forceStandClose = true;
        spawnedEventText = `${e('warning')} **VIP Food Critic Review**: The critic found your stand dirty! Your stand was **SHUT DOWN** and reviews caused a **50% price reduction penalty** for the next 10 ticks!`;
      }
    } else if (eventRoll < 0.50) {
      if (currentCleanliness < 50) {
        eventEarnings = -500;
        spawnedEventText = `${e('event_inspector')} **Health Inspector Audit**: Violations detected (<50% cleanliness)! You have been fined **-$500** immediately!`;
      } else {
        spawnedEventText = `${e('event_inspector')} **Health Inspector Audit**: Inspection passed. Keep up the high standard of cleanliness!`;
      }
    } else if (eventRoll < 0.75) {
      effects.festivalTicks = 10;
      spawnedEventText = `${e('event_festival')} **Ice Cream Festival**: An ice cream festival started nearby! Customer traffic speed is boosted by **3x** for the next 10 ticks!`;
    } else {
      const flavors = stand.batches.map(b => b.flavor);
      const chosenFlavor = flavors[Math.floor(Math.random() * flavors.length)] || 'vanilla';
      const flavorName = FLAVOR_CONFIGS[chosenFlavor]?.name || chosenFlavor;
      effects.rumorFlavor = chosenFlavor;
      effects.rumorTicks = 10;
      spawnedEventText = `${e('event_rumor')} **Gourmet Rumors**: Rumors spread that your **${flavorName}** is world-class! Selling at **2x price** for the next 10 Ticks!`;
    }
    standEventEffects.set(standId, effects);
  }

  const weatherMult = getWeatherMultiplier(stand.country);
  const trafficMult = getCountryTrafficMultiplier(stand.country);
  const prestigeBuffs = getPrestigeUpgradesMultipliers(user.prestigeUpgrades || []);

  let speedMult = 1.0;
  if (effects.festivalTicks && effects.festivalTicks > 0) speedMult *= 3.0;
  else if (effects.criticTrafficTicks && effects.criticTrafficTicks > 0) speedMult *= 2.0;

  let interval = (10.0 * weatherMult * trafficMult * prestigeBuffs.speedFactor) / speedMult;

  const cashier = user.workers.find(w => w.type === 'cashier');
  const maker = user.workers.find(w => w.type === 'maker');
  const cleaner = user.workers.find(w => w.type === 'cleaner');

  const isLoadshedding = stand.country === 'South Africa' && Math.random() < 0.10;
  if (!isLoadshedding) {
    if (hasNeonSign) interval *= 0.9;
    if (cashier) interval *= Math.max(0.25, 0.75 - ((cashier.level - 1) * 0.05));
    if (maker) interval *= Math.max(0.40, 0.90 - ((maker.level - 1) * 0.05));
    if (hasDisplayCase) interval *= 0.85;
    if (hasSpeedOven) interval *= 0.90;
  }

  const secondsElapsed = (now.getTime() - new Date(stand.lastUpdated).getTime()) / 1000;
  if (secondsElapsed < interval) {
    if (spawnedEventText || forceStandClose) {
      if (forceStandClose) {
        await safeTransaction(async () => {
          await prisma.iceCreamStand.update({
            where: { id: standId },
            data: { isActive: false, lastUpdated: now }
          });
        });
      }
      return { stand: { ...stand, isActive: !forceStandClose, lastUpdated: now }, vipEvent: spawnedEventText, sales: [], strikeTriggered: false };
    }
    return { stand, vipEvent: null, sales: [], strikeTriggered: false };
  }

  const customers = Math.floor(secondsElapsed / interval);
  let moneyEarned = eventEarnings;
  let totalSales = 0;

  const simulatedBatches = stand.batches.map(b => ({ ...b }));

  const isOnStrike = (hasManager ? user.money : stand.unclaimedMoney) < workerOverhead;

  const cleanDecMult = getCountryCleanlinessDeclineMultiplier(stand.country);
  let cleanerEfficiency = 0.5;
  if (cleaner && !isOnStrike) {
    cleanerEfficiency = Math.max(0.1, 0.5 - ((cleaner.level - 1) * 0.05));
  }
  const cleanDeclinePerSale = cleanDecMult === 0 ? 0 : ((cleaner && !isOnStrike ? cleanerEfficiency : 1.0) * cleanDecMult);

  const localInventory = user.inventory.map(inv => ({
    itemId: inv.itemId,
    itemName: inv.item.name,
    quantity: inv.quantity,
  }));

  const freezersCount = user.inventory.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
  const racksCount = user.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;
  const maxScoopsLimit = 50 + (freezersCount * 50) + ((stand.storageLevel - 1) * 100);
  const maxSmallConesLimit = 20 + (racksCount * 30) + ((stand.storageLevel - 1) * 50);
  const maxLargeConesLimit = 10 + (racksCount * 15) + ((stand.storageLevel - 1) * 25);
  const maxSmallBoxesLimit = 15 + ((stand.storageLevel - 1) * 30);
  const maxLargeBoxesLimit = 10 + ((stand.storageLevel - 1) * 20);

  const attemptManagerRefills = () => {
    for (const batch of simulatedBatches) {
      if (batch.scoops <= 0) {
        let flavorItemName = `${batch.flavor.replaceAll('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Flavor Refill`;
        if (batch.flavor === 'pistachio') flavorItemName = 'Pistachio Gelato Refill';
        const invRecord = localInventory.find(i => i.itemName === flavorItemName && i.quantity > 0);
        if (invRecord) invRecord.quantity--;
        batch.scoops = maxScoopsLimit;
      }
      if (batch.smallCones <= 0) {
        const coneRecord = localInventory.find(i => i.itemName === 'Box of Small Cones' && i.quantity > 0);
        if (coneRecord) coneRecord.quantity--;
        batch.smallCones = maxSmallConesLimit;
      }
      if (batch.largeCones <= 0) {
        const coneRecord = localInventory.find(i => i.itemName === 'Box of Large Cones' && i.quantity > 0);
        if (coneRecord) coneRecord.quantity--;
        batch.largeCones = maxLargeConesLimit;
      }
      if (batch.smallBoxes <= 0) {
        const cupRecord = localInventory.find(i => i.itemName === 'Box of Small Boxes' && i.quantity > 0);
        if (cupRecord) cupRecord.quantity--;
        batch.smallBoxes = maxSmallBoxesLimit;
      }
      if (batch.largeBoxes <= 0) {
        const cupRecord = localInventory.find(i => i.itemName === 'Box of Large Boxes' && i.quantity > 0);
        if (cupRecord) cupRecord.quantity--;
        batch.largeBoxes = maxLargeBoxesLimit;
      }
    }
  };

  if (hasManager && !isOnStrike) attemptManagerRefills();

  const salesList: Array<{ text: string; moneyEarned: number }> = [];

  let vipEventText: string | null = null;
  let cleanlinessDamage = 0;
  let vipServed = false;
  let vipExpBonus = 0;
  let vipChance = 0.15;
  if (stand.country === 'Japan') vipChance *= 1.25;
  const isTyphoon = stand.country === 'Japan' && getCountryWeather(stand.country).type === 'rainstorm';

  let totalWages = 0;
  let strikeTriggered = isOnStrike;

  const vipRoll = Math.random() < vipChance && customers > 0 && !strikeTriggered;
  if (vipRoll && !isTyphoon) {
    const currentPool = hasManager ? user.money : stand.unclaimedMoney;
    if ((currentPool + moneyEarned) < (totalWages + workerOverhead)) {
      strikeTriggered = true;
    } else {
      totalWages += workerOverhead;
      const vipTypes = [
        { id: 'critic', name: `${e('critic')} Food Critic`, multiplier: 5.0, expBonus: 100 },
        { id: 'billionaire', name: `${e('gem')} Tech Billionaire`, multiplier: 10.0, expBonus: 50 },
        { id: 'celebrity', name: `${e('star_movie')} Movie Star`, multiplier: 3.0, expBonus: 150 },
      ];
      const vip = vipTypes[Math.floor(Math.random() * vipTypes.length)]!;
      let availableBatches = simulatedBatches.filter(b => b.scoops > 0 && (b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0));
      if (availableBatches.length === 0 && hasManager) {
        attemptManagerRefills();
        availableBatches = simulatedBatches.filter(b => b.scoops > 0 && (b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0));
      }

      if (availableBatches.length > 0) {
        const batch = availableBatches[Math.floor(Math.random() * availableBatches.length)]!;
        const container = chooseContainer(batch);
        if (container) {
          batch.scoops--;
          if (container.type === 'smallCone') batch.smallCones--;
          else if (container.type === 'largeCone') batch.largeCones--;
          else if (container.type === 'smallBox') batch.smallBoxes--;
          else if (container.type === 'largeBox') batch.largeBoxes--;

          const config = FLAVOR_CONFIGS[batch.flavor] || { name: batch.flavor, basePrice: 5 };
          let finalMult = getPriceMultiplier(batch.flavor, stand.country);
          if (effects.rumorFlavor === batch.flavor && effects.rumorTicks && effects.rumorTicks > 0) {
            finalMult *= 2.0;
          }
          let tipBonus = hasLuxuryCounter ? 1.15 : 1.0;
          if (hasTipJar) tipBonus += 0.10;
          if (stand.country === 'France') tipBonus += 0.20;
          tipBonus += prestigeBuffs.tipBonus;

          const interestMult = 1.0 + ((stand.interestLevel - 1) * 0.05);

          let vipMult = vip.multiplier;
          if (stand.country === 'South Africa') vipMult *= 1.5;

          let vipPrice = Math.round(config.basePrice * finalMult * container.priceMult * tipBonus * interestMult * vipMult);
          if (effects.pricePenaltyTicks && effects.pricePenaltyTicks > 0) {
            vipPrice = Math.round(vipPrice * 0.5);
          }
          if ((container.type === 'smallCone' || container.type === 'largeCone') && stand.country === 'Belgium') {
            vipPrice = Math.round(vipPrice * 1.35);
          }

          moneyEarned += vipPrice;
          totalSales++;
          vipServed = true;
          vipExpBonus = vip.expBonus;
          vipEventText = `${e('star')} **VIP VISIT**: **${vip.name}** ordered **${config.name}** in a ${container.label}!\n- Paid: **+$${vipPrice}** | EXP: **+${vip.expBonus}**`;
          salesList.push({
            text: `🌟 **VIP Order**: ${config.name} in a ${container.label} (**+$${vipPrice}**)`,
            moneyEarned: vipPrice
          });
        }
      } else {
        cleanlinessDamage = 10;
        vipEventText = `${e('warning')} **VIP DISAPPOINTMENT**: **${vip.name}** wanted ice cream, but you were **OUT OF STOCK**!\n- Penalty: **-10% Cleanliness** due to bad reviews!`;
        salesList.push({
          text: `⚠️ **VIP Disappointment**: Out of stock! (-10% Cleanliness)`,
          moneyEarned: 0
        });
      }
    }
  }

  const finalCustomers = isTyphoon ? Math.floor(customers * 0.5) : customers;
  for (let c = 0; c < finalCustomers; c++) {
    if (strikeTriggered) break;

    const currentPool = hasManager ? user.money : stand.unclaimedMoney;
    if ((currentPool + moneyEarned) < (totalWages + workerOverhead)) {
      strikeTriggered = true;
      break;
    }
    totalWages += workerOverhead;

    if (currentCleanliness <= 0) break;

    let availableBatches = simulatedBatches.filter(b => b.scoops > 0 && (b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0));
    if (availableBatches.length === 0 && hasManager) {
      attemptManagerRefills();
      availableBatches = simulatedBatches.filter(b => b.scoops > 0 && (b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0));
    }

    if (availableBatches.length === 0) break;

    const batch = availableBatches[Math.floor(Math.random() * availableBatches.length)];
    if (!batch) break;
    const isDouble = Math.random() < prestigeBuffs.doubleScoopChance && batch.scoops >= 2;
    const container = chooseContainer(batch);
    if (!container) break;

    if (container.type === 'smallCone') batch.smallCones--;
    else if (container.type === 'largeCone') batch.largeCones--;
    else if (container.type === 'smallBox') batch.smallBoxes--;
    else if (container.type === 'largeBox') batch.largeBoxes--;

    currentCleanliness = Math.max(0, currentCleanliness - cleanDeclinePerSale);

    let price = 0;
    const config = FLAVOR_CONFIGS[batch.flavor] || { name: 'Ice Cream', basePrice: 5 };
    if (isDouble) {
      batch.scoops -= 2;
      let finalMult = getPriceMultiplier(batch.flavor, stand.country);
      if (effects.rumorFlavor === batch.flavor && effects.rumorTicks && effects.rumorTicks > 0) {
        finalMult *= 2.0;
      }
      let tipBonus = hasLuxuryCounter ? 1.15 : 1.0;
      if (hasTipJar) tipBonus += 0.10;
      if (stand.country === 'France') tipBonus += 0.20;
      tipBonus += prestigeBuffs.tipBonus;

      const interestMult = 1.0 + ((stand.interestLevel - 1) * 0.05);

      price = Math.round((config.basePrice * 2) * finalMult * container.priceMult * tipBonus * interestMult * 1.8);
      if (effects.pricePenaltyTicks && effects.pricePenaltyTicks > 0) {
        price = Math.round(price * 0.5);
      }
      if ((container.type === 'smallCone' || container.type === 'largeCone') && stand.country === 'Belgium') {
        price = Math.round(price * 1.35);
      }

      totalSales += 2;
      salesList.push({
        text: `🍨 Double Scoop! **${config.name}** x2 in a ${container.label} (**+$${price}**)`,
        moneyEarned: price
      });
    } else {
      batch.scoops--;
      let finalMult = getPriceMultiplier(batch.flavor, stand.country);
      if (effects.rumorFlavor === batch.flavor && effects.rumorTicks && effects.rumorTicks > 0) {
        finalMult *= 2.0;
      }
      let tipBonus = hasLuxuryCounter ? 1.15 : 1.0;
      if (hasTipJar) tipBonus += 0.10;
      if (stand.country === 'France') tipBonus += 0.20;
      tipBonus += prestigeBuffs.tipBonus;

      const interestMult = 1.0 + ((stand.interestLevel - 1) * 0.05);

      price = Math.round(config.basePrice * finalMult * container.priceMult * tipBonus * interestMult);
      if (effects.pricePenaltyTicks && effects.pricePenaltyTicks > 0) {
        price = Math.round(price * 0.5);
      }
      if ((container.type === 'smallCone' || container.type === 'largeCone') && stand.country === 'Belgium') {
        price = Math.round(price * 1.35);
      }

      totalSales++;
      salesList.push({
        text: `🍦 Served **${config.name}** in a ${container.label} (**+$${price}**)`,
        moneyEarned: price
      });
    }

    moneyEarned += price;
  }

  if (totalSales === 0 && stand.country === 'Australia' && !hasPremiumTub && !strikeTriggered) {
    const activeBatches = simulatedBatches.filter(b => b.scoops > 0);
    if (activeBatches.length > 0) {
      const b = activeBatches[Math.floor(Math.random() * activeBatches.length)]!;
      b.scoops = Math.max(0, b.scoops - 1);
      salesList.push({
        text: `☀️ Spoilage: 1 scoop of **${FLAVOR_CONFIGS[b.flavor]?.name ?? b.flavor}** melted due to heat.`,
        moneyEarned: 0
      });
    }
  }

  currentCleanliness = Math.max(0, currentCleanliness - cleanlinessDamage);

  const standActiveState = !strikeTriggered && !forceStandClose && stand.isActive;

  const netEarnings = moneyEarned - totalWages;

  await safeTransaction(async () => {
    await prisma.$transaction(async (tx) => {
      for (const batch of simulatedBatches) {
        await tx.iceCreamBatch.update({
          where: { id: batch.id },
          data: {
            scoops: batch.scoops,
            smallCones: batch.smallCones,
            maxSmallCones: maxSmallConesLimit,
            largeCones: batch.largeCones,
            maxLargeCones: maxLargeConesLimit,
            smallBoxes: batch.smallBoxes,
            maxSmallBoxes: maxSmallBoxesLimit,
            largeBoxes: batch.largeBoxes,
            maxLargeBoxes: maxLargeBoxesLimit,
            maxScoops: maxScoopsLimit,
          }
        });
      }

      if (hasManager) {
        for (const inv of localInventory) {
          const original = user.inventory.find(i => i.itemId === inv.itemId);
          if (original && original.quantity !== inv.quantity) {
            await tx.userInventory.update({
              where: { userId_itemId: { userId: user.id, itemId: inv.itemId } },
              data: { quantity: inv.quantity }
            });
          }
        }
      }

      await tx.iceCreamStand.update({
        where: { id: stand.id },
        data: {
          cleanliness: Math.round(currentCleanliness),
          unclaimedMoney: hasManager ? stand.unclaimedMoney : stand.unclaimedMoney + netEarnings,
          lastUpdated: now,
          isActive: standActiveState,
          ...(totalSales > 0 ? { totalCustomersServed: { increment: totalSales } } : {})
        }
      });

      if (totalSales > 0 || vipServed) {
        let expGained = totalSales * 2;
        if (vipServed) expGained += vipExpBonus;

        let newExp = user.exp + expGained;
        let newLevel = user.level;
        let expNeeded = getExpRequiredForLevel(newLevel);
        while (newExp >= expNeeded) {
          newExp -= expNeeded;
          newLevel++;
          expNeeded = getExpRequiredForLevel(newLevel);
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            exp: newExp,
            level: newLevel,
            ...(hasManager && netEarnings !== 0 ? { money: { increment: netEarnings } } : {})
          }
        });

        if (totalSales > 0) {
          await incrementQuestProgress(tx, user.id, 'sell_scoops', totalSales);
        }
        if (hasManager && moneyEarned > 0) {
          await incrementQuestProgress(tx, user.id, 'collect_cash', moneyEarned);
        }
      }
    });
  });

  if (effects.criticTrafficTicks && effects.criticTrafficTicks > 0) {
    effects.criticTrafficTicks--;
  }
  if (effects.pricePenaltyTicks && effects.pricePenaltyTicks > 0) {
    effects.pricePenaltyTicks--;
  }
  if (effects.festivalTicks && effects.festivalTicks > 0) {
    effects.festivalTicks--;
  }
  if (effects.rumorTicks && effects.rumorTicks > 0) {
    effects.rumorTicks--;
    if (effects.rumorTicks === 0) {
      delete effects.rumorFlavor;
    }
  }
  standEventEffects.set(standId, effects);

  const updatedStand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: { batches: true }
  });

  let combinedVipText: string | null = null;
  if (spawnedEventText) {
    combinedVipText = spawnedEventText;
  }
  if (vipEventText) {
    combinedVipText = (combinedVipText ? combinedVipText + "\n\n" : "") + vipEventText;
  }

  return {
    stand: updatedStand,
    vipEvent: combinedVipText,
    sales: salesList,
    strikeTriggered
  };
}

export async function incrementQuestProgress(tx: any, userId: string, questType: string, amount: number) {
  try {
    const quests = await tx.userQuest.findMany({
      where: { userId, questType, completed: false }
    });

    for (const quest of quests) {
      const newProgress = Math.min(quest.target, quest.progress + amount);
      const isCompleted = newProgress >= quest.target;

      await tx.userQuest.update({
        where: { id: quest.id },
        data: {
          progress: newProgress,
          completed: isCompleted
        }
      });
      console.log(`[Quest Tracker] Incremented ${questType} quest for user ${userId} by ${amount} (${newProgress}/${quest.target})`);
    }
  } catch (err) {
    console.error(`Error incrementing quest progress for ${userId}:`, err);
  }
}
