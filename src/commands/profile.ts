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
import { e, getWorkerEmoji } from '../constants/emojis';

function getXpToNextLevel(level: number): number {
  return level * 100;
}

function getLevelColor(level: number): string {
  if (level <= 5) return '🟥';
  if (level <= 10) return '🟧';
  if (level <= 15) return '🟨';
  if (level <= 20) return '🟩';
  if (level <= 25) return '🟦';
  return '🟪';
}

function buildExpBar(level: number, exp: number, expNeeded: number): string {
  const pct = Math.min(100, Math.floor((exp / expNeeded) * 100));
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const color = getLevelColor(level);
  const bar = color.repeat(filled) + '⬛'.repeat(empty);
  return `${bar} **${pct}%** (${exp}/${expNeeded} EXP)`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your ScoopSim profile and empire stats.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('View another player\'s profile (optional)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userId = targetUser.id;
    const isSelf = targetUser.id === interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stands: {
          include: { batches: true }
        },
        workers: true,
        inventory: {
          include: { item: true }
        }
      }
    });

    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          isSelf
            ? `${e('scoop')} You haven't started yet! Run \`/start\` to build your ice cream empire.`
            : `${e('cross_red')} That player hasn't started their empire yet.`
        )
      );
      return interaction.reply({
        components: [errorContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const totalStands = user.stands.length;
    const totalUnclaimed = user.stands.reduce((sum, s) => sum + s.unclaimedMoney, 0);
    const netWorth = user.money + totalUnclaimed;
    const hasManager = user.workers.some(w => w.type === 'manager');
    const total24Open = hasManager ? totalStands : user.stands.filter(s => s.isActive).length;

    const container = new ContainerBuilder().setAccentColor(0x8B5CF6);

    const bannerPath = path.join(__dirname, '../../assets/banners/profile_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'profile_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://profile_banner.jpg')
        )
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${e('scoop')} ${targetUser.displayName}'s Profile\n\n` +
        `• ${e('star')} **Level**: Level ${user.level}\n` +
        `• ${e('wallet')} **Net Worth**: $${netWorth.toLocaleString()}\n` +
        `• ${e('store')} **Total Stands Open**: ${totalStands} Stands\n` +
        `• ${e('tie')} **Total 24/7 Open**: ${total24Open} Stands`
      )
    );

    if (isSelf) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('profile:open_quests')
          .setLabel('Daily Quests')
          .setEmoji(e('clipboard'))
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('profile:open_shop')
          .setLabel('Shop')
          .setEmoji(e('store'))
          .setStyle(ButtonStyle.Secondary)
      );
      container.addActionRowComponents(row);
    }

    await interaction.reply({
      components: [container],
      files: files,
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
};
