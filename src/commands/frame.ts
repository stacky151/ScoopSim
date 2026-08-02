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

export interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  levelReq: number;
  color: number;
}

export const THEMES: Record<string, ThemeDef> = {
  default: { id: 'default', name: 'Default Stand', desc: 'The classic wooden ice cream cart style.', price: 0, levelReq: 1, color: 0x8b5a2b },
  retro: { id: 'retro', name: 'Retro Arcade', desc: 'A pixelated checkerboard floor and neon retro arcade cabinet style.', price: 2500, levelReq: 3, color: 0xED64A6 },
  cyberpunk: { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'A futuristic cyber counter with glowing cyan and magenta lights.', price: 5000, levelReq: 5, color: 0x00FFFF },
  luxury: { id: 'luxury', name: 'Luxury Gold', desc: 'A premium counter made of dark gold-veined marble.', price: 10000, levelReq: 8, color: 0xD69E2E },
};

export async function buildFrameListMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { themes: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const ownedThemes = new Set(user.themes.map(t => t.themeId));
  ownedThemes.add('default');

  const container = new ContainerBuilder().setAccentColor(0x3B82F6);

  const bannerPath = path.join(__dirname, '../../assets/banners/frame_banner.jpg');
  const files: any[] = [];
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'frame_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://frame_banner.jpg')
      )
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🖼️ Stand Cosmetics & Themes\n` +
      `Customize the appearance of your ice cream stands across the globe. Themes modify the background, floor, and counter body during POV rendering.\n\n` +
      `• **Your Cash Balance**: ${e('cash')} **$${user.money.toLocaleString()}** | ${e('star')} **Level ${user.level}**\n` +
      `• **Currently Equipped**: \`${user.equippedTheme || 'default'}\`\n`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  for (const [id, theme] of Object.entries(THEMES)) {
    const isOwned = ownedThemes.has(id);
    const isEquipped = user.equippedTheme === id;

    let statusStr = '';
    if (isEquipped) {
      statusStr = `✨ **Currently Equipped**`;
    } else if (isOwned) {
      statusStr = `✅ *Owned (Ready to equip)*`;
    } else {
      statusStr = `${e('cash')} **Price: $${theme.price.toLocaleString()}** | ${e('star')} Req. Level ${theme.levelReq}`;
    }

    const themeText = `### **${theme.name}**\n` +
      `*${theme.desc}*\n` +
      `• Status: ${statusStr}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(themeText));

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (isEquipped) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`frame:equipped:${id}:${userId}`)
          .setLabel('Equipped')
          .setEmoji(e('sparkles'))
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );
    } else if (isOwned) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`frame:equip:${id}:${userId}`)
          .setLabel('Equip Theme')
          .setEmoji(e('sparkles'))
          .setStyle(ButtonStyle.Primary)
      );
    } else {
      const canAfford = user.money >= theme.price;
      const meetsLevel = user.level >= theme.levelReq;
      const canBuy = canAfford && meetsLevel;

      let label = `Buy ($${theme.price.toLocaleString()})`;
      if (!meetsLevel) label = `Req. Level ${theme.levelReq}`;
      else if (!canAfford) label = `Need $${theme.price.toLocaleString()}`;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`frame:buy:${id}:${userId}`)
          .setLabel(label)
          .setEmoji(e('cash'))
          .setStyle(canBuy ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(!canBuy)
      );
    }

    container.addActionRowComponents(row);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  }

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('frame')
    .setDescription('Browse, purchase, and equip visual themes for your ice cream stands.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { themes: true }
    });

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

    const payload = await buildFrameListMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
