import { ButtonInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';

export async function handleProfileButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  try {
    switch (action) {
      case 'open_quests': {
        await interaction.deferReply({ ephemeral: true });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          const c = new ContainerBuilder().setAccentColor(0xED4245);
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Run \`/start\` first.`));
          return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 as any } as any);
        }
        const { buildQuestsMessage } = require('../commands/quests');
        const payload = await buildQuestsMessage(userId);
        return interaction.editReply(payload as any);
      }

      case 'open_shop': {
        await interaction.deferReply({ ephemeral: true });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          const c = new ContainerBuilder().setAccentColor(0xED4245);
          c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Run \`/start\` first.`));
          return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 as any } as any);
        }
        const { buildShopMessage } = require('../builders/shopBuilder');
        const payload = await buildShopMessage(userId, 'food');
        return interaction.editReply(payload as any);
      }

      case 'open_leaderboard': {
        await interaction.deferReply({ ephemeral: true });
        const topUsers = await prisma.user.findMany({
          orderBy: { money: 'desc' },
          take: 10
        });
        const medals = [e('medal_gold'), e('medal_silver'), e('medal_bronze')];
        let text = `# ${e('trophy')} ScoopSim Leaderboard\n`;
        topUsers.forEach((usr: any, idx: number) => {
          const medal = medals[idx] || `${idx + 1}.`;
          text += `${medal} <@${usr.id}> • **$${usr.money.toLocaleString()}** (Level ${usr.level})\n`;
        });
        if (topUsers.length === 0) text += '*No rankings available yet.*';
        const c = new ContainerBuilder().setAccentColor(0xFFD700);
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
        return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 as any } as any);
      }

      default:
        console.warn(`[ProfileHandler] Unknown profile action: ${action}`);
    }
  } catch (err) {
    console.error(`[ProfileHandler] Error handling profile button action "${action}":`, err);
    if (!interaction.replied && !interaction.deferred) {
      const c = new ContainerBuilder().setAccentColor(0xED4245);
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} An error occurred.`));
      await interaction.reply({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    }
  }
}
