import { ButtonInteraction } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildPrestigeShopMessage } from '../commands/prestige';

export async function handlePrestigeButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const target = parts[2];
  const userId = parts[3] || parts[2];

  if (action === 'cancel') {
    await interaction.message.delete().catch(() => null);
    return;
  }

  if (interaction.user.id !== userId) {
    return replyV2(interaction, '❌ You cannot interact with this menu.', 0xED4245);
  }

  await interaction.deferUpdate();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stands: true,
        prestigeUpgrades: true
      }
    });

    if (!user) {
      return replyV2(interaction, '❌ User profile not found.', 0xED4245);
    }

    if (action === 'confirm') {
      const hasSouthAfrica = user.stands.some(s => s.country === 'South Africa') || user.rebirths >= 9;
      if (!hasSouthAfrica) {
        return replyV2(interaction, '❌ You are not eligible for prestige.', 0xED4245);
      }

      const estimatedTokens = 5 + Math.floor(15 * Math.pow(Math.max(0, user.money - 100000) / 100000, 0.4));

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              level: 1,
              exp: 0,
              money: 500,
              rebirths: Math.max(1, user.rebirths),
              prestigeTokens: { increment: estimatedTokens }
            }
          });

          const stands = await tx.iceCreamStand.findMany({ where: { userId } });
          for (const stand of stands) {
            await tx.iceCreamBatch.deleteMany({ where: { standId: stand.id } });
          }
          await tx.iceCreamStand.deleteMany({ where: { userId } });

          await tx.worker.deleteMany({ where: { userId } });

          await tx.userInventory.deleteMany({
            where: {
              userId,
              item: {
                type: { not: 'decoration' }
              }
            }
          });
        });
      });

      await replyV2(
        interaction,
        `🌀 **EMPIRE ASCENDED!** 🌀\n\n` +
        `You have triggered Prestige! Your stats have reset, and you have been awarded **${estimatedTokens} Prestige Tokens**.\n` +
        `Spend them in the \`/prestige shop\` for permanent game-breaking perks!\n` +
        `Run \`/start\` to establish your brand new stand.`,
        0x9B59B6
      );
      return;
    }

    if (action === 'upgrade') {
      const upgradeType = target;
      if (!upgradeType) return;

      const currentLvl = user.prestigeUpgrades.find(u => u.type === upgradeType)?.level || 0;
      const cost = currentLvl + 1;

      if (upgradeType === 'speed_mult' && currentLvl >= 10) {
        return replyV2(interaction, '❌ This upgrade is already at max level (10).', 0xED4245);
      }
      if (upgradeType === 'double_scoop_mult' && currentLvl >= 5) {
        return replyV2(interaction, '❌ This upgrade is already at max level (5).', 0xED4245);
      }
      if (upgradeType === 'supplier_discount' && currentLvl >= 10) {
        return replyV2(interaction, '❌ This upgrade is already at max level (10).', 0xED4245);
      }

      if (user.prestigeTokens < cost) {
        return replyV2(interaction, `❌ Insufficient Prestige Tokens! You need **${cost}** tokens.`, 0xED4245);
      }

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { prestigeTokens: { decrement: cost } }
          });

          await tx.prestigeUpgrade.upsert({
            where: { userId_type: { userId, type: upgradeType } },
            update: { level: { increment: 1 } },
            create: { userId, type: upgradeType, level: 1 }
          });
        });
      });

      const payload = await buildPrestigeShopMessage(userId);
      await interaction.editReply(payload as any);
      const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
      const container = new ContainerBuilder().setAccentColor(0x48BB78);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `${e('check_green')} Purchased upgrade! Permanent buff level increased to **Lv. ${currentLvl + 1}**.`
      ));
      await interaction.followUp({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

  } catch (err) {
    console.error('[PrestigeInteraction] Error:', err);
    await replyV2(interaction, '❌ An error occurred processing this prestige action.', 0xED4245);
  }
}

async function replyV2(interaction: any, text: string, color: number) {
  const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  const payload = {
    components: [container],
    flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
  };
  return interaction.followUp(payload);
}
