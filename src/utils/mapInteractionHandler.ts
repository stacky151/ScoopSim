import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildMapMessage } from '../commands/map';
import { COUNTRIES_CONFIG } from './simulationEngine';

export async function handleMapInteraction(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  parts: string[]
) {
  const action = parts[1];
  let country = parts[2];
  let targetUserId = parts[3];

  if (interaction.isStringSelectMenu()) {
    targetUserId = parts[2]!;
    country = interaction.values[0]!;
  }

  const userId = interaction.user.id;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }

  if (targetUserId && userId !== targetUserId) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your global map!`)
    );
    return interaction.followUp({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stands: true }
  });

  if (!user) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} User profile not found. Run \`/start\` to begin.`)
    );
    return interaction.followUp({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  if (action === 'select') {
    const payload = await buildMapMessage(userId, country);
    await interaction.editReply({
      components: payload.components,
      files: payload.files,
      attachments: []
    } as any);
    return;
  }

  if (action === 'switch') {
    const targetStand = user.stands.find(s => s.country === country);
    if (!targetStand) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} You do not own a stand in **${country}** yet!`)
      );
      return interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const userWorkers = await prisma.worker.findMany({ where: { userId } });
    const hasCashier = userWorkers.some(w => w.type === 'cashier');
    const hasMaker = userWorkers.some(w => w.type === 'maker');

    if (!hasCashier || !hasMaker) {
      const missing = [];
      if (!hasCashier) missing.push(`${e('worker_cashier')} **Cashier** *(Lv. 3 Req in /shop)*`);
      if (!hasMaker) missing.push(`${e('worker_maker')} **Ice Cream Maker** *(Lv. 5 Req in /shop)*`);

      const warnContainer = new ContainerBuilder().setAccentColor(0xF59E0B);
      warnContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `⚠️ **Staff Required for Passive Background Sales in ${country}!**\n` +
          `To switch your stand to active background operations, you need to hire the following staff in \`/shop\`:\n` +
          `• ${missing.join('\n• ')}\n\n` +
          `💡 *Tip: You can still manually serve customers anytime by clicking **Serve Customer (Minigame)** in \`/stand\`!*`
        )
      );
      return interaction.followUp({
        components: [warnContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    await safeTransaction(async () => {
      await prisma.$transaction(async (tx) => {
        await tx.iceCreamStand.updateMany({
          where: { userId },
          data: { isActive: false }
        });
        await tx.iceCreamStand.update({
          where: { id: targetStand.id },
          data: { isActive: true }
        });
      });
    });

    const payload = await buildMapMessage(userId, country);
    await interaction.editReply({
      components: payload.components,
      files: payload.files
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✈️ Switched active stand operations to **${country}**! View your stand using \`/stand\`.`)
    );
    await interaction.followUp({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
    return;
  }

  if (action === 'unlock') {
    const config = COUNTRIES_CONFIG[country || ''];
    if (!config) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Invalid country specified.`)
      );
      return interaction.followUp({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const alreadyOwned = user.stands.some(s => s.country === country);
    if (alreadyOwned) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} You already own a stand in **${country}**!`)
      );
      return interaction.followUp({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const { isOverseer } = require('../constants/overseer');
    const isOverseerUser = isOverseer(userId);

    if (!isOverseerUser && user.money < config.price) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Insufficient cash! Unlocking **${country}** requires **$${config.price.toLocaleString()}**.`)
      );
      return interaction.followUp({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    if (!isOverseerUser && user.rebirths < config.rebirths) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Unlocking **${country}** requires **${config.rebirths}** Rebirths (You have **${user.rebirths}**).`)
      );
      return interaction.followUp({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const costToDeduct = isOverseerUser ? 0 : config.price;

    await safeTransaction(async () => {
      await prisma.$transaction(async (tx) => {
        if (costToDeduct > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { money: { decrement: costToDeduct } }
          });
        }
        await tx.iceCreamStand.updateMany({
          where: { userId },
          data: { isActive: false }
        });
        const newStand = await tx.iceCreamStand.create({
          data: {
            userId,
            name: `${interaction.user.username}'s ${country} Stand`,
            country: country!,
            isActive: true,
            cleanliness: 100
          }
        });
        await tx.iceCreamBatch.create({
          data: {
            standId: newStand.id,
            flavor: 'vanilla',
            scoops: 50,
            maxScoops: 50
          }
        });
      });
    });

    const payload = await buildMapMessage(userId, country);
    await interaction.editReply({
      components: payload.components,
      files: payload.files
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🎉 Welcome to ScoopShack! ${country} Stand Open! ${e('scoop')}\n` +
        `Congratulations on establishing your brand new ice cream stand in **${country}**! Your franchise journey begins now!\n\n` +
        `### 📜 Quick Starter Guide:\n` +
        `• 🍨 **Initial Stock**: **50 Scoops** of Vanilla Gelato loaded & ready to serve!\n` +
        `• ${e('cash')} **Starting Cash**: **$100 Cash** in your franchise wallet.\n` +
        `• 🕹️ **Order Minigame**: Click **Serve First Customer** below to take orders in high-fidelity pixel art!\n` +
        `• 🛒 **Supply Shop**: Use \`/shop\` to buy gourmet flavors (Chocolate, Strawberry, Pistachio, Lemon, Matcha) & boxes.\n` +
        `• 🧹 **Hygiene**: Keep your stand clean to earn tip multipliers and avoid regulatory shutdowns!\n\n` +
        `-# Click below to jump straight into serving customers or managing your stand!`
      )
    );

    const welcomeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`stand:order_start:${userId}`).setLabel('Serve First Customer 🍨').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`openstand:country:${country}`).setLabel('View Stand Overview 🏪').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`shop:menu:main`).setLabel('Browse Supply Shop 🛒').setStyle(ButtonStyle.Secondary)
    );

    successContainer.addActionRowComponents(welcomeRow);

    await interaction.followUp({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
