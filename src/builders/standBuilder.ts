import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { drawStandPOV } from '../utils/canvasRenderer';
import { FLAVOR_CONFIGS, getActiveDurationMinutes } from '../utils/simulationEngine';
import { getCountryWeather, WEATHER_CONFIGS } from '../utils/weatherEngine';
import { e, getItemEmoji, getWorkerEmoji } from '../constants/emojis';

import * as fs from 'fs';
import * as path from 'path';

export async function buildStandMessage(standId: string, vipEvent?: string) {
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      batches: true,
      user: {
        include: {
          workers: true,
          inventory: {
            include: { item: true }
          }
        }
      }
    }
  });

  if (!stand) throw new Error('Stand not found');

  const user = stand.user;

  const batchesData = stand.batches.map(b => ({
    flavor: b.flavor,
    scoops: b.scoops,
    maxScoops: b.maxScoops,
  }));

  const imageBuffer = await drawStandPOV({
    name: stand.name,
    country: stand.country,
    cleanliness: stand.cleanliness,
    unclaimedMoney: stand.unclaimedMoney,
    level: user.level,
    batches: batchesData,
    equippedTheme: user.equippedTheme
  });

  const files: AttachmentBuilder[] = [];
  const galleryItems: MediaGalleryItemBuilder[] = [];

  const countryKey = stand.country.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const countryStandFileName = `stand_${countryKey}.jpg`;
  const countryStandPath = path.join(process.cwd(), 'assets', 'country_stands', countryStandFileName);

  if (fs.existsSync(countryStandPath)) {
    files.push(new AttachmentBuilder(countryStandPath, { name: countryStandFileName }));
    galleryItems.push(
      new MediaGalleryItemBuilder().setURL(`attachment://${countryStandFileName}`).setDescription(`${stand.country} Official Stand`)
    );
  } else {
    files.push(new AttachmentBuilder(imageBuffer, { name: 'stand.png' }));
    galleryItems.push(
      new MediaGalleryItemBuilder().setURL('attachment://stand.png').setDescription(stand.name)
    );
  }

  const container = new ContainerBuilder().setAccentColor(stand.isActive ? 0x00FF00 : 0xFF0000);

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(galleryItems)
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `☀️ **SUMMER EVENT ACTIVE** (Until Sept 22, 2026)\n` +
      `• 🍨 **+25% Customer Happiness**: Faster sales velocity & +25% customer tips across all 15 countries!\n` +
      `• 🔥 **+100% Heatwave Surge**: Double sales income on tropical & fruit scoops!`
    )
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const weather = getCountryWeather(stand.country);
  const weatherText = `${weather.emoji} ${weather.name} (${weather.salesMult}x sales mult)`;

  container.addTextDisplayComponents(
    TextDisplayComponents(stand, user, weatherText)
  );

  if (vipEvent) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(vipEvent)
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const activeBatches = stand.batches.filter(b => b.scoops > 0);
  const outOfStockBatches = stand.batches.filter(b => b.scoops === 0);

  let batchText = `### ${e('scoop')} Flavor Inventory\n`;
  if (activeBatches.length > 0) {
    batchText += `**Active Tubs:**\n`;
    for (const batch of activeBatches) {
      const config = FLAVOR_CONFIGS[batch.flavor] || { name: batch.flavor };
      const flavorEmoji = getItemEmoji(batch.flavor);
      const smallConeWarning = batch.smallCones === 0 ? ` ${e('warning')}` : '';
      const largeConeWarning = batch.largeCones === 0 ? ` ${e('warning')}` : '';
      const smallBoxWarning = batch.smallBoxes === 0 ? ` ${e('warning')}` : '';
      const largeBoxWarning = batch.largeBoxes === 0 ? ` ${e('warning')}` : '';

      batchText += `• ${flavorEmoji} **${config.name}**: **${batch.scoops}/${batch.maxScoops}** Scoops\n` +
        `  └ ${e('cone_small')} ${batch.smallCones}/${batch.maxSmallCones}${smallConeWarning} | ` +
        `${e('cone_large')} ${batch.largeCones}/${batch.maxLargeCones}${largeConeWarning} | ` +
        `${e('box_small')} ${batch.smallBoxes}/${batch.maxSmallBoxes}${smallBoxWarning} | ` +
        `${e('box_large')} ${batch.largeBoxes}/${batch.maxLargeBoxes}${largeBoxWarning}\n`;
    }
  }

  if (outOfStockBatches.length > 0) {
    batchText += `\n**${e('dot_red')} Out of Stock Tubs:**\n`;
    for (const batch of outOfStockBatches) {
      const config = FLAVOR_CONFIGS[batch.flavor] || { name: batch.flavor };
      const flavorEmoji = getItemEmoji(batch.flavor);
      batchText += `• ${e('dot_red')} ${flavorEmoji} **${config.name}**: 0 scoops (Refill required!)\n`;
    }
  }
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(batchText));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const workerList = user.workers.map(w => `${getWorkerEmoji(w.type)} ${w.type.charAt(0).toUpperCase() + w.type.slice(1)} (Lv. ${w.level})`).join(', ') || 'None';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`${e('workers')} **Hired Staff:** ${workerList}`)
  );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stand:order_start:${user.id}`)
      .setLabel('Serve Customer (Minigame)')
      .setEmoji('🍨')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`stand:batches_menu:${stand.id}`)
      .setLabel('Make Batches')
      .setEmoji(e('scoop'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`stand:containers_menu:${stand.id}`)
      .setLabel('Stock Containers')
      .setEmoji(e('box'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`stand:clean:${stand.id}`)
      .setLabel('Clean Shop')
      .setEmoji(e('broom'))
      .setStyle(ButtonStyle.Secondary)
  );

  const hasManagerWorker = user.workers.some((w: any) => w.type === 'manager');
  const hasCashier = user.workers.some((w: any) => w.type === 'cashier');
  const hasMaker = user.workers.some((w: any) => w.type === 'maker');
  const hasCleaner = user.workers.some((w: any) => w.type === 'cleaner');

  const { isOwner, getOwnerFooter } = require('../constants/overseer');
  const isOwnerUser = isOwner(user.id);
  const canPermaOpen = hasManagerWorker && hasCashier && hasMaker && hasCleaner;
  const canOpenStand = hasCashier && hasMaker;

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stand:upgrades_menu:${stand.id}`)
      .setLabel('Upgrades')
      .setEmoji(e('gear'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`stand:hire_menu:${stand.id}`)
      .setLabel('Hire Staff')
      .setEmoji(e('workers'))
      .setStyle(ButtonStyle.Primary)
  );

  if (canOpenStand) {
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`stand:toggle_active:${stand.id}`)
        .setLabel(canPermaOpen ? (stand.isActive ? 'Pause 24/7 Sales' : 'Open Stand Permanently ♾️') : (stand.isActive ? 'Pause Sales' : 'Open Stand'))
        .setEmoji(stand.isActive ? e('stop') : canPermaOpen ? '♾️' : e('dot_green'))
        .setStyle(stand.isActive ? ButtonStyle.Danger : ButtonStyle.Success)
    );
  }

  if (hasManagerWorker || isOwnerUser) {
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`stand:manager_menu:${stand.id}`)
        .setLabel('Manager Ops 👔')
        .setStyle(ButtonStyle.Success)
    );
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(getOwnerFooter(user.id)));

  if (canPermaOpen && stand.isActive) {
    const permaRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`stand:upgrades_menu:${stand.id}`)
        .setLabel('Upgrades')
        .setEmoji(e('gear'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`stand:manager_menu:${stand.id}`)
        .setLabel('Manager Ops 👔')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`recipe:menu`)
        .setLabel('Recipe Book')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Success)
    );
    container.addActionRowComponents(permaRow);
  } else {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`recipe:menu`)
        .setLabel('Recipe Book')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Success)
    );
    container.addActionRowComponents(row1);
    container.addActionRowComponents(row2);
  }

  return {
    components: [container],
    files,
    flags: MessageFlags.IsComponentsV2 as any
  };
}

