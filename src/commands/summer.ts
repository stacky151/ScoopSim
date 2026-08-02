import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../index';
import { safeTransaction } from '../utils/dbTransaction';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('summer')
    .setDescription('Top.gg Summer Bot Jam 2026 Event: Summer Boardwalk Festival!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const bannerPath = path.join(process.cwd(), 'assets', 'branding', 'summer_banner.jpg');
    const files: AttachmentBuilder[] = [];

    const container = new ContainerBuilder().setAccentColor(0xF1C40F);

    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'summer_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL('attachment://summer_banner.jpg')
            .setDescription('Top.gg Summer Bot Jam 2026 - Summer Boardwalk Festival')
        )
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ☀️ TOP.GG SUMMER BOT JAM 2026 — BOARDWALK FESTIVAL\n` +
        `Welcome to the official **Summer Bot Jam 2026 Celebration**! ScoopShack is celebrating the ultimate summer season with exclusive heatwave boosts, tropical flavors, and festival rewards!\n\n` +
        `### 🍧 Summer Jam 2026 Special Features\n` +
        `• 🥭 **Tropical Flavor Unlocks**: Mango Sorbet & Watermelon Splash available in \`/shop\`!\n` +
        `• 🏖️ **Sunny Beach Boardwalk Location**: Unlock the exclusive beachside stand in \`/map\`!\n` +
        `• ☀️ **Summer Heatwave Boost**: +100% Cash sales surge on all fruit scoops during sunny weather!\n` +
        `• 🎁 **Summer Starter Gift**: Claim your free $10,000 Summer Cash & 3 Prestige Tokens below!\n\n` +
        `-# Built exclusively for Top.gg Summer Bot Jam 2026.`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`summer:claim:${userId}`)
        .setLabel('☀️ Claim $10,000 Summer Festival Pack')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setLabel('💬 Join Official ScoopShack Discord')
        .setURL('https://discord.gg/WJnDk43hw3')
        .setStyle(ButtonStyle.Link)
    );

    container.addActionRowComponents(buttonRow);

    return interaction.reply({
      components: [container],
      files,
      flags: MessageFlags.IsComponentsV2 as any
    });
  }
};
