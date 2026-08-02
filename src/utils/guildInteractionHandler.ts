import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { e } from '../constants/emojis';
import { depositToVault, upgradePerk } from './guildEngine';
import { buildGuildViewMessage } from '../commands/guild';

export async function handleGuildButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const targetUserId = parts[2];
  const userId = interaction.user.id;

  if (targetUserId && userId !== targetUserId) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your guild menu!`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  try {
    if (action === 'deposit_500') {
      await depositToVault(userId, 500);
    } else if (action === 'deposit_2500') {
      await depositToVault(userId, 2500);
    } else if (action === 'upgrade_perk') {
      await upgradePerk(userId, 'global_mult');
    } else if (action === 'prompt_create') {
      const container = new ContainerBuilder().setAccentColor(0x3B82F6);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### 👑 Establish a Franchise Guild\n` +
          `To create your guild, run:\n` +
          `\`\`\`\n/guild create name:YourGuildName tag:TAG\n\`\`\`\n` +
          `*Example: \`/guild create name:Artisan Gelato tag:GEL\`*`
        )
      );
      return interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    await interaction.deferUpdate();
    const payload = await buildGuildViewMessage(userId);
    await interaction.editReply({
      components: payload.components,
      files: payload.files
    });
  } catch (error: any) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} ${error.message || 'Guild interaction error.'}`)
    );
    await interaction.followUp({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
