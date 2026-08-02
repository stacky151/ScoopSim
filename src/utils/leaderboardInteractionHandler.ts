import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { e } from '../constants/emojis';
import { buildLeaderboardMessage } from '../commands/leaderboard';

export async function handleLeaderboardButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  let category = 'money';
  let scope = 'global';
  let targetUserId = parts[parts.length - 1];

  if (action === 'type') {
    category = parts[2] || 'money';
    scope = parts[3] || 'global';
  } else if (action === 'scope') {
    scope = parts[2] || 'global';
    category = parts[3] || 'money';
  } else {
    category = parts[1] || 'money';
  }

  const userId = interaction.user.id;

  if (targetUserId && userId !== targetUserId) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your leaderboard menu!`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  try {
    await interaction.deferUpdate();
    const payload = await buildLeaderboardMessage(userId, category, scope, interaction.guildId || undefined);
    await interaction.editReply({
      components: payload.components,
      files: payload.files
    });
  } catch (error) {
    console.error('Error handling leaderboard button:', error);
  }
}
