import { Message, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { processActiveTick, FLAVOR_CONFIGS, standEventEffects } from './simulationEngine';
import { buildStandMessage, buildStandUpgradesMessage, buildStandSalesLogMessage } from '../builders/standBuilder';
import { e } from '../constants/emojis';

export const activeStandIntervals = new Map<string, NodeJS.Timeout>();
export const standMessages = new Map<string, Message>();

export const standPageStates = new Map<string, 'stand' | 'upgrades' | 'sales_log'>();
export const standSalesLogs = new Map<string, Array<{ timestamp: Date; text: string; moneyEarned: number }>>();
export const standSessionStart = new Map<string, Date>();

export function startActiveStandLoop(standId: string, message: Message) {
  stopActiveStandLoop(standId);
  standMessages.set(standId, message);

  standPageStates.set(standId, 'stand');
  standSalesLogs.set(standId, []);
  standSessionStart.set(standId, new Date());

  console.log(`Starting active simulation loop for stand ${standId}...`);

  const interval = setInterval(async () => {
    try {
      const stand = await prisma.iceCreamStand.findUnique({
        where: { id: standId },
        include: { batches: true, user: { include: { workers: true } } }
      });

      if (!stand || !stand.isActive) {
        console.log(`Stand ${standId} is not active in DB. Stopping loop.`);
        stopActiveStandLoop(standId);
        return;
      }

      const userWorkers = stand.user.workers;
      const hasManager = userWorkers.some(w => w.type === 'manager');
      const hasCashier = userWorkers.some(w => w.type === 'cashier');
      const hasMaker = userWorkers.some(w => w.type === 'maker');
      const hasCleaner = userWorkers.some(w => w.type === 'cleaner');
      const isFullyAutomated = hasManager && hasCashier && hasMaker && hasCleaner;

      if (!isFullyAutomated) {
        console.log(`Stand ${standId} is not 24/7 automated. Stopping passive loop.`);
        stopActiveStandLoop(standId);
        return;
      }

      const result = await processActiveTick(standId);
      if (!result || !result.stand) {
        stopActiveStandLoop(standId);
        return;
      }
      const updatedStand = result.stand;
      const vipEvent = result.vipEvent;
      const newSales = (result as any).sales || [];

      const currentLog = standSalesLogs.get(standId) || [];
      for (const sale of newSales) {
        currentLog.push(sale);
        if (currentLog.length > 50) currentLog.shift();
      }
      standSalesLogs.set(standId, currentLog);

      const isFullyStaffed = isFullyAutomated;

      let hasScoops = updatedStand.batches.some(b => b.scoops > 0);
      let hasContainers = updatedStand.batches.some(
        b => b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0
      );
      let isDirty = updatedStand.cleanliness <= 0;

      let isExpired = false;
      if (!hasManager && stand.activeUntil) {
        isExpired = new Date().getTime() >= new Date(stand.activeUntil).getTime();
      }

      if (isFullyStaffed) {
        hasScoops = true;
        hasContainers = true;
        isDirty = false;
        isExpired = false;
      }

      const isClosed = !isFullyStaffed && (isDirty || !hasScoops || !hasContainers || isExpired || result.strikeTriggered || !updatedStand.isActive);

      if (isClosed) {
        console.log(`Stand ${standId} closed (Dirty: ${isDirty}, No Scoops: ${!hasScoops}, Expired: ${isExpired}, Strike: ${result.strikeTriggered}). Stopping loop.`);
        if (updatedStand.isActive) {
          await safeTransaction(async () => {
            await prisma.iceCreamStand.update({
              where: { id: standId },
              data: { isActive: false }
            });
          });
        }

        stopActiveStandLoop(standId);

        const payload = await buildStandMessage(standId);

        let warningText = `\n${e('warning')} **STAND CLOSED AUTOMATICALLY**:\n`;
        if (isDirty) warningText += '• Stand is too dirty! Hire a cleaner or clean it manually.\n';
        if (!hasScoops) warningText += '• Out of ice cream scoops! Click below to Buy & Refill instantly.\n';
        if (!hasContainers) warningText += '• Out of cones and cups! Click below to Buy & Refill instantly.\n';
        if (isExpired) warningText += '• Active session expired! Upgrade run duration or hire a Manager to automate 24/7.\n';
        if (result.strikeTriggered) warningText += '• Workers went on strike due to unpaid wages! Collect cash or deposit funds.\n';
        else if (!updatedStand.isActive) warningText += '• Stand was shut down by local regulations or bad reviews.\n';

        const missingNames: string[] = [];
        for (const batch of updatedStand.batches) {
          if (batch.scoops <= 0) {
            let name = `${batch.flavor.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Flavor Refill`;
            if (batch.flavor === 'pistachio') name = 'Pistachio Gelato Refill';
            if (!missingNames.includes(name)) missingNames.push(name);
          }
          if (batch.smallCones <= 0 && !missingNames.includes('Box of Small Cones')) missingNames.push('Box of Small Cones');
          if (batch.largeCones <= 0 && !missingNames.includes('Box of Large Cones')) missingNames.push('Box of Large Cones');
          if (batch.smallBoxes <= 0 && !missingNames.includes('Box of Small Boxes')) missingNames.push('Box of Small Boxes');
          if (batch.largeBoxes <= 0 && !missingNames.includes('Box of Large Boxes')) missingNames.push('Box of Large Boxes');
        }

        const shopItems = missingNames.length > 0 ? await prisma.shopItem.findMany({ where: { name: { in: missingNames } } }) : [];

        const fastBuyRow = new ActionRowBuilder<ButtonBuilder>();
        for (const item of shopItems) {
          const isLocked = stand.user.level < item.levelRequired;
          const canAfford = stand.user.money >= item.price;
          const shortName = item.name.replace(' Flavor Refill', '').replace(' Gelato Refill', '').replace('Box of ', '');
          const labelText = isLocked
            ? `🔒 ${shortName} (Lv. ${item.levelRequired} Locked)`
            : `Buy & Refill ${shortName} ($${item.price})`;
          fastBuyRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`stand:fast_buy:${standId}:${item.id}`)
              .setLabel(labelText)
              .setStyle(isLocked ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(!canAfford || isLocked)
          );
        }

        const container = payload.components?.[0] as ContainerBuilder;
        if (container) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(warningText)
          );
          if (fastBuyRow.components.length > 0) {
            container.addActionRowComponents(fastBuyRow);
          }
          payload.components = [container];
        }

        await message.edit(payload as any).catch(err => console.error('Failed to edit shutdown stand message:', err));

        const freshStand = await prisma.iceCreamStand.findUnique({ where: { id: standId } });
        if (freshStand && stand.user.notifyEmpty) {
          const discordUser = await message.client.users.fetch(stand.userId).catch(() => null);
          if (discordUser) {
            let reason = '';
            if (isDirty) reason = 'It became too dirty! Run `/openstand` and click Clean.';
            else if (!hasScoops) reason = 'You ran out of ice cream scoops. Click below to Buy & Refill instantly!';
            else if (isExpired) reason = 'Your active session expired! Upgrade stand duration or hire a Manager to automate 24/7.';
            else if (result.strikeTriggered) reason = 'Your workers went on strike due to unpaid wages! Collect cash or deposit funds.';
            else if (!updatedStand.isActive) reason = 'Your stand was shut down by local reviews or inspector audits!';
            else reason = 'You ran out of cones or boxes. Click below to Buy & Refill instantly!';

            const { buildNotificationMessage } = require('../builders/notificationBuilder');
            const dmPayload = buildNotificationMessage(stand.name, reason, standId, shopItems, stand.user.money);
          }
        }
        return;
      }

      const pageState = standPageStates.get(standId) || 'stand';
      let payload;
      if (pageState === 'upgrades') {
        payload = await buildStandUpgradesMessage(standId);
      } else if (pageState === 'sales_log') {
        payload = await buildStandSalesLogMessage(standId);
      } else {
        payload = await buildStandMessage(standId, vipEvent || undefined);
      }

      await message.edit(payload as any);

    } catch (error) {
      console.error(`Error in active stand loop for stand ${standId}:`, error);
      stopActiveStandLoop(standId);
    }
  }, 10000);

  activeStandIntervals.set(standId, interval);
}

