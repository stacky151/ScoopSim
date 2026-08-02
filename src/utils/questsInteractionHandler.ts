import { ButtonInteraction } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildQuestsMessage } from '../commands/quests';

export async function handleQuestsButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const questId = parts[2];
  const userId = interaction.user.id;

  if (action !== 'claim' || !questId) {
    return replyV2(interaction, `${e('cross_red')} Invalid quest action.`, 0xED4245);
  }

  await interaction.deferUpdate();

  try {
    const quest = await prisma.userQuest.findUnique({
      where: { id: questId }
    });

    if (!quest || quest.userId !== userId) {
      return replyV2(interaction, `${e('cross_red')} Quest record not found.`, 0xED4245);
    }

    if (quest.completed) {
      return replyV2(interaction, `${e('cross_red')} You have already claimed this quest reward!`, 0xED4245);
    }

    if (quest.progress < quest.target) {
      return replyV2(interaction, `${e('cross_red')} You have not completed this quest yet!`, 0xED4245);
    }

    let didLevelUp = false;
    let newLevel = 0;
    await safeTransaction(async () => {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            money: { increment: quest.rewardMoney },
            prestigeTokens: { increment: quest.rewardTokens || 0 }
          }
        });

        const user = await tx.user.findUnique({ where: { id: userId } });
        if (user) {
          const expGain = 50;
          let newExp = user.exp + expGain;
          let currentLevel = user.level;
          let expNeeded = currentLevel * 100;
          while (newExp >= expNeeded) {
            newExp -= expNeeded;
            currentLevel++;
            expNeeded = currentLevel * 100;
            didLevelUp = true;
          }
          newLevel = currentLevel;
          await tx.user.update({
            where: { id: userId },
            data: { exp: newExp, level: currentLevel }
          });
        }

        await tx.userQuest.update({
          where: { id: questId },
          data: { completed: true }
        });
      });
    });

    const claimMsg = didLevelUp
      ? `${e('gift')} Claimed Quest reward! **+$${quest.rewardMoney}**${quest.rewardTokens > 0 ? ` and **+${quest.rewardTokens}** Prestige Tokens` : ''} added. ${e('star')} **LEVEL UP!** You are now **Level ${newLevel}**!`
      : `${e('gift')} Claimed Quest reward! Added **+$${quest.rewardMoney}**${quest.rewardTokens > 0 ? ` and **+${quest.rewardTokens}** Prestige Tokens` : ''} to your wallet.`;
    await replyV2(interaction, claimMsg, 0x48BB78);

    const payload = await buildQuestsMessage(userId);
    await interaction.editReply(payload as any);

  } catch (error) {
    console.error('Error claiming quest reward:', error);
    await replyV2(interaction, `${e('cross_red')} An error occurred while claiming your reward.`, 0xED4245);
  }
}

async function replyV2(interaction: any, text: string, color: number) {
  const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return interaction.followUp({
    components: [container],
    flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
  });
}
