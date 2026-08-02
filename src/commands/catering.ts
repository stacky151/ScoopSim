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
import { CATERING_CONTRACTS } from '../utils/cateringEngine';

export async function buildCateringViewMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trucks: true },
  });

  if (!user) throw new Error('User not found.');

  const container = new ContainerBuilder().setAccentColor(0x3B82F6);

  const bannerPath = path.join(__dirname, '../../assets/banners/catering_banner.jpg');
  const files: any[] = [];
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'catering_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://catering_banner.jpg')
      )
    );
  }

  let fleetText = ``;
  if (user.trucks.length === 0) {
    fleetText = `*You do not own any Mobile Catering Trucks yet. Buy a truck for $5,000 cash to start taking catering contracts!*\n\n`;
  } else {
    for (const truck of user.trucks) {
      if (truck.status === 'ON_CONTRACT') {
        const now = new Date();
        const isDone = truck.contractEndsAt && truck.contractEndsAt <= now;
        const statusLabel = isDone ? '✅ **CONTRACT READY TO CLAIM!**' : `⏱️ Ends <t:${Math.floor(truck.contractEndsAt!.getTime() / 1000)}:R>`;
        fleetText += `🚚 **${truck.name}** (Lv. ${truck.level})\n` +
          `• Contract: **${truck.contractName}**\n` +
          `• Status: ${statusLabel} | Reward: **+$${truck.rewardMoney.toLocaleString()}**\n\n`;
      } else {
        fleetText += `🚚 **${truck.name}** (Lv. ${truck.level}) — 🟢 **IDLE (Ready for dispatch)**\n\n`;
      }
    }
  }

  let contractText = ``;
  for (const [id, contract] of Object.entries(CATERING_CONTRACTS)) {
    contractText += `${contract.emoji} **${contract.name}** (${contract.durationHours}h Duration)\n` +
      `*${contract.desc}*\n` +
      `• Upfront Cost: **$${contract.cost.toLocaleString()}** | Payout: **+$${contract.rewardMoney.toLocaleString()}**\n\n`;
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🚚 Mobile Catering & Events Studio\n` +
      `Dispatch mobile ice cream trucks to exclusive private events for lump-sum cash payouts.\n\n` +
      `• **Your Cash Balance**: ${e('cash')} **$${user.money.toLocaleString()}** | ${e('star')} **Level ${user.level}**\n` +
      `• **Truck Fleet Capacity**: \`${user.trucks.length} / 3 Trucks Owned\`\n\n` +
      `### 🚚 Your Catering Fleet\n` +
      fleetText +
      `### 📜 Available Catering Contracts\n` +
      contractText
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const buttonRow = new ActionRowBuilder<ButtonBuilder>();

  if (user.trucks.length < 3) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`catering:buy_truck:${userId}`)
        .setLabel('Buy Truck ($5,000)')
        .setEmoji('🚚')
        .setStyle(ButtonStyle.Success)
        .setDisabled(user.money < 5000)
    );
  }

  const idleTruck = user.trucks.find(t => t.status === 'IDLE');
  const readyTruck = user.trucks.find(t => t.status === 'ON_CONTRACT' && t.contractEndsAt && t.contractEndsAt <= new Date());

  if (readyTruck) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`catering:claim:${readyTruck.id}:${userId}`)
        .setLabel('Claim Payout')
        .setEmoji('💰')
        .setStyle(ButtonStyle.Success)
    );
  } else if (idleTruck) {
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`catering:dispatch:beach_party:${idleTruck.id}:${userId}`)
        .setLabel('Dispatch Beach (1h)')
        .setEmoji('🏖️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(user.money < 1000),
      new ButtonBuilder()
        .setCustomId(`catering:dispatch:music_festival:${idleTruck.id}:${userId}`)
        .setLabel('Dispatch Fest (4h)')
        .setEmoji('🎪')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(user.money < 3000 || user.level < 5)
    );
  }

  if (buttonRow.components.length > 0) {
    container.addActionRowComponents(buttonRow);
  }

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('catering')
    .setDescription('Manage your mobile ice cream trucks and dispatch them on catering contracts.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const payload = await buildCateringViewMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral,
    });
  },
};
