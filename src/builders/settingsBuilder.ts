import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';

export async function buildSettingsMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { stands: true }
  });

  if (!user) throw new Error('User not found');

  const container = new ContainerBuilder().setAccentColor(0x7F00FF);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${e('gear')} ScoopSim Settings\n` +
      `Customize your Ice Cream Stand preferences.\n\n` +
      `• **DM Notifications**: ${user.notifyEmpty ? `${e('dot_green')} Enabled (Receive alerts when stock/cleanliness runs out)` : `${e('dot_red')} Disabled`}\n` +
      `• **Stands Owned**: ${user.stands.length} stands`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`settings:toggle_notify:${userId}`)
      .setLabel(user.notifyEmpty ? 'Disable DM Alerts' : 'Enable DM Alerts')
      .setEmoji(user.notifyEmpty ? e('dot_red') : e('dot_green'))
      .setStyle(user.notifyEmpty ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`settings:rename_btn`)
      .setLabel('Rename Active Stand')
      .setEmoji(e('pencil'))
      .setStyle(ButtonStyle.Primary)
      .setDisabled(user.stands.length === 0)
  );

  container.addActionRowComponents(row);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}
