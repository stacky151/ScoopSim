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

export async function buildLeaderboardMessage(userId: string, activeType: string = 'money', scope: string = 'global', guildId?: string) {
  const caller = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!caller) {
    throw new Error('User not found');
  }

  let sortField: 'money' | 'level' | 'rebirths' = 'money';
  let categoryTitle = `${e('cash')} Cash Barons`;
  let formatValue = (val: number) => `$${val.toLocaleString()}`;

  if (activeType === 'level') {
    sortField = 'level';
    categoryTitle = `${e('star')} Level Leaders`;
    formatValue = (val: number) => `Level ${val}`;
  } else if (activeType === 'rebirths') {
    sortField = 'rebirths';
    categoryTitle = `${e('sparkles')} Rebirth Legends`;
    formatValue = (val: number) => `${val} Rebirths`;
  }

  const scopeTitle = scope === 'server' ? '🏰 Server Local' : '🌐 Global Network';
  let whereCondition: any = {};
  if (scope === 'server' && guildId) {
    whereCondition = {
      guildMember: { guildId }
    };
  }

  let topUsers = await prisma.user.findMany({
    where: whereCondition,
    orderBy: { [sortField]: 'desc' },
    take: 10
  });

  if (scope === 'server' && topUsers.length === 0) {
    topUsers = await prisma.user.findMany({
      orderBy: { [sortField]: 'desc' },
      take: 10
    });
  }

  const callerValue = caller[sortField];
  const callerRank = await prisma.user.count({
    where: {
      ...whereCondition,
      [sortField]: { gt: callerValue }
    }
  }) + 1;

  let leaderboardText = `# 🏆 ScoopSim Leaderboards — ${categoryTitle} (${scopeTitle})\n\n`;

  const medals = ['🥇', '🥈', '🥉'];
  topUsers.forEach((usr, idx) => {
    const medal = medals[idx] || `**#${idx + 1}**`;
    const valText = formatValue(usr[sortField]);
    leaderboardText += `${medal} <@${usr.id}> • **${valText}** (Level ${usr.level})\n`;
  });

  if (topUsers.length === 0) {
    leaderboardText += '*No rankings available yet.*';
  }

  const container = new ContainerBuilder().setAccentColor(0xFFD700);

  const files: any[] = [];
  const bannerPath = path.join(__dirname, '../../assets/banners/leaderboard_banner.jpg');
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'leaderboard_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://leaderboard_banner.jpg')
      )
    );
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(leaderboardText));

  const isInTop10 = topUsers.some(usr => usr.id === userId);
  if (!isInTop10) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    const callerValText = formatValue(callerValue);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ⭐ Your Personal Rank (${scopeTitle})\n` +
        `• Rank Position: **#${callerRank}**\n` +
        `• Your Stats: **${callerValText}**`
      )
    );
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const tabRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`leaderboard:type:money:${scope}:${userId}`)
      .setLabel('Cash Barons')
      .setEmoji(e('cash'))
      .setStyle(activeType === 'money' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`leaderboard:type:level:${scope}:${userId}`)
      .setLabel('Level Leaders')
      .setEmoji(e('star'))
      .setStyle(activeType === 'level' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`leaderboard:type:rebirths:${scope}:${userId}`)
      .setLabel('Rebirth Legends')
      .setEmoji(e('sparkles'))
      .setStyle(activeType === 'rebirths' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const scopeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`leaderboard:scope:global:${activeType}:${userId}`)
      .setLabel('🌐 Global Leaderboard')
      .setStyle(scope === 'global' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`leaderboard:scope:server:${activeType}:${userId}`)
      .setLabel('🏰 Server Leaderboard')
      .setStyle(scope === 'server' ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  container.addActionRowComponents(tabRow);
  container.addActionRowComponents(scopeRow);

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top ice cream barons in ScoopSim!')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('The category to display')
        .setRequired(false)
        .addChoices(
          { name: '💰 Cash / Money', value: 'money' },
          { name: '⭐ Level', value: 'level' },
          { name: '🌟 Rebirths', value: 'rebirths' }
        )
    )
    .addStringOption(option =>
      option.setName('scope')
        .setDescription('The scope of rankings to view')
        .setRequired(false)
        .addChoices(
          { name: '🌐 Global Network', value: 'global' },
          { name: '🏰 Server Local', value: 'server' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const type = interaction.options.getString('type') || 'money';
    const scope = interaction.options.getString('scope') || 'global';

    const caller = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!caller) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} You need to set up your ice cream stand first! Run \`/start\` to begin.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const payload = await buildLeaderboardMessage(userId, type, scope, interaction.guildId || undefined);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
