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

const CATEGORY_CONFIG: Record<string, { label: string; color: number; icon: string }> = {
  update:     { label: 'General Update',  color: 0x5865F2, icon: e('gear') },
  bug_fix:    { label: 'Bug Fix',         color: 0xED4245, icon: e('broom') },
  big_update: { label: 'Major Update',    color: 0xFFD700, icon: e('star') },
};

export default {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('View the latest ScoopSim update notes and patch history.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const logs = await prisma.changelog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    const bannerPath = path.join(__dirname, '../../assets/banners/changelog_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'changelog_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://changelog_banner.jpg')
        )
      );
    }

    if (logs.length === 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${e('clipboard')} ScoopSim Changelog\n` +
          `No updates have been posted yet. Check back soon!`
        )
      );
    } else {
      const latestId = logs[0]!.id;
      const hasUnread = user && user.lastReadChangelogId !== latestId;

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${e('clipboard')} ScoopSim Changelog${hasUnread ? `  ${e('dot_red')} **NEW**` : ''}\n` +
          `Latest updates and patch notes for ScoopSim.`
        )
      );

      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

      for (const log of logs) {
        const cfg = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG['update']!;
        const dateStr = new Date(log.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        const isNew = hasUnread && log.id === latestId ? ` ${e('dot_red')} **NEW**` : '';

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### ${cfg.icon} ${log.title}${isNew}\n` +
            `-# ${cfg.label} • ${dateStr}\n` +
            log.description
          )
        );

        container.addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        );
      }
    }

    const latestLog = logs[0];
    const hasUnread = user && latestLog && user.lastReadChangelogId !== latestLog.id;

    const row = new ActionRowBuilder<ButtonBuilder>();
    if (hasUnread && latestLog) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`changelog:ack:${latestLog.id}`)
          .setLabel('Mark as Read')
          .setEmoji(e('check_green'))
          .setStyle(ButtonStyle.Success)
      );
    }
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('changelog:cat:update:0')
        .setLabel('Updates')
        .setEmoji(e('gear'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('changelog:cat:bug_fix:0')
        .setLabel('Bug Fixes')
        .setEmoji(e('broom'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('changelog:cat:big_update:0')
        .setLabel('Major Updates')
        .setEmoji(e('star'))
        .setStyle(ButtonStyle.Secondary)
    );

    if (row.components.length > 0) {
      container.addActionRowComponents(row);
    }

    await interaction.reply({
      components: [container],
      files: files,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  },
};