function TextDisplayComponents(stand: any, user: any, weatherText: string) {
  const hasManager = user.workers.some((w: any) => w.type === 'manager');
  let statusText = `${e('stop')} Closed`;
  if (hasManager) {
    statusText = `${e('tie')} Automated (24/7)`;
  } else if (stand.isActive && stand.activeUntil) {
    const remaining = Math.max(0, Math.floor((new Date(stand.activeUntil).getTime() - new Date().getTime()) / 60000));
    statusText = `${e('dot_green')} Open (${remaining}m remaining)`;
  }

  const userInventory = user.inventory || [];
  const upgradeList: string[] = [];

  const checkItem = (name: string, label: string) => {
    const invItem = userInventory.find((i: any) => i.item?.name === name);
    if (invItem && invItem.quantity > 0) {
      if (invItem.quantity > 1) {
        upgradeList.push(`${label} (x${invItem.quantity})`);
      } else {
        upgradeList.push(label);
      }
    }
  };

  checkItem('Speed Oven', '⚡ Speed Oven (+10% Speed)');
  checkItem('Display Case', '🪞 Display Case (+15% Traffic)');
  checkItem('Premium Tub', '✨ Premium Tub (No Spoilage)');
  checkItem('Tip Jar', '🫙 Tip Jar (+10% Tips)');
  checkItem('Luxury Counter', '👑 Luxury Counter (+15% Tips)');
  checkItem('Neon Sign', '💡 Neon Sign (+10% Traffic)');
  checkItem('Upgraded Freezer', '🧊 Upgraded Freezer');
  checkItem('High-Capacity Cone Rack', '🧺 High-Capacity Cone Rack');

  const toppingList: string[] = [];
  const checkTopping = (name: string, label: string) => {
    const invItem = userInventory.find((i: any) => i.item?.name === name);
    if (invItem && invItem.quantity > 0) {
      toppingList.push(label);
    }
  };

  checkTopping('Rainbow Sprinkles', '🌈 Rainbow Sprinkles (+10% Tips)');
  checkTopping('Hot Fudge Drizzle', '🍫 Hot Fudge (+15% Price)');
  checkTopping('Whipped Cream Peak', '☁️ Whipped Cream (+10% Cleanliness)');
  checkTopping('Maraschino Cherry', '🍒 Maraschino Cherry (+20% VIP Rate)');
  checkTopping('24k Gold Leaf Flakes', '👑 24k Gold Leaf (+50% Revenue)');

  const upgradesText = upgradeList.length > 0
    ? `• **🛠️ Equipment & Shop Upgrades**: ${upgradeList.join(', ')}\n`
    : `• **🛠️ Equipment & Shop Upgrades**: *None (Purchase in /shop)*\n`;

  const toppingsText = toppingList.length > 0
    ? `• **🍨 Signature Toppings**: ${toppingList.join(', ')}\n`
    : `• **🍨 Signature Toppings**: *None (Unlock in Recipe Book 📜)*\n`;

  const rating = stand.rating ?? 5.0;
  const reviews = stand.totalReviews ?? 0;
  const ratingText = `⭐ **${rating.toFixed(1)} / 5.0** (${reviews} Reviews)`;

  return new TextDisplayBuilder().setContent(
    `# ${e('scoop')} ${stand.name}\n` +
    `${ratingText}\n` +
    `${e('globe')} **Country**: ${stand.country} | ${e('star')} **Level**: ${user.level} | ${e('wallet')} **Wallet**: $${user.money.toLocaleString()}\n` +
    `${e('cloudy_sun')} **Weather**: ${weatherText}\n\n` +
    `• **Status**: ${statusText}\n` +
    `• **Cleanliness**: ${stand.cleanliness}% ${stand.cleanliness < 20 && stand.cleanliness > 0 ? `${e('warning')} *Dirty! Clean it to resume full sales!*` : stand.cleanliness === 0 ? `${e('cross_red')} *Shut down! Stand is filthy!*` : e('sparkles')}\n` +
    `• **Total Customers Served**: 👥 **${(stand.totalCustomersServed || 0).toLocaleString()}** Customers\n` +
    upgradesText +
    toppingsText +
    `• **Uncollected Earnings**: ${e('money_bag')} **$${stand.unclaimedMoney.toLocaleString()}**`
  );
}

