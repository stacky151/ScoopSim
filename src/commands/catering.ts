import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { prisma } from '../index';
import { e } from '../constants/emojis';
import { CATERING_CONTRACTS } from '../utils/cateringEngine';

export async function buildCateringViewMessage(userId: string) {
  const container = new ContainerBuilder().setAccentColor(0xF1C40F);

  const bannerPath = path.join(__dirname, '../../assets/banners/catering_banner.jpg');
  const files: any[] = [];
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'catering_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://catering_banner.jpg')
      )
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🚧 Mobile Catering & Events Studio — UNDER CONSTRUCTION\n` +
      `🔒 **Status**: *Feature Temporarily Locked for Maintenance & Q3 Expansion*\n\n` +
      `### 🚚 What's Coming Soon to \`/catering\`:\n` +
      `• 🚚 **Mobile Catering Truck Fleet**: Purchase, upgrade, and dispatch custom catering trucks across 15 countries.\n` +
      `• 📜 **High-Stakes B2B Contracts**: Supply weddings, beach festivals, and corporate headquarters for massive cash payouts.\n` +
      `• 🏰 **Guild Catering Operations**: Team up with your guild members to fulfill massive 10,000-scoop event orders for shared guild vault rewards!\n` +
      `• ⭐ **Exclusive Event Pass XP**: Earn rare catering trophies and bonus prestige tokens.\n\n` +
      `-# Feature will unlock automatically in the upcoming update. Join our official Discord hub for announcements!`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`catering:locked:${userId}`)
      .setLabel('Under Construction')
      .setEmoji('🚧')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setLabel('Join Discord Hub')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.gg/WJnDk43hw3')
  );

  container.addActionRowComponents(buttonRow);

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('catering')
    .setDescription('Mobile catering & corporate contracts studio (Under Construction).'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const payload = await buildCateringViewMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral,
    });
  },
};
