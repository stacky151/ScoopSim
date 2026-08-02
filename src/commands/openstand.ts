import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';
import { buildMapHubMessage } from '../builders/openstandBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('openstand')
    .setDescription('Open the Global Map Hub to manage your ice cream stands!'),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    await interaction.deferReply();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('scoop')} You do not have any ice cream stands yet! Run \`/start\` to establish your first stand.`));
      return interaction.editReply({ components: [container] } as any);
    }

    try {
      const payload = await buildMapHubMessage(userId);
      await interaction.editReply({
        components: payload.components,
        files: payload.files,
        flags: payload.flags
      } as any);
    } catch (error) {
      console.error('Error generating map hub:', error);
      const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to load the map hub. Please try again.`));
      await interaction.editReply({ components: [container] } as any);
    }
  }
};
