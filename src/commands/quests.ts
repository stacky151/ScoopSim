import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { prisma } from '../index';
import { safeTransaction } from '../utils/dbTransaction';
import { e } from '../constants/emojis';

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const DAILY_QUESTS_POOL = [
  { type: 'sell_scoops',       name: `${e('scoop')} Scoop Master`,      desc: 'Sell 100 ice cream scoops to customers.',          target: 100,  rewardMoney: 200,  rewardTokens: 0 },
  { type: 'clean_stand',       name: `${e('broom')} Stand Polish`,       desc: 'Clean your ice cream stand manually 3 times.',     target: 3,    rewardMoney: 150,  rewardTokens: 0 },
  { type: 'collect_cash',      name: `${e('cash')} Cash Collector`,      desc: 'Collect or earn $500 from sales.',                 target: 500,  rewardMoney: 300,  rewardTokens: 0 },
  { type: 'double_scoops_daily', name: `${e('double_scoop')} Double Trouble`, desc: 'Serve 5 double-scoop orders.',             target: 5,    rewardMoney: 250,  rewardTokens: 0 },
  { type: 'tip_collector',     name: `${e('tip_jar')} Tip Master`,       desc: 'Earn $200 in tips from sales.',                    target: 200,  rewardMoney: 275,  rewardTokens: 0 },
  { type: 'open_stand_daily',  name: `${e('store')} Open for Business`,  desc: 'Open your stand and make at least 1 sale.',        target: 1,    rewardMoney: 100,  rewardTokens: 0 },
  { type: 'large_cone_sells',  name: `${e('cone_large')} Cone King`,     desc: 'Serve 10 ice creams in large cones.',              target: 10,   rewardMoney: 220,  rewardTokens: 0 },
];

const WEEKLY_QUESTS_POOL = [
  { type: 'sell_lemon_egypt',    name: 'Desert Refreshment',   desc: 'Sell 150 scoops of Lemon Sorbet in Egypt.',        target: 150,  rewardMoney: 3000, rewardTokens: 10 },
  { type: 'sell_pistachio_italy',name: 'Gelato Connoisseur',   desc: 'Sell 150 scoops of Pistachio Gelato in Italy.',    target: 150,  rewardMoney: 3500, rewardTokens: 12 },
  { type: 'sell_matcha_japan',   name: 'Tokyo Tea Party',      desc: 'Sell 150 scoops of Matcha Green Tea in Japan.',    target: 150,  rewardMoney: 4000, rewardTokens: 15 },
  { type: 'sell_chocolate_belgium', name: 'Brussels Finest',   desc: 'Sell 150 scoops of Chocolate in Belgium.',        target: 150,  rewardMoney: 3200, rewardTokens: 11 },
  { type: 'cleanliness_ticks',   name: 'Immaculate Hygiene',   desc: 'Maintain stand cleanliness >= 80% for 30 ticks.',  target: 30,   rewardMoney: 2500, rewardTokens: 8 },
  { type: 'double_scoops',       name: 'Double Scoop King',    desc: 'Serve 20 double-scoop orders.',                    target: 20,   rewardMoney: 2000, rewardTokens: 7 },
  { type: 'collect_cash_weekly', name: 'Ice Cream Tycoon',     desc: 'Earn $5,000 from sales.',                          target: 5000, rewardMoney: 4500, rewardTokens: 15 },
  { type: 'big_revenue_run',     name: 'Big Revenue Run',      desc: 'Earn $10,000 total from sales this week.',         target: 10000, rewardMoney: 7000, rewardTokens: 20 },
  { type: 'deep_clean_week',     name: 'Deep Clean Champion',  desc: 'Clean your stand 15 times in a week.',             target: 15,   rewardMoney: 2800, rewardTokens: 9 },
  { type: 'festival_sales',      name: 'Festival Ready',       desc: 'Make 50 sales during a Festival event.',           target: 50,   rewardMoney: 5000, rewardTokens: 18 },
];

export function generateProgressBar(progress: number, target: number, isWeekly: boolean = false): string {
  const percentage = Math.min(100, Math.floor((progress / target) * 100));
  const filledLength = Math.round(percentage / 10);
  const emptyLength = 10 - filledLength;
  const fillEmoji = isWeekly ? '🟦' : '🟩';
  const bar = fillEmoji.repeat(filledLength) + '⬛'.repeat(emptyLength);
  return `${bar} **${percentage}%** (${progress}/${target})`;
}

