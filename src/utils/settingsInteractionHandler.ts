import { ButtonInteraction, ModalSubmitInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildSettingsMessage } from '../builders/settingsBuilder';

export async function handleSettingsButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  if (action === 'disable_notify') {
    await interaction.deferUpdate();
    try {
      await safeTransaction(async () => {
        await prisma.user.update({
          where: { id: userId },
          data: { notifyEmpty: false }
        });
      });

      const container = new ContainerBuilder().setAccentColor(0x22C55E);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${e('warning')} Ice Cream Stand Alert\n` +
          `${e('check_green')} **Out-of-service DM notifications have been disabled!**\n\n` +
          `You will no longer receive DM alerts when your stand goes out of service.`
        )
      );

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 as any
      } as any);
    } catch (error) {
      console.error('Error disabling settings notification:', error);
      const errContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to update your notification settings. Please try again.`)
      );
      await interaction.followUp({
        components: [errContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      } as any);
    }
  }

  if (action === 'toggle_notify') {
    await interaction.deferUpdate();
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const newNotifyState = !user.notifyEmpty;
      await safeTransaction(async () => {
        await prisma.user.update({
          where: { id: userId },
          data: { notifyEmpty: newNotifyState }
        });
      });

      const payload = await buildSettingsMessage(userId);
      await interaction.editReply(payload as any);
    } catch (error) {
      console.error('Error toggling settings notification:', error);
    }
  }

  if (action === 'rename_btn') {
    const modal = new ModalBuilder()
      .setCustomId('settings:modal_rename')
      .setTitle('Rename Active Stand');

    const nameInput = new TextInputBuilder()
      .setCustomId('new_name')
      .setLabel("What is your stand's new name?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., Sundae Palace')
      .setRequired(true)
      .setMaxLength(30);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }
}

export async function handleSettingsModal(interaction: ModalSubmitInteraction, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    const standName = interaction.fields.getTextInputValue('new_name');
    const stands = await prisma.iceCreamStand.findMany({
      where: { userId },
      orderBy: { lastUpdated: 'desc' }
    });

    if (stands.length === 0) {
      const errContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} You do not have any ice cream stands to rename.`));
      return interaction.followUp({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }

    const standToRename = stands[0]!;

    await safeTransaction(async () => {
      await prisma.iceCreamStand.update({
        where: { id: standToRename.id },
        data: { name: standName }
      });
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('check_green')} Stand successfully renamed to **"${standName}"**!`)
    );
    await interaction.followUp({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });

  } catch (error) {
    console.error('Error in settings modal rename:', error);
    const errContainer = new ContainerBuilder().setAccentColor(0xED4245);
    errContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} An error occurred while renaming your stand.`));
    await interaction.followUp({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
  }
}
