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
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Vote for ScoopShack on Discord bot lists to unlock double cash boosts!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    const bannerPath = path.join(__dirname, '../../assets/banners/vote_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'vote_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://vote_banner.jpg')
        )
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🗳️ Support ScoopShack & Claim Vote Boosts!\n` +
        `Help grow the ScoopShack community by voting on Top.gg and Discord bot lists. Every vote supports future game updates and rewards your empire with exclusive buffs!\n\n` +
        `### 🎁 Vote Reward Perks\n` +
        `• ⚡ **12-Hour Double Cash Boost** (+100% sales payouts across all stands).\n` +
        `• 💎 **+3 Bonus Prestige Tokens** delivered instantly.\n` +
        `• 💵 **$2,500 Cash Bonus** to your wallet.\n\n` +
        `*Click the button below to visit the official voting page! Rewards will automatically activate once Top.gg integration is live.*`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const voteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Vote on Top.gg (Coming Soon)')
        .setEmoji('🗳️')
        .setStyle(ButtonStyle.Link)
        .setURL('https://top.gg')
    );

    container.addActionRowComponents(voteRow);

    await interaction.reply({
      components: [container],
      files: files,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