export async function buildQuestsMessage(userId: string) {
  const now = new Date();

  const allQuests = await prisma.userQuest.findMany({
    where: { userId }
  });

  const dailyQuests = allQuests.filter(q => !q.isWeekly);
  const weeklyQuests = allQuests.filter(q => q.isWeekly);

  const isNewDay = dailyQuests.length === 0 || new Date(dailyQuests[0]!.createdAt).toDateString() !== now.toDateString();
  const isNewWeek = weeklyQuests.length === 0 || getWeekNumber(new Date(weeklyQuests[0]!.createdAt)) !== getWeekNumber(now);

  let finalDailyQuests = dailyQuests;
  let finalWeeklyQuests = weeklyQuests;

  if (isNewDay) {
    await safeTransaction(async () => {
      await prisma.userQuest.deleteMany({
        where: { userId, isWeekly: false }
      });
      const shuffled = [...DAILY_QUESTS_POOL].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);
      finalDailyQuests = [];
      for (const q of selected) {
        const created = await prisma.userQuest.create({
          data: {
            userId,
            questType: q.type,
            description: q.desc,
            target: q.target,
            rewardMoney: q.rewardMoney,
            rewardTokens: q.rewardTokens,
            isWeekly: false,
            progress: 0,
            completed: false,
            createdAt: now
          }
        });
        finalDailyQuests.push(created);
      }
    });
  }

  if (isNewWeek) {
    await safeTransaction(async () => {
      await prisma.userQuest.deleteMany({
        where: { userId, isWeekly: true }
      });
      const shuffled = [...WEEKLY_QUESTS_POOL].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 2);
      finalWeeklyQuests = [];
      for (const q of selected) {
        const created = await prisma.userQuest.create({
          data: {
            userId,
            questType: q.type,
            description: q.desc,
            target: q.target,
            rewardMoney: q.rewardMoney,
            rewardTokens: q.rewardTokens,
            isWeekly: true,
            progress: 0,
            completed: false,
            createdAt: now
          }
        });
        finalWeeklyQuests.push(created);
      }
    });
  }

  const container = new ContainerBuilder().setAccentColor(0x00FFD2);
  const files: any[] = [];
  const bannerPath = path.join(__dirname, '../../assets/banners/quests_banner.jpg');
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'quests_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://quests_banner.jpg')
      )
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${e('clipboard')} Quest Center\n` +
      `Complete daily and weekly goals to progress your ice cream empire and claim rewards!\n`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const QUEST_DISPLAY: Record<string, string> = {
    sell_scoops:           `${e('scoop')} Scoop Master`,
    clean_stand:           `${e('broom')} Stand Polish`,
    collect_cash:          `${e('cash')} Cash Collector`,
    double_scoops_daily:   `${e('double_scoop')} Double Trouble`,
    tip_collector:         `${e('tip_jar')} Tip Master`,
    open_stand_daily:      `${e('store')} Open for Business`,
    large_cone_sells:      `${e('cone_large')} Cone King`,
    sell_lemon_egypt:      `${e('flag_egypt')} Desert Refreshment`,
    sell_pistachio_italy:  `${e('flag_italy')} Gelato Connoisseur`,
    sell_matcha_japan:     `${e('flag_japan')} Tokyo Tea Party`,
    sell_chocolate_belgium:`${e('flag_belgium')} Brussels Finest`,
    cleanliness_ticks:     `${e('sparkles')} Immaculate Hygiene`,
    double_scoops:         `${e('double_scoop')} Double Scoop King`,
    collect_cash_weekly:   `${e('money_bag')} Ice Cream Tycoon`,
    big_revenue_run:       `${e('bar_chart')} Big Revenue Run`,
    deep_clean_week:       `${e('broom')} Deep Clean Champion`,
    festival_sales:        `${e('event_festival')} Festival Ready`,
  };

  let bodyText = `## ${e('sunny')} Daily Quests (Resets at midnight)\n\n`;
  const claimRow = new ActionRowBuilder<ButtonBuilder>();
  let hasClaimable = false;

  for (const q of finalDailyQuests) {
    const isCompleted = q.progress >= q.target;
    const isClaimed = q.completed;

    let statusLabel = `${e('clock')} In Progress`;
    if (isClaimed) statusLabel = `${e('check_green')} Claimed`;
    else if (isCompleted) statusLabel = `${e('gift')} Claimable!`;

    const questName = QUEST_DISPLAY[q.questType] || q.questType;

    bodyText += `### ${questName} (${statusLabel})\n` +
      `*${q.description}*\n` +
      `• Progress: ${generateProgressBar(q.progress, q.target, false)}\n` +
      `• Reward: **+$${q.rewardMoney}**\n\n`;

    if (isCompleted && !isClaimed) {
      claimRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`quests:claim:${q.id}`)
          .setLabel(`Claim Daily`)
          .setEmoji(e('gift'))
          .setStyle(ButtonStyle.Success)
      );
      hasClaimable = true;
    }
  }

  bodyText += `## ${e('clipboard')} Weekly Quests (Resets Mondays)\n\n`;
  for (const q of finalWeeklyQuests) {
    const isCompleted = q.progress >= q.target;
    const isClaimed = q.completed;

    let statusLabel = `${e('clock')} In Progress`;
    if (isClaimed) statusLabel = `${e('check_green')} Claimed`;
    else if (isCompleted) statusLabel = `${e('gift')} Claimable!`;

    const questName = QUEST_DISPLAY[q.questType] || q.questType;

    bodyText += `### ${questName} (${statusLabel})\n` +
      `*${q.description}*\n` +
      `• Progress: ${generateProgressBar(q.progress, q.target, true)}\n` +
      `• Reward: **+$${q.rewardMoney}** | ${e('prestige_token')} **+${q.rewardTokens}** Prestige Tokens\n\n`;

    if (isCompleted && !isClaimed) {
      claimRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`quests:claim:${q.id}`)
          .setLabel(`Claim Weekly`)
          .setEmoji(e('gift'))
          .setStyle(ButtonStyle.Success)
      );
      hasClaimable = true;
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyText));

  if (hasClaimable) {
    container.addActionRowComponents(claimRow);
  }

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('View and claim your daily and weekly quests!'),

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

    const payload = await buildQuestsMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
