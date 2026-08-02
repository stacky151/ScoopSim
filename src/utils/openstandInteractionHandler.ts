import { ButtonInteraction } from 'discord.js';
import { safeTransaction } from './dbTransaction';
import { buildCountryStandsMessage, buildMapHubMessage } from '../builders/openstandBuilder';
import { e } from '../constants/emojis';

export async function handleOpenStandButton(interaction: any, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate().catch(() => {});
  }

  try {
    if (action === 'country' || action === 'select_country') {
      const country = interaction.isStringSelectMenu() ? interaction.values[0] : parts[2];
      if (!country) return;

      const payload = await buildCountryStandsMessage(userId, country);
      await interaction.editReply(payload as any);
    } else if (action === 'changelog') {
      const { buildChangelogMessage } = require('../builders/openstandBuilder');
      const payload = await buildChangelogMessage(userId);
      await interaction.editReply({
        components: payload.components,
        files: [],
        attachments: []
      } as any);
    } else if (action === 'back_to_hub') {
      const { prisma } = require('../index');
      const latestChangelog = await prisma.changelog.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      if (latestChangelog) {
        await safeTransaction(async () => {
          await prisma.user.update({
            where: { id: userId },
            data: { lastReadChangelogId: latestChangelog.id }
          });
        });
      }

      const payload = await buildMapHubMessage(userId);
      await interaction.editReply({
        components: payload.components,
        files: payload.files,
        attachments: []
      } as any);
    }
  } catch (error) {
    console.error('Error handling openstand button:', error);
    const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to route this map selection.`));
    await interaction.followUp({ components: [container], ephemeral: true });
  }
}
