import { ButtonInteraction, ModalSubmitInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';

export async function handlePostUpdateModal(interaction: ModalSubmitInteraction, parts: string[]) {
  const category = parts[1];
  if (!category) return;

  const title = interaction.fields.getTextInputValue('title');
  const description = interaction.fields.getTextInputValue('description');

  try {
    const log = await safeTransaction(async () => {
      return prisma.changelog.create({
        data: {
          title,
          description,
          category,
        },
      });
    });

    const container = new ContainerBuilder().setAccentColor(0x2E7D32);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${e('check_green')} Update Broadcast Published\n` +
        `The update log has been successfully saved to the database and published.\n\n` +
        `**Title**: ${title}\n` +
        `**Category**: \`${category}\`\n` +
        `**Broadcast ID**: \`${log.id}\``
      )
    );

    await interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
    });
  } catch (error) {
    console.error('Error posting update changelog:', error);
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to publish the update. Error: ${(error as Error).message}`)
    );
    await interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
    });
  }
}

export async function handleChangelogButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  if (action === 'ack') {
    const logId = parts[2];
    if (!logId) return;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${e('cross_red')} You must run \`/start\` first to register your profile.`)
        );
        return interaction.reply({
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
        });
      }

      await safeTransaction(async () => {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastReadChangelogId: logId,
          },
        });
      });

      const container = new ContainerBuilder().setAccentColor(0x2E7D32);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${e('check_green')} Broadcast Acknowledged\n` +
          `Thank you. Updates acknowledged. You may now continue using all systems and commands.`
        )
      );

      await interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
    } catch (error) {
      console.error('Error acknowledging changelog:', error);
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to process acknowledgment. Error: ${(error as Error).message}`)
      );
      await interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
    }
  } else if (action === 'cat') {
    const category = parts[2];
    const page = parseInt(parts[3] || '0', 10);
    if (!category) return;

    await interaction.deferUpdate();

    try {
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

      const { buildChangelogCategoryMessage } = require('../builders/openstandBuilder');
      const payload = await buildChangelogCategoryMessage(userId, category, page);
      await interaction.editReply(payload as any);
    } catch (error) {
      console.error('Error loading changelog category:', error);
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to load category archives. Error: ${(error as Error).message}`)
      );
      await interaction.followUp({
        components: [container],
        ephemeral: true
      });
    }
  }
}
