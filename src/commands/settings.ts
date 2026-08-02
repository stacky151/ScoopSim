import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';
import { buildSettingsMessage } from '../builders/settingsBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure your ScoopSim notifications and customize your stand!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} You need to set up your ice cream stand first! Run \`/start\` to begin.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const payload = await buildSettingsMessage(userId);
    await interaction.reply({
      components: payload.components,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
