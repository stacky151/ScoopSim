import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { prisma } from '../index';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('prestige')
    .setDescription('Access the Prestige system and Prestige Upgrades shop.')
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Check your eligibility for Prestige and trigger it.')
    )
    .addSubcommand(sub =>
      sub
        .setName('shop')
        .setDescription('Spend your Prestige Tokens on permanent upgrades.')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand() || 'status';
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stands: true,
        prestigeUpgrades: true
      }
    });

    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} Run \`/start\` to begin your empire first.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const { isOverseer, getOverseerFooter } = require('../constants/overseer');
    const isOverseerUser = isOverseer(userId);

    if (subcommand === 'status') {
      const stands = user.stands;
      const hasSouthAfrica = isOverseerUser || stands.some(s => s.country === 'South Africa') || user.rebirths >= 9;

      const container = new ContainerBuilder().setAccentColor(0x9B59B6);
      let description = `# ${e('popper')} Prestige System\n` +
        `Ready to transcend ordinary operations? Prestiging allows you to reset your empire for permanent **Prestige Tokens**.\n\n` +
        `**Prestige Requirements:**\n` +
        `• Unlock & establish a stand in **South Africa** (or Rebirth 9+)\n` +
        `• Status: ${hasSouthAfrica ? `${e('check_green')} Eligible` : `${e('cross_red')} Locked (Requires South Africa stand unlocked)`}\n\n` +
        getOverseerFooter(userId);

      if (hasSouthAfrica) {
        const estimatedTokens = 5 + Math.floor(15 * Math.pow(Math.max(0, user.money - 100000) / 100000, 0.4));
        description += `**Current Earnings Valuation:**\n` +
          `• Cash balance: **$${user.money.toLocaleString()}**\n` +
          `• Estimated tokens on prestige: ${e('gem')} **${estimatedTokens} Prestige Tokens**\n` +
          `*(Earn 5 base tokens + bonus tokens scaled sub-linearly with cash valuation)*\n\n` +
          `**Prestiging will RESET:**\n` +
          `• Cash to **$500**, Level to **1**, EXP to **0**.\n` +
          `• All stands, batches, and workers.\n` +
          `• All equipment refills and inventory upgrades.\n\n` +
          `**Prestiging will PRESERVE & UPGRADE:**\n` +
          `• **Rebirth Earnings Multiplier** (Preserved!)\n` +
          `• All visual stand theme cosmetics.\n` +
          `• All permanent Prestige Shop upgrades.\n\n` +
          `-# Warning: This action is irreversible.`;

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`prestige:confirm:${userId}`)
            .setLabel('Trigger Prestige')
            .setEmoji(e('popper'))
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('prestige:cancel')
            .setLabel('Cancel')
            .setEmoji(e('cross_red'))
            .setStyle(ButtonStyle.Secondary)
        );
        container.addActionRowComponents(row);
      } else {
        description += `Establish an ice cream stand in South Africa ($1,000,000 cash requirement) to unlock the Prestige gateway. Keep climbing, Sir!`;
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
      }

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (subcommand === 'shop') {
      const payload = await buildPrestigeShopMessage(userId);
      return interaction.reply({
        components: payload.components,
        files: payload.files,
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }
  }
};

export async function buildPrestigeShopMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { prestigeUpgrades: true }
  });

  if (!user) throw new Error('User not found');

  const speedLvl = user.prestigeUpgrades.find(u => u.type === 'speed_mult')?.level || 0;
  const tipLvl = user.prestigeUpgrades.find(u => u.type === 'tip_mult')?.level || 0;
  const doubleLvl = user.prestigeUpgrades.find(u => u.type === 'double_scoop_mult')?.level || 0;
  const discountLvl = user.prestigeUpgrades.find(u => u.type === 'supplier_discount')?.level || 0;

  const cost = (lvl: number) => lvl + 1;

  const speedCost = cost(speedLvl);
  const tipCost = cost(tipLvl);
  const doubleCost = cost(doubleLvl);
  const discountCost = cost(discountLvl);

  const container = new ContainerBuilder().setAccentColor(0x9B59B6);

  const files: any[] = [];
  const bannerPath = path.join(__dirname, '../../assets/banners/prestige_banner.jpg');
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'prestige_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://prestige_banner.jpg')
      )
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${e('gem')} Prestige Upgrades Shop\n` +
      `**Your Tokens**: ${e('gem')} **${user.prestigeTokens}**\n` +
      `Purchase permanent buffs that persist through resets and prestige cycles.\n\n` +
      `**1. ${e('workers')} Production Speed (Lv. ${speedLvl})**\n` +
      `• Effect: -5% tick interval per level (Capped at -50% / Lv. 10).\n` +
      `• Cost: ${e('gem')} **${speedCost} Tokens**\n\n` +
      `**2. ${e('cash')} Premium Tips (Lv. ${tipLvl})**\n` +
      `• Effect: +5% tip payouts globally per level.\n` +
      `• Cost: ${e('gem')} **${tipCost} Tokens**\n\n` +
      `**3. ${e('scoop')} Bulk Ordering (Lv. ${doubleLvl})**\n` +
      `• Effect: +10% double scoop probability (Capped at 50% / Lv. 5).\n` +
      `• Cost: ${e('gem')} **${doubleCost} Tokens**\n\n` +
      `**4. ${e('shop')} Supplier Discount (Lv. ${discountLvl})**\n` +
      `• Effect: -5% refill item price in shop (Capped at -50% / Lv. 10).\n` +
      `• Cost: ${e('gem')} **${discountCost} Tokens**`
    )
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`prestige:upgrade:speed_mult:${userId}`)
      .setLabel(`Speed (+5%)`)
      .setEmoji(e('workers'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.prestigeTokens < speedCost || speedLvl >= 10),
    new ButtonBuilder()
      .setCustomId(`prestige:upgrade:tip_mult:${userId}`)
      .setLabel(`Tips (+5%)`)
      .setEmoji(e('cash'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.prestigeTokens < tipCost),
    new ButtonBuilder()
      .setCustomId(`prestige:upgrade:double_scoop_mult:${userId}`)
      .setLabel(`Bulk (+10%)`)
      .setEmoji(e('scoop'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.prestigeTokens < doubleCost || doubleLvl >= 5),
    new ButtonBuilder()
      .setCustomId(`prestige:upgrade:supplier_discount:${userId}`)
      .setLabel(`Supplier (-5%)`)
      .setEmoji(e('shop'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.prestigeTokens < discountCost || discountLvl >= 10)
  );

  container.addActionRowComponents(row);

  return {
    components: [container],
    files: files
  };
}
