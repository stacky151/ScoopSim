import { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags } from 'discord.js';
import * as path from 'path';
import { e } from '../constants/emojis';

interface ChangelogData {
  id: string;
  title: string;
  description: string;
  category: string;
}

export function buildChangelogAlertMessage(changelog: ChangelogData) {
  const bannerPath = path.join(__dirname, '../../assets/changelog_banner.png');
  const attachment = new AttachmentBuilder(bannerPath, { name: 'changelog_banner.png' });

  const container = new ContainerBuilder().setAccentColor(0xFFD700);

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('attachment://changelog_banner.png').setDescription('ScoopShack Update Broadcast')
    )
  );

  const categoryEmojis: Record<string, string> = {
    update: e('gear'),
    bug_fix: e('broom'),
    big_update: e('star'),
  };

  const categoryLabels: Record<string, string> = {
    update: 'System Update',
    bug_fix: 'Bug Fixes',
    big_update: 'Major Expansion',
  };

  const emoji = categoryEmojis[changelog.category] || e('warning');
  const label = categoryLabels[changelog.category] || 'General Update';

  const text = `# ${emoji} ${changelog.title}\n` +
    `**Category**: ${label}\n\n` +
    `${changelog.description}\n\n` +
    `-# ${e('warning')} Please acknowledge these changes to resume normal operations.`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`changelog:ack:${changelog.id}`)
      .setLabel('Acknowledge & Resume')
      .setEmoji(e('check_green'))
      .setStyle(ButtonStyle.Success)
  );

  container.addActionRowComponents(row);

  return {
    components: [container],
    files: [attachment],
    flags: MessageFlags.IsComponentsV2 as any
  };
}
