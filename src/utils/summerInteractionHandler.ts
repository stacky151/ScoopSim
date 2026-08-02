import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';

export async function handleSummerButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const targetUserId = parts[2];

  if (interaction.user.id !== targetUserId) {
    return interaction.reply({
      content: '❌ Only the user who ran /summer can claim this gift!',
      flags: MessageFlags.Ephemeral
    });
  }

  if (action === 'claim') {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return interaction.reply({
        content: '❌ Please start your empire first using /start!',
        flags: MessageFlags.Ephemeral
      });
    }

    const claimKey = `SUMMER_JAM_2026_CLAIM_${userId}`;
    const alreadyClaimed = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: 'SUMMER_JAM_2026'
        }
      }
    });

    if (alreadyClaimed) {
      const infoContainer = new ContainerBuilder().setAccentColor(0x3B82F6);
      infoContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`ℹ️ You have already claimed your **Top.gg Summer Bot Jam 2026 Festival Pack**! Enjoy the summer!`)
      );
      return interaction.reply({
        components: [infoContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    await safeTransaction(async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          money: { increment: 10000 },
          prestigeTokens: { increment: 3 }
        }
      });
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: 'SUMMER_JAM_2026'
        }
      });
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ☀️ SUMMER FESTIVAL PACK CLAIMED!\n` +
        `You received **+$10,000 Cash** and **+3 Prestige Tokens** for participating in the **Top.gg Summer Bot Jam 2026**!\n\n` +
        `🍧 *Head over to \`/shop\` or \`/map\` to expand your summer ice cream empire!*`
      )
    );

    return interaction.reply({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
