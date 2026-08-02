import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { getActiveGlobalEvent } from '../utils/eventEngine';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('View the active World Ice Cream Expo global event & milestones!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const container = new ContainerBuilder().setAccentColor(0xFFD700);

    const bannerPath = path.join(__dirname, '../../assets/banners/event_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'event_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://event_banner.jpg')
        )
      );
    }

    const event = await getActiveGlobalEvent();

    const pct = Math.min(100, Math.floor((event.currentScoops / event.targetScoops) * 100));
    const filled = Math.round(pct / 10);
    const empty = 10 - filled;
    const progressBar = '🟨'.repeat(filled) + '⬛'.repeat(empty) + ` **${pct}%** (${event.currentScoops.toLocaleString()}/${event.targetScoops.toLocaleString()} Scoops)`;

    const endsTimestamp = Math.floor(event.endsAt.getTime() / 1000);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🎪 ${event.title}\n` +
        `*${event.description}*\n\n` +
        `### 📊 Global Milestone Progress\n` +
        progressBar + `\n\n` +
        `• **Event Status**: ${event.isCompleted ? '🎉 **GOAL COMPLETED! Global +100% Cash Boost Active!**' : '🔥 **IN PROGRESS**'}\n` +
        `• **Event Ends**: <t:${endsTimestamp}:R>\n\n` +
        `### 🏆 Global Reward Tier\n` +
        `• **Milestone Target**: Serve 500,000 scoops globally across all stands.\n` +
        `• **Reward**: Unlocks **+100% Cash Sales Multiplier** for all ScoopSim players worldwide for 48 hours!`
      )
    );

    await interaction.reply({
      components: [container],
      files: files,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
