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

export interface ToppingDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  cost: number;
  effect: string;
}

export const TOPPINGS: Record<string, ToppingDef> = {
  sprinkles: { id: 'sprinkles', name: 'Rainbow Sprinkles', emoji: '🌈', desc: 'Colorful candy sprinkles that delight kids.', cost: 500, effect: '+10% Customer Tip Chance' },
  fudge: { id: 'fudge', name: 'Hot Fudge Drizzle', emoji: '🍫', desc: 'Rich molten chocolate drizzle.', cost: 1000, effect: '+15% Scoop Sale Price' },
  whipped_cream: { id: 'whipped_cream', name: 'Whipped Cream Peak', emoji: '☁️', desc: 'Fluffy vanilla whipped cream topper.', cost: 1500, effect: '+10% Cleanliness Preservation' },
  cherry: { id: 'cherry', name: 'Maraschino Cherry', emoji: '🍒', desc: 'Classic glossy red cherry on top.', cost: 2500, effect: '+20% VIP Critic Spawn Rate' },
  gold_leaf: { id: 'gold_leaf', name: '24k Gold Leaf Flakes', emoji: '👑', desc: 'Opulent edible gold leaf garnish.', cost: 5000, effect: '+50% Total Stand Revenue' }
};

export async function buildRecipeMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      inventory: {
        include: { item: true }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const ownedItems = new Set(user.inventory.map(i => i.item.name));
  const container = new ContainerBuilder().setAccentColor(0xEC4899);

  const files: any[] = [];
  const bannerPath = path.join(__dirname, '../../assets/banners/recipe_banner.jpg');
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'recipe_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://recipe_banner.jpg')
      )
    );
  }

  let headerText = `# 🍨 Gourmet Recipe & Topping Studio\n` +
    `Customize your signature scoop recipe with gourmet toppings to boost sale prices, tip chances, and VIP critic ratings.\n\n` +
    `• **Your Cash Balance**: ${e('cash')} **$${user.money.toLocaleString()}**\n\n`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  for (const [id, top] of Object.entries(TOPPINGS)) {
    const isOwned = ownedItems.has(top.name);
    let statusText = isOwned ? '✅ **Equipped on Signature Recipe**' : `💰 **Price: $${top.cost.toLocaleString()}**`;

    const itemText = `### ${top.emoji} **${top.name}**\n` +
      `*${top.desc}*\n` +
      `• **Effect**: \`${top.effect}\`\n` +
      `• **Status**: ${statusText}`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(itemText));

    const row = new ActionRowBuilder<ButtonBuilder>();
    if (isOwned) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`recipe:active:${id}:${userId}`)
          .setLabel('Active Topping')
          .setEmoji('✨')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      );
    } else {
      const canAfford = user.money >= top.cost;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`recipe:buy:${id}:${userId}`)
          .setLabel(canAfford ? `Buy Topping ($${top.cost.toLocaleString()})` : `Need $${top.cost.toLocaleString()}`)
          .setEmoji(top.emoji)
          .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(!canAfford)
      );
    }

    container.addActionRowComponents(row);
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('stand:main').setLabel('Back to Stand POV 🏪').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('shop:category:food').setLabel('Back to Shop 🛒').setStyle(ButtonStyle.Secondary)
  );
  container.addActionRowComponents(navRow);

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('recipe')
    .setDescription('Customize your signature ice cream recipe with gourmet toppings.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
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

    const payload = await buildRecipeMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
