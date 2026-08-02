import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { e } from '../constants/emojis';
import { claimDailyReward, spinFortuneWheel } from './dailyEngine';
import { buildDailyMessage } from '../commands/daily';

export async function handleDailyButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const targetUserId = parts[2];
  const userId = interaction.user.id;

  if (targetUserId && userId !== targetUserId) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your daily reward menu!`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
    });
  }

  try {
    if (action === 'claim') {
      const { totalCash, bonusTokens, newStreak } = await claimDailyReward(userId);
      const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
      let text = `🎉 **Daily Reward Claimed!** Received ${e('cash')} **+$${totalCash.toLocaleString()}** cash! (Streak: 🔥 **${newStreak} Days**)`;
      if (bonusTokens > 0) {
        text += `\n🌟 **7-Day Milestone Reward!** Received ${e('gem')} **+${bonusTokens} Bonus Prestige Tokens**!`;
      }
      successContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
      await interaction.followUp({
        components: [successContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
    } else if (action === 'spin_wheel') {
      const { prizeLabel, prizeEmoji } = await spinFortuneWheel(userId);
      const successContainer = new ContainerBuilder().setAccentColor(0x9B59B6);
      successContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🎡 **Fortune Wheel Stopped!** You won ${prizeEmoji} **${prizeLabel}**!`)
      );
      await interaction.followUp({
        components: [successContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
    }

    await interaction.deferUpdate();
    const payload = await buildDailyMessage(userId);
    await interaction.editReply({
      components: payload.components,
      files: payload.files,
    });
  } catch (error: any) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} ${error.message || 'Daily interaction error.'}`)
    );
    await interaction.followUp({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
    });
  }
}
