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
import { PERK_TYPES } from '../utils/guildEngine';

export async function buildGuildViewMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      guildMember: {
        include: {
          guild: {
            include: {
              members: { include: { user: true } },
              perks: true,
            },
          },
        },
      },
    },
  });

  if (!user) throw new Error('User not found.');

  const container = new ContainerBuilder().setAccentColor(0xF59E0B);

  const bannerPath = path.join(__dirname, '../../assets/banners/guild_banner.jpg');
  const files: any[] = [];
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'guild_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://guild_banner.jpg')
      )
    );
  }

  if (!user.guildMember) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🏰 Franchise Guild Union\n` +
        `Join forces with fellow ice cream tycoons to pool cash, unlock global franchise perks, and compete on the global guild leaderboard!\n\n` +
        `• **Your Cash Balance**: ${e('cash')} **$${user.money.toLocaleString()}**\n` +
        `• **Guild Creation Cost**: ${e('cash')} **$10,000**\n\n` +
        `*You are not currently in a guild. Click below to establish a new Franchise Guild!*`
      )
    );

    const createRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`guild:prompt_create:${userId}`)
        .setLabel('Establish Franchise Guild ($10,000)')
        .setEmoji(e('crown'))
        .setStyle(ButtonStyle.Success)
        .setDisabled(user.money < 10000)
    );

    container.addActionRowComponents(createRow);

    return {
      components: [container],
      files: files,
      flags: MessageFlags.IsComponentsV2 as any,
    };
  }

  const guild = user.guildMember.guild;
  const memberRole = user.guildMember.role;

  let perkText = '';
  for (const perk of guild.perks) {
    const perkDef = PERK_TYPES[perk.type];
    if (perkDef) {
      perkText += `• ${perkDef.emoji} **${perkDef.name}** (Lv. ${perk.level}): *${perkDef.desc}*\n`;
    }
  }

  const memberList = guild.members
    .slice(0, 10)
    .map(m => `• <@${m.userId}> (${m.role}) — Deposited **$${m.contributedCash.toLocaleString()}**`)
    .join('\n');

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🏰 [${guild.tag}] ${guild.name}\n` +
      `**Level ${guild.level}** | ${e('vault')} Vault: **$${guild.vaultBalance.toLocaleString()}** | ${e('star')} XP: **${guild.xp}**\n\n` +
      `### ⚡ Active Franchise Perks\n` +
      perkText + `\n` +
      `### 👥 Member Roster (${guild.members.length} Members)\n` +
      memberList
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`guild:deposit_500:${userId}`)
      .setLabel('Deposit $500 to Vault')
      .setEmoji(e('cash'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.money < 500),
    new ButtonBuilder()
      .setCustomId(`guild:deposit_2500:${userId}`)
      .setLabel('Deposit $2,500')
      .setEmoji(e('money_bag'))
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.money < 2500),
    new ButtonBuilder()
      .setCustomId(`guild:upgrade_perk:${userId}`)
      .setLabel('Upgrade Guild Perk')
      .setEmoji(e('gem'))
      .setStyle(memberRole === 'OWNER' || memberRole === 'OFFICER' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(memberRole !== 'OWNER' && memberRole !== 'OFFICER')
  );

  container.addActionRowComponents(actionRow);

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('guild')
    .setDescription('Access your Ice Cream Franchise Guild headquarters.')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View your guild status, vault balance, and perks.')
    )
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Establish a new Ice Cream Franchise Guild ($10,000 cash requirement).')
        .addStringOption(opt => opt.setName('name').setDescription('Full Guild Name (e.g. Artisan Creamery Union)').setRequired(true))
        .addStringOption(opt => opt.setName('tag').setDescription('2-4 character tag (e.g. SCOP)').setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand() || 'view';

    if (subcommand === 'create') {
      const name = interaction.options.getString('name', true);
      const tag = interaction.options.getString('tag', true);

      try {
        const { createGuild } = require('../utils/guildEngine');
        await createGuild(userId, name, tag);

        const payload = await buildGuildViewMessage(userId);
        return interaction.reply({
          components: payload.components,
          files: payload.files,
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      } catch (error: any) {
        const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
        errorContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${e('cross_red')} ${error.message || 'Failed to create guild.'}`)
        );
        return interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
    }

    const payload = await buildGuildViewMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral,
    });
  },
};