export function stopActiveStandLoop(standId: string) {
  const interval = activeStandIntervals.get(standId);
  if (interval) {
    clearInterval(interval);
    activeStandIntervals.delete(standId);
    console.log(`Stopped active simulation loop for stand ${standId}.`);
    standEventEffects.delete(standId);
    sendSessionSummaryDM(standId).catch(err => console.error('Error sending DM summary:', err));
  }
}

async function sendSessionSummaryDM(standId: string) {
  const message = standMessages.get(standId);
  if (!message) return;

  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: { batches: true }
  });
  if (!stand) return;

  const startTime = standSessionStart.get(standId);
  const salesLog = standSalesLogs.get(standId) || [];
  if (salesLog.length === 0) {
    standSessionStart.delete(standId);
    standSalesLogs.delete(standId);
    standPageStates.delete(standId);
    return;
  }

  const endTime = new Date();
  const durationMs = startTime ? (endTime.getTime() - startTime.getTime()) : 0;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);
  const totalEarnings = salesLog.reduce((sum, s) => sum + s.moneyEarned, 0);
  const totalSalesCount = salesLog.filter(s => s.moneyEarned > 0).length;

  const flavorSales: Record<string, { count: number; earnings: number }> = {};
  for (const [key, config] of Object.entries(FLAVOR_CONFIGS)) {
    flavorSales[key] = { count: 0, earnings: 0 };
  }

  for (const sale of salesLog) {
    if (sale.moneyEarned <= 0) continue;
    for (const [key, config] of Object.entries(FLAVOR_CONFIGS)) {
      if (sale.text.includes(config.name)) {
        flavorSales[key]!.count += sale.text.includes('Double Scoop!') ? 2 : 1;
        flavorSales[key]!.earnings += sale.moneyEarned;
        break;
      }
    }
  }

  let topFlavorName = 'None';
  let topFlavorCount = 0;
  for (const [key, config] of Object.entries(FLAVOR_CONFIGS)) {
    const stat = flavorSales[key]!;
    if (stat.count > topFlavorCount) {
      topFlavorCount = stat.count;
      topFlavorName = config.name;
    }
  }

  const discordUser = await message.client.users.fetch(stand.userId).catch(() => null);
  if (!discordUser) return;

  const container = new ContainerBuilder().setAccentColor(0xFFD700);
  let summaryText = `# ${e('store')} Stand Session Summary: "${stand.name}"\n` +
    `Your stand has closed. Here is the operational summary for this session:\n\n` +
    `• **Session Duration**: ${durationMin}m ${durationSec}s\n` +
    `• **Total Revenue**: ${e('money_bag')} **+$${totalEarnings.toLocaleString()}**\n` +
    `• **Customers Served**: ${e('workers')} **${totalSalesCount}** transactions\n` +
    `• **Top Selling Flavor**: ${e('scoop')} **${topFlavorName}** (${topFlavorCount} scoops)\n\n` +
    `### ${e('clipboard')} Flavor Sales Breakdown:\n`;

  for (const [key, config] of Object.entries(FLAVOR_CONFIGS)) {
    const stat = flavorSales[key]!;
    if (stat.count > 0) {
      summaryText += `• **${config.name}**: ${stat.count} scoops sold (+$${stat.earnings.toLocaleString()})\n`;
    }
  }

  summaryText += `\n### ${e('star')} Recent Transactions (Last 10):\n`;
  const recentSales = salesLog.slice(-10).reverse();
  for (const sale of recentSales) {
    summaryText += `• ${sale.text}\n`;
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(summaryText));


  standSessionStart.delete(standId);
  standSalesLogs.delete(standId);
  standPageStates.delete(standId);
}
