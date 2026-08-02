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

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  rewardCash?: number;
  rewardTokens?: number;
  check: (user: any) => boolean;
  progressText: (user: any) => string;
}

export const ACHIEVEMENTS: Record<string, Achievement[]> = {
  empire: [
    {
      id: 'first_stand',
      name: '🍦 Start of something Sweet',
      desc: 'Establish your first ice cream stand.',
      check: (u) => u.stands.length >= 1,
      progressText: (u) => `${Math.min(1, u.stands.length)}/1 Stands`,
    },
    {
      id: 'franchise_owner',
      name: '🏪 Gelato Franchise',
      desc: 'Establish 3 stands across the globe.',
      check: (u) => u.stands.length >= 3,
      progressText: (u) => `${Math.min(3, u.stands.length)}/3 Stands`,
    },
    {
      id: 'global_empire',
      name: '🌍 Ice Cream Overlord',
      desc: 'Establish 5 stands across the globe.',
      check: (u) => u.stands.length >= 5,
      progressText: (u) => `${Math.min(5, u.stands.length)}/5 Stands`,
    },
    {
      id: 'level_5',
      name: '⭐ Scoop Scout',
      desc: 'Reach user Level 5.',
      check: (u) => u.level >= 5,
      progressText: (u) => `Level ${u.level}/5`,
    },
    {
      id: 'level_15',
      name: '🏆 Gelato Specialist',
      desc: 'Reach user Level 15.',
      check: (u) => u.level >= 15,
      progressText: (u) => `Level ${u.level}/15`,
    },
    {
      id: 'level_30',
      name: '👑 Empire Builder',
      desc: 'Reach user Level 30.',
      check: (u) => u.level >= 30,
      progressText: (u) => `Level ${u.level}/30`,
    },
    {
      id: 'rebirth_1',
      name: '💫 Fresh Start',
      desc: 'Rebirth your empire for the first time.',
      check: (u) => u.rebirths >= 1,
      progressText: (u) => `${u.rebirths}/1 Rebirths`,
    },
    {
      id: 'rebirth_5',
      name: '🌟 Rebirth Master',
      desc: 'Rebirth your empire 5 times.',
      check: (u) => u.rebirths >= 5,
      progressText: (u) => `${u.rebirths}/5 Rebirths`,
    },
    {
      id: 'prestige_1',
      name: '💎 Prestige Elite',
      desc: 'Prestige your empire and earn Prestige Tokens.',
      check: (u) => u.prestigeTokens > 0 || u.prestigeUpgrades.length > 0,
      progressText: (u) => (u.prestigeTokens > 0 || u.prestigeUpgrades.length > 0 ? '1/1 Unlocked' : '0/1 Unlocked'),
    },
  ],
  economy: [
    {
      id: 'cash_1k',
      name: '💵 First Thousand',
      desc: 'Accumulate $1,000 cash in your wallet.',
      check: (u) => u.money >= 1000,
      progressText: (u) => `$${u.money.toLocaleString()}/$1,000`,
    },
    {
      id: 'cash_10k',
      name: '💰 Thriving Business',
      desc: 'Accumulate $10,000 cash in your wallet.',
      check: (u) => u.money >= 10000,
      progressText: (u) => `$${u.money.toLocaleString()}/$10,000`,
    },
    {
      id: 'cash_100k',
      name: '💳 Scoop Tycoon',
      desc: 'Accumulate $100,000 cash in your wallet.',
      check: (u) => u.money >= 100000,
      progressText: (u) => `$${u.money.toLocaleString()}/$100,000`,
    },
    {
      id: 'cash_1m',
      name: '🏦 Ice Cream Billionaire',
      desc: 'Accumulate $1,000,000 cash in your wallet.',
      check: (u) => u.money >= 1000000,
      progressText: (u) => `$${u.money.toLocaleString()}/$1,000,000`,
    },
    {
      id: 'quest_1',
      name: '📋 Rookie Worker',
      desc: 'Complete 1 daily or weekly quest.',
      check: (u) => u.quests.filter((q: any) => q.completed).length >= 1,
      progressText: (u) => `${Math.min(1, u.quests.filter((q: any) => q.completed).length)}/1 Quests`,
    },
    {
      id: 'quest_10',
      name: '💼 Quest Enthusiast',
      desc: 'Complete 10 daily or weekly quests.',
      check: (u) => u.quests.filter((q: any) => q.completed).length >= 10,
      progressText: (u) => `${Math.min(10, u.quests.filter((q: any) => q.completed).length)}/10 Quests`,
    },
    {
      id: 'quest_30',
      name: '🧠 Quest Overlord',
      desc: 'Complete 30 daily or weekly quests.',
      check: (u) => u.quests.filter((q: any) => q.completed).length >= 30,
      progressText: (u) => `${Math.min(30, u.quests.filter((q: any) => q.completed).length)}/30 Quests`,
    },
  ],
  staff: [
    {
      id: 'hire_1',
      name: '👥 Solopreneur',
      desc: 'Hire your first helper staff.',
      check: (u) => u.workers.length >= 1,
      progressText: (u) => `${Math.min(1, u.workers.length)}/1 Workers`,
    },
    {
      id: 'hire_3',
      name: '👔 Managerial Style',
      desc: 'Hire 3 helper staff to run your stands.',
      check: (u) => u.workers.length >= 3,
      progressText: (u) => `${Math.min(3, u.workers.length)}/3 Workers`,
    },
    {
      id: 'hire_5',
      name: '🤝 Corporate Staffing',
      desc: 'Hire 5 helper staff to run your stands.',
      check: (u) => u.workers.length >= 5,
      progressText: (u) => `${Math.min(5, u.workers.length)}/5 Workers`,
    },
    {
      id: 'worker_lv5',
      name: '📈 Expert Training',
      desc: 'Train any worker to Level 5.',
      check: (u) => u.workers.some((w: any) => w.level >= 5),
      progressText: (u) => `Max Lv. ${u.workers.length > 0 ? Math.max(...u.workers.map((w: any) => w.level)) : 0}/5`,
    },
    {
      id: 'clean_95',
      name: '✨ Squeaky Clean',
      desc: 'Achieve cleanliness >= 95% on any stand.',
      check: (u) => u.stands.some((s: any) => s.cleanliness >= 95),
      progressText: (u) => `Max Cleanliness ${u.stands.length > 0 ? Math.max(...u.stands.map((s: any) => s.cleanliness)) : 0}%/95%`,
    },
  ]
};