export async function buildStandUpgradesMessage(standId: string) {
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
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

  if (!stand) throw new Error('Stand not found');

  const user = stand.user;
  const money = user.money;

  const storageCost = stand.storageLevel * 500;
  const interestCost = stand.interestLevel * 800;
  const durationCost = stand.activeDurationLevel * 400;

  const freezersCount = user.inventory.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
  const racksCount = user.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;

  const currentScoops = 50 + (freezersCount * 50) + ((stand.storageLevel - 1) * 100);
  const currentSmallCones = 20 + (racksCount * 30) + ((stand.storageLevel - 1) * 50);
  const currentLargeCones = 10 + (racksCount * 15) + ((stand.storageLevel - 1) * 25);
  const currentSmallBoxes = 15 + ((stand.storageLevel - 1) * 30);
  const currentLargeBoxes = 10 + ((stand.storageLevel - 1) * 20);

  const nextScoops = currentScoops + 100;
  const nextSmallCones = currentSmallCones + 50;
  const nextLargeCones = currentLargeCones + 25;
  const nextSmallBoxes = currentSmallBoxes + 30;
  const nextLargeBoxes = currentLargeBoxes + 20;

  const currentInterest = (stand.interestLevel - 1) * 5;
  const nextInterest = currentInterest + 5;

  const currentDuration = getActiveDurationMinutes(stand.activeDurationLevel) / 60;
  const nextDuration = getActiveDurationMinutes(stand.activeDurationLevel + 1) / 60;

  const container = new ContainerBuilder().setAccentColor(0x7F00FF);

  let descText = `# ${e('gear')} Stand Upgrades - "${stand.name}"\n` +
    `${e('wallet')} **Your Wallet**: $${money.toLocaleString()}\n` +
    `Upgrade this specific stand using cash from your wallet to increase storage capacity, passive revenue, and active run time.\n\n` +
    `### ${e('box')} 1. Storage Capacity (Level ${stand.storageLevel})\n` +
    `• **Current Max**: ${currentScoops} Scoops | ${currentSmallCones} Small Cones | ${currentLargeCones} Large Cones | ${currentSmallBoxes} Small Boxes | ${currentLargeBoxes} Large Boxes\n` +
    `• **Next Level**: ${nextScoops} Scoops | ${nextSmallCones} Small Cones | ${nextLargeCones} Large Cones | ${nextSmallBoxes} Small Boxes | ${nextLargeBoxes} Large Boxes\n` +
    `• **Cost**: **$${storageCost.toLocaleString()}**\n\n` +

    `### ${e('gem')} 2. Premium Interest (Level ${stand.interestLevel})\n` +
    `• **Current Boost**: +${currentInterest}% price markup\n` +
    `• **Next Level**: +${nextInterest}% price markup\n` +
    `• **Cost**: **$${interestCost.toLocaleString()}**\n\n` +

    `### ${e('refresh')} 3. Active Session Duration (Level ${stand.activeDurationLevel})\n` +
    `• **Current Duration**: ${currentDuration} Hours before shutdown\n` +
    `• **Next Level**: ${nextDuration} Hours before shutdown\n` +
    `• **Cost**: **$${durationCost.toLocaleString()}**\n\n` +
    `-# All upgrades are permanent additions to this stand.`;

  const { isOwner, getOwnerFooter } = require('../constants/overseer');
  const isOwnerUser = isOwner(user.id);
  descText += getOwnerFooter(user.id);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descText));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const upgradeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stand:upgrade:storage:${stand.id}`)
      .setLabel(`Upgrade Storage ($${storageCost})`)
      .setEmoji(e('box'))
      .setStyle(isOwnerUser || money >= storageCost ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(isOwnerUser ? false : money < storageCost),
    new ButtonBuilder()
      .setCustomId(`stand:upgrade:interest:${stand.id}`)
      .setLabel(`Upgrade Interest ($${interestCost})`)
      .setEmoji(e('gem'))
      .setStyle(isOwnerUser || money >= interestCost ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(isOwnerUser ? false : money < interestCost),
    new ButtonBuilder()
      .setCustomId(`stand:upgrade:duration:${stand.id}`)
      .setLabel(`Upgrade Duration ($${durationCost})`)
      .setEmoji(e('refresh'))
      .setStyle(isOwnerUser || money >= durationCost ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(isOwnerUser ? false : money < durationCost)
  );

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stand:back_to_stand:${stand.id}`)
      .setLabel('Back to Stand POV')
      .setEmoji(e('arrow_back'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`stand:rename:${stand.id}`)
      .setLabel('Rename Stand')
      .setEmoji(e('pencil'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`stand:clean:${stand.id}`)
      .setLabel('Clean Stand')
      .setEmoji(e('broom'))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`stand:collect:${stand.id}`)
      .setLabel('Collect Cash')
      .setEmoji(e('cash'))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(stand.unclaimedMoney <= 0)
  );

  container.addActionRowComponents(upgradeRow);
  container.addActionRowComponents(navRow);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export async function buildStandSalesLogMessage(standId: string) {
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      batches: true,
      user: {
        include: {
          workers: true
        }
      }
    }
  });

  if (!stand) throw new Error('Stand not found');

  const user = stand.user;
  const { standSalesLogs } = require('../utils/standActiveLoop');
  const salesLog = standSalesLogs.get(standId) || [];

  const container = new ContainerBuilder().setAccentColor(0x00BFFF);

  let descText = `# ${e('clipboard')} Live Operations Log - "${stand.name}"\n` +
    `${e('wallet')} **Wallet**: $${user.money.toLocaleString()} | ${e('workers')} **Staff**: ${user.workers.length} hired\n` +
    `Cleanliness: **${stand.cleanliness}%** | Active: **${stand.isActive ? 'Yes' : 'No'}**\n\n` +
    `### Recent Sales Activity (Newest First):\n`;

  if (salesLog.length === 0) {
    descText += `*No transactions recorded in this active session yet.*\n`;
  } else {
    const logsToShow = salesLog.slice(-15).reverse();
    for (const entry of logsToShow) {
      descText += `• ${entry.text}\n`;
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descText));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stand:back_to_stand:${stand.id}`)
      .setLabel('Back to Stand POV')
      .setEmoji(e('arrow_back'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`stand:refresh_log:${stand.id}`)
      .setLabel('Refresh Log')
      .setEmoji(e('refresh'))
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(row);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export async function buildStandHireMessage(standId: string) {
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      user: {
        include: { workers: true }
      }
    }
  });

  if (!stand) throw new Error('Stand not found');

  const user = stand.user;

  const WORKERS = [
    {
      id: 'cleaner',
      label: 'Cleaner',
      emojiKey: 'worker_cleaner' as const,
      lvReq: 2,
      basePrice: 200,
      desc: 'Automatically slows cleanliness decay — keeps your stand open longer without manual scrubbing.',
    },
    {
      id: 'cashier',
      label: 'Cashier',
      emojiKey: 'worker_cashier' as const,
      lvReq: 3,
      basePrice: 300,
      desc: 'Checks out customers 25% faster — more transactions per tick, more money rolling in.',
    },
    {
      id: 'maker',
      label: 'Ice Cream Maker',
      emojiKey: 'worker_maker' as const,
      lvReq: 5,
      basePrice: 400,
      desc: 'Speeds up prep and sale intervals by 10% — every second counts at peak hours.',
    },
    {
      id: 'manager',
      label: 'Manager',
      emojiKey: 'worker_manager' as const,
      lvReq: 7,
      basePrice: 500,
      desc: 'Automates 24/7 operations: auto-refills batches from inventory and deposits cash straight to your wallet.',
    },
  ];

  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  const { isOwner, getOwnerFooter } = require('../constants/overseer');
  const isOwnerUser = isOwner(user.id);

  let hireText = `# ${e('workers')} Hire Staff — "${stand.name}"\n` +
    `${e('wallet')} **Wallet**: $${user.money.toLocaleString()} | ${e('star')} **Your Level**: ${user.level}\n` +
    `Hire workers to automate your stand operations. Each worker can be upgraded multiple times for additional bonuses.\n\n`;

  for (const w of WORKERS) {
    const activeWorker = user.workers.find(wr => wr.type === w.id);
    const level = activeWorker ? activeWorker.level : 0;
    const cost = w.basePrice * (level + 1);
    const isLocked = isOwnerUser ? false : user.level < w.lvReq;
    const canAfford = isOwnerUser ? true : user.money >= cost;

    const statusIcon = isLocked ? e('lock') : level > 0 ? e('check_green') : e('dot_red');
    const statusLabel = isLocked
      ? `*Locked (Level ${w.lvReq} required)*`
      : level > 0
      ? `**Lv. ${level}** — Hired ✓`
      : `Not hired`;

    hireText += `### ${e(w.emojiKey)} ${w.label} ${statusIcon}\n` +
      `• **Status**: ${statusLabel}\n` +
      `• **Cost**: $${cost.toLocaleString()} ${isOwnerUser ? '*(FREE for Developer)*' : level > 0 ? `(Upgrade to Lv. ${level + 1})` : '(First hire)'}\n` +
      `• *${w.desc}*\n\n`;
  }

  hireText += `-# Upgrades are immediate and permanent. Costs scale with worker level.` + getOwnerFooter(user.id);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(hireText));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const hireRow = new ActionRowBuilder<ButtonBuilder>();
  for (const w of WORKERS) {
    const activeWorker = user.workers.find(wr => wr.type === w.id);
    const level = activeWorker ? activeWorker.level : 0;
    const cost = w.basePrice * (level + 1);
    const isLocked = isOwnerUser ? false : user.level < w.lvReq;
    const canAfford = isOwnerUser ? true : user.money >= cost;

    hireRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`stand:hire_worker:${w.id}:${stand.id}`)
        .setLabel(level > 0 ? `Upgrade ${w.label}` : `Hire ${w.label}`)
        .setEmoji(e(w.emojiKey))
        .setStyle(canAfford && !isLocked ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(isOwnerUser ? false : (isLocked || !canAfford))
    );
  }
  container.addActionRowComponents(hireRow);

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`stand:back_to_stand:${stand.id}`)
      .setLabel('Back to Stand')
      .setEmoji(e('arrow_back'))
      .setStyle(ButtonStyle.Primary)
  );
  container.addActionRowComponents(navRow);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export async function buildManagerDashboardMessage(standId: string, userId: string) {
  const { isOverseer, getOverseerFooter } = require('../constants/overseer');
  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      batches: true,
      user: {
        include: { workers: true, inventory: { include: { item: true } } }
      }
    }
  });

  if (!stand) throw new Error('Stand not found');

  const user = stand.user;
  const managerWorker = user.workers.find(w => w.type === 'manager');
  const level = managerWorker ? managerWorker.level : 1;
  const hasCashier = user.workers.some(w => w.type === 'cashier');
  const hasMaker = user.workers.some(w => w.type === 'maker');
  const hasCleaner = user.workers.some(w => w.type === 'cleaner');
  const isFullyStaffed = !!managerWorker && hasCashier && hasMaker && hasCleaner;

  const container = new ContainerBuilder().setAccentColor(0x3B82F6);

  let descText = `# 👔 Manager Automation Dashboard — "${stand.name}"\n` +
    `${e('tie')} **Manager Level**: **Lv. ${level}** | Status: ${isFullyStaffed ? `${e('dot_green')} **24/7 Permanent Open Active**` : `${e('warning')} **Pending Full Staff**`}\n` +
    `${e('wallet')} **Wallet Cash**: $${user.money.toLocaleString()} | ${e('star')} **Stand Rating**: ⭐ ${stand.rating ?? 5.0}\n\n` +

    `### 📋 Manager Automation Protocol:\n` +
    `1. 👔 **CEO Delegation**: Your Manager supervises operations 24/7 so you (the CEO) no longer need to stay here clicking buttons manually, freeing you to open new stands across the USA!\n` +
    `2. 👥 **Full Operational Team Required**: To unlock **Permanent 24/7 Stand Open ♾️**, your Manager requires a full operational staff team hired in \`/shop\`:\n` +
    `   • 👔 **Manager**: ${managerWorker ? `✅ Hired (Lv. ${level})` : '❌ Needed (Req in /shop)'}\n` +
    `   • 💵 **Cashier**: ${hasCashier ? '✅ Hired' : '❌ Needed (Req in /shop)'}\n` +
    `   • 🍨 **Ice Cream Maker**: ${hasMaker ? '✅ Hired' : '❌ Needed (Req in /shop)'}\n` +
    `   • 🧹 **Cleaner**: ${hasCleaner ? '✅ Hired' : '❌ Needed (Req in /shop)'}\n` +
    `3. 🔄 **Smart Auto-Refill Logic**: Checks inventory for flavor refills & cone/box containers. If inventory items are empty, your Manager automatically purchases refills using store cash!\n` +
    `4. 💰 **Auto-Cash Deposit**: All sales revenue is deposited directly into your wallet with zero uncollected cash delays.\n\n` +

    `-# Upgrade your Manager in /shop for faster checkout speed and higher passive sales yield!` +
    getOverseerFooter(userId);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(descText));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`stand:back_to_stand:${stand.id}`).setLabel('Back to Stand POV').setEmoji(e('arrow_back')).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`shop:category:service`).setLabel('Upgrade Manager in Shop').setEmoji(e('store')).setStyle(ButtonStyle.Success)
  );

  container.addActionRowComponents(navRow);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}
