import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';
import { buildShopMessage } from '../builders/shopBuilder';

export default {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse and purchase ingredients, containers, upgrades, and hiring services.'),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} You need to set up your ice cream stand first! Run \`/start\` to begin.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const payload = await buildShopMessage(userId, 'food');
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: (payload.flags | MessageFlags.Ephemeral) as any
    } as any);
  }
};