export function generateProgressBar(progress: number, target: number, colorEmoji: string = '🟪'): string {
  const percentage = Math.min(100, Math.floor((progress / target) * 100));
  const filledLength = Math.round(percentage / 10);
  const emptyLength = 10 - filledLength;
  const bar = colorEmoji.repeat(filledLength) + '⬛'.repeat(emptyLength);
  return `${bar} **${percentage}%** (${progress}/${target})`;
}

export async function buildAchievementsMessage(userId: string, currentTab: string = 'empire') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stands: true,
      workers: true,
      quests: true,
      prestigeUpgrades: true,
      themes: true,
      achievements: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const claimedIds = new Set(user.achievements.map(a => a.achievementId));

  let totalCompleted = 0;
  let totalCount = 0;
  let hasUnclaimedInCurrentTab = false;
  let totalUnclaimedCash = 0;
  let totalUnclaimedTokens = 0;
  const tabProgress: Record<string, { completed: number; total: number }> = {};

  for (const [tabKey, list] of Object.entries(ACHIEVEMENTS)) {
    let tabCompleted = 0;
    for (const ach of list) {
      const isDone = ach.check(user);
      if (isDone) {
        tabCompleted++;
        if (!claimedIds.has(ach.id)) {
          if (tabKey === currentTab) hasUnclaimedInCurrentTab = true;
          totalUnclaimedCash += (ach.rewardCash || 5000);
          totalUnclaimedTokens += (ach.rewardTokens || 0);
        }
      }
    }
    tabProgress[tabKey] = { completed: tabCompleted, total: list.length };
    totalCompleted += tabCompleted;
    totalCount += list.length;
  }

  const container = new ContainerBuilder().setAccentColor(0xFFD700);

  const files: any[] = [];
  const bannerPath = path.join(__dirname, '../../assets/banners/achievements_banner.jpg');
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'achievements_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://achievements_banner.jpg')
      )
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${e('trophy')} Empire Achievements\n` +
      `Unlock permanent accomplishments as you grow your ice cream empire! Your overall progress:\n` +
      `${generateProgressBar(totalCompleted, totalCount, '🟨')}\n`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const list = ACHIEVEMENTS[currentTab] || ACHIEVEMENTS.empire || [];
  let tabTitle = currentTab.charAt(0).toUpperCase() + currentTab.slice(1);
  if (currentTab === 'empire') tabTitle = `🏰 ${tabTitle}`;
  if (currentTab === 'economy') tabTitle = `💵 Economy & Quests`;
  if (currentTab === 'staff') tabTitle = `👥 Staff & Operations`;

  let bodyText = `## ${tabTitle} (${tabProgress[currentTab]?.completed}/${tabProgress[currentTab]?.total} Completed)\n\n`;

  for (const ach of list) {
    const isCompleted = ach.check(user);
    const isClaimed = claimedIds.has(ach.id);

    let checkmark = '⬜';
    let statusLabel = '*In Progress*';
    if (isCompleted) {
      if (isClaimed) {
        checkmark = e('check_green');
        statusLabel = '**[CLAIMED]**';
      } else {
        checkmark = '🌟';
        statusLabel = '**[UNCLAIMED - READY!]**';
      }
    }

    const rewardStr = ach.rewardTokens ? `+$${(ach.rewardCash || 5000).toLocaleString()} Cash & +${ach.rewardTokens} Tokens` : `+$${(ach.rewardCash || 5000).toLocaleString()} Cash`;

    bodyText += `### ${checkmark} ${ach.name}\n` +
      `*${ach.desc}*\n` +
      `• Status: ${statusLabel} (Progress: \`${ach.progressText(user)}\`)\n` +
      `• Bonus Reward: **${rewardStr}**\n\n`;
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyText));

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`achievements:tab:empire:${userId}`)
      .setLabel('Empire')
      .setEmoji('🏰')
      .setStyle(currentTab === 'empire' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`achievements:tab:economy:${userId}`)
      .setLabel('Economy')
      .setEmoji(e('cash'))
      .setStyle(currentTab === 'economy' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`achievements:tab:staff:${userId}`)
      .setLabel('Staff & Ops')
      .setEmoji(e('workers'))
      .setStyle(currentTab === 'staff' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  if (totalUnclaimedCash > 0 || totalUnclaimedTokens > 0) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`achievements:claim_all:${currentTab}:${userId}`)
        .setLabel(`Claim Rewards (+$${totalUnclaimedCash.toLocaleString()})`)
        .setEmoji('🌟')
        .setStyle(ButtonStyle.Success)
    );
  }

  container.addActionRowComponents(buttonRow);

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your completed ScoopSim achievements and milestones!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} You need to set up your ice cream stand first! Run \`/start\` to begin.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const payload = await buildAchievementsMessage(userId, 'empire');
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
