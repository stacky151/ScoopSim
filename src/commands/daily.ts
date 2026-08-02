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

export async function buildDailyMessage(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found.');

  const container = new ContainerBuilder().setAccentColor(0xFFD700);

  const bannerPath = path.join(__dirname, '../../assets/banners/daily_banner.jpg');
  const files: any[] = [];
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'daily_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://daily_banner.jpg')
      )
    );
  }

  const now = new Date();
  const canClaimDaily = !user.lastDaily || (now.getTime() - user.lastDaily.getTime() >= 86400000);
  const canSpinWheel = !user.lastWheelSpin || (now.getTime() - user.lastWheelSpin.getTime() >= 86400000);

  const streakDays = user.dailyStreak || 0;
  const nextRewardCash = Math.min(10000, 500 + streakDays * 250);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🎁 Daily Rewards & Fortune Wheel Studio\n` +
      `Check in daily to build your streak, earn exponential cash bonuses, and spin the Fortune Prize Wheel!\n\n` +
      `• **Your Current Streak**: 🔥 **${streakDays} Days** *(36-Hour Rolling Grace Window Active)*\n` +
      `• **Next Daily Payout**: ${e('cash')} **$${nextRewardCash.toLocaleString()}**\n` +
      `• **7-Day Milestone Perk**: ${e('gem')} **+5 Bonus Prestige Tokens** on Day 7, 14, 21, 28...\n\n` +
      `### 🎡 Fortune Prize Wheel Breakdown\n` +
      `• 💵 **$1,000 Cash** (30%) | 💰 **$5,000 Jackpot** (15%)\n` +
      `• 💎 **3 Prestige Tokens** (20%) | 🌟 **10 Tokens Mega Jackpot** (5%)\n` +
      `• ⭐ **500 Empire EXP** (30%)\n`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`daily:claim:${userId}`)
      .setLabel(canClaimDaily ? `Claim Daily ($${nextRewardCash.toLocaleString()})` : 'Daily Claimed ✅')
      .setEmoji('🎁')
      .setStyle(canClaimDaily ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canClaimDaily),
    new ButtonBuilder()
      .setCustomId(`daily:spin_wheel:${userId}`)
      .setLabel(canSpinWheel ? 'Spin Fortune Wheel' : 'Wheel Spun ✅')
      .setEmoji('🎡')
      .setStyle(canSpinWheel ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!canSpinWheel)
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
    .setName('daily')
    .setDescription('Claim your daily streak cash reward & spin the Daily Fortune Wheel!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const payload = await buildDailyMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral,
    });
  },
};
