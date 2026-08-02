import { ButtonInteraction } from 'discord.js';
import { e } from '../constants/emojis';
import { buildAchievementsMessage } from '../commands/achievements';

export async function handleAchievementsButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const tabName = parts[2] || 'empire';
  const userId = parts[3];

  if (userId && interaction.user.id !== userId) {
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your achievements menu!`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  try {
    if (action === 'claim_all') {
      const { prisma } = require('../index');
      const { safeTransaction } = require('./dbTransaction');
      const { ACHIEVEMENTS } = require('../commands/achievements');

      const user = await prisma.user.findUnique({
        where: { id: interaction.user.id },
        include: {
          stands: true,
          workers: true,
          quests: true,
          prestigeUpgrades: true,
          themes: true,
          achievements: true
        }
      });

      if (!user) return;

      const claimedSet = new Set(user.achievements.map((a: any) => a.achievementId));
      let rewardCashSum = 0;
      let rewardTokenSum = 0;
      const newClaimRecords: Array<{ userId: string; achievementId: string }> = [];

      for (const list of Object.values(ACHIEVEMENTS) as any[]) {
        for (const ach of list) {
          if (ach.check(user) && !claimedSet.has(ach.id)) {
            rewardCashSum += (ach.rewardCash || 5000);
            rewardTokenSum += (ach.rewardTokens || 0);
            newClaimRecords.push({ userId: interaction.user.id, achievementId: ach.id });
          }
        }
      }

      if (newClaimRecords.length > 0) {
        await safeTransaction(async () => {
          await prisma.user.update({
            where: { id: interaction.user.id },
            data: {
              money: { increment: rewardCashSum },
              prestigeTokens: { increment: rewardTokenSum }
            }
          });
          await prisma.userAchievement.createMany({
            data: newClaimRecords
          });
        });

        const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
        const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
        let toastText = `🎉 **Claimed ${newClaimRecords.length} Achievements!** Received ${e('cash')} **+$${rewardCashSum.toLocaleString()} Cash**`;
        if (rewardTokenSum > 0) {
          toastText += ` & ${e('gem')} **+${rewardTokenSum} Prestige Tokens**!`;
        }
        successContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(toastText));
        await interaction.followUp({
          components: [successContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }
    }

    await interaction.deferUpdate();
    const payload = await buildAchievementsMessage(interaction.user.id, tabName);
    await interaction.editReply({
      components: payload.components,
      files: payload.files
    });
  } catch (error) {
    console.error('Error handling achievements button:', error);
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} An error occurred while updating achievements.`)
    );
    await interaction.followUp({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
