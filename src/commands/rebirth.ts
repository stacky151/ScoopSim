import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { prisma } from '../index';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('rebirth')
    .setDescription('Rebirth your ice cream empire for permanent bonuses!'),
  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} Run \`/start\` to begin your empire first.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const { isOverseer, getOverseerFooter } = require('../constants/overseer');
    const isOverseerUser = isOverseer(userId);
    const rebirthLevelRequired = 15;

    if (!isOverseerUser && user.level < rebirthLevelRequired) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} **Cannot Rebirth yet!** You must reach level **${rebirthLevelRequired}** (Current: **${user.level}**).`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const nextRebirth = user.rebirths + 1;
    const bonusMultiplier = (1 + nextRebirth * 0.5).toFixed(1);
    const bonusPct = nextRebirth * 50;

    const container = new ContainerBuilder().setAccentColor(0xF59E0B);

    const bannerPath = path.join(__dirname, '../../assets/banners/rebirth_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'rebirth_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://rebirth_banner.jpg')
        )
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${e('star')} Rebirth Your Ice Cream Empire!\n` +
        `You have achieved legendary status at level **${user.level}**!\n` +
        `Ready to reset and rebuild with corporate advantages?\n\n` +
        `**Rebirth #${nextRebirth} will:**\n` +
        `• Reset your Cash to **$100**.\n` +
        `• Reset your Level to **1**.\n` +
        `• Reset your current stand and refills.\n` +
        `• Give you a permanent **+50%** earnings multiplier (Total: **${bonusMultiplier}x**!).\n` +
        `• Allow you to expand into new countries like Italy and Japan.\n\n` +
        `${e('warning')} *All permanent Equipment Upgrades in your inventory will be preserved!*\n\n` +
        `-# This action is irreversible.`
      )
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`rebirth:confirm:${userId}`)
        .setLabel('Confirm Rebirth')
        .setEmoji(e('star'))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rebirth:cancel')
        .setLabel('Cancel')
        .setEmoji(e('cross_red'))
        .setStyle(ButtonStyle.Secondary)
    );

    container.addActionRowComponents(row);

    await interaction.reply({
      components: [container],
      files: files,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
};
