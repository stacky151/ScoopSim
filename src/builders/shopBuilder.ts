import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { prisma } from '../index';
import { e, getItemEmoji } from '../constants/emojis';
import { isOverseer, getOverseerFooter } from '../constants/overseer';

export async function buildShopMessage(userId: string, category: string = 'food') {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      workers: true,
      inventory: {
        include: { item: true }
      }
    }
  });

  if (!user) throw new Error('User not found');

  const isOverseerUser = isOverseer(userId);
  const container = new ContainerBuilder().setAccentColor(0x3B82F6);

  const bannerPath = path.join(__dirname, '../../assets/banners/shop_banner.jpg');
  const files: any[] = [];
  if (fs.existsSync(bannerPath)) {
    files.push(new AttachmentBuilder(bannerPath, { name: 'shop_banner.jpg' }));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://shop_banner.jpg')
      )
    );
  }

  const items = await prisma.shopItem.findMany({
    where: category === 'equipment'
      ? { type: { in: ['equipment', 'decoration'] } }
      : { type: category },
    orderBy: { price: 'asc' }
  });

  const categoryLabels: Record<string, string> = {
    food: `${e('scoop')} Flavor Refills`,
    item: `${e('cone')} Containers`,
    equipment: `${e('gear')} Shop Upgrades`,
    service: `${e('workers')} Staff & Services`,
  };

  const categoryBriefs: Record<string, string> = {
    food: 'Buy flavor refills to restock your display cases. Each refill pack restores 50 scoops.',
    item: 'Restock your cones and serving cups so you can sell ice cream to your customers.',
    equipment: 'Purchase permanent freezer and storage upgrades to hold larger batches.',
    service: 'Hire cleaners, cashiers, makers, and managers to automate and speed up your stand!',
  };

  let cheapestDescriptions = '';
  let premiumDescriptions = '';

  if (category === 'service') {
    const services = [
      { id: 'cleaner', name: `${e('broom')} Cleaner`, desc: 'Automatically cleans your shop, slowing down cleanliness decay.', basePrice: 200, lvReq: 2 },
      { id: 'cashier', name: `${e('cash')} Cashier`, desc: 'Checks out customers faster, speeding up sale intervals by 25%.', basePrice: 300, lvReq: 3 },
      { id: 'maker', name: `${e('scoop')} Ice Cream Maker`, desc: 'Speeds up prep and sale intervals by 10%.', basePrice: 400, lvReq: 5 },
      { id: 'manager', name: `${e('tie')} Manager`, desc: 'Automatically refills batches from inventory and collects cash straight to wallet.', basePrice: 500, lvReq: 7 },
    ];

    for (const service of services) {
      const activeWorker = user.workers.find(w => w.type === service.id);
      const level = activeWorker ? activeWorker.level : 0;
      const price = Math.floor(service.basePrice * Math.pow(1.6, level));
      const isLocked = user.level < service.lvReq;

      let itemText = `${service.name} ${level > 0 ? `**(Lv. ${level})**` : ''}\n`;
      itemText += `• Price: **$${price}**\n`;
      itemText += `• Level Required: **${service.lvReq}** ${isLocked ? e('lock') : e('check_green')}\n`;
      itemText += `• Description: *${service.desc}*\n\n`;

      if (service.basePrice <= 200) {
        cheapestDescriptions += itemText;
      } else {
        premiumDescriptions += itemText;
      }
    }
  } else {
    for (const item of items) {
      const isLocked = user.level < item.levelRequired;
      const ownedQuantity = user.inventory.find(i => i.itemId === item.id)?.quantity || 0;

      let itemText = `${getItemEmoji(item.name)} **${item.name}** ${ownedQuantity > 0 ? `*(Own: ${ownedQuantity})*` : ''}\n`;
      itemText += `• Price: **$${item.price}**\n`;
      itemText += `• Level Required: **${item.levelRequired}** ${isLocked ? e('lock') : e('check_green')}\n`;
      itemText += `• Description: *${item.description}*\n\n`;

      if (item.price < 100) {
        cheapestDescriptions += itemText;
      } else {
        premiumDescriptions += itemText;
      }
    }
  }

  container.setAccentColor(0xFF8C00);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${e('store')} ScoopSim Store - ${categoryLabels[category] || 'Menu'}\n` +
      `${e('wallet')} **Your Balance**: $${user.money.toLocaleString()} | ${e('star')} **Level**: ${user.level}\n` +
      `*${categoryBriefs[category] || ''}*`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('dot_green')} **Cheapest/Refills & Containers:**\n` +
      (cheapestDescriptions || 'None')
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${e('gem')} **Premium/Upgrades & Specialists:**\n` +
      (premiumDescriptions || 'None')
    )
  );

  const categoryRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('shop:category:food')
      .setLabel('Food')
      .setEmoji(e('scoop'))
      .setStyle(category === 'food' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('shop:category:item')
      .setLabel('Items')
      .setEmoji(e('cone'))
      .setStyle(category === 'item' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('shop:category:equipment')
      .setLabel('Equipment')
      .setEmoji(e('gear'))
      .setStyle(category === 'equipment' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('shop:category:service')
      .setLabel('Service')
      .setEmoji(e('workers'))
      .setStyle(category === 'service' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('recipe:menu')
      .setLabel('Recipes')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Success)
  );
  container.addActionRowComponents(categoryRow);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (category === 'service') {
    const purchaseRow1 = new ActionRowBuilder<ButtonBuilder>();
    const services = [
      { id: 'cleaner', label: 'Cleaner', emojiKey: 'broom', lvReq: 2 },
      { id: 'cashier', label: 'Cashier', emojiKey: 'cash', lvReq: 3 },
      { id: 'maker', label: 'Maker', emojiKey: 'scoop', lvReq: 5 },
      { id: 'manager', label: 'Manager', emojiKey: 'tie', lvReq: 7 },
    ] as const;
    for (const s of services) {
      const activeWorker = user.workers.find(w => w.type === s.id);
      const isLocked = isOverseerUser ? false : user.level < s.lvReq;
      purchaseRow1.addComponents(
        new ButtonBuilder()
          .setCustomId(`shop:buy_service:${s.id}`)
          .setLabel(activeWorker ? `Upgrade ${s.label}` : `Hire ${s.label}`)
          .setEmoji(e(s.emojiKey))
          .setStyle(ButtonStyle.Success)
          .setDisabled(isLocked)
      );
    }
    container.addActionRowComponents(purchaseRow1);
  } else {
    if (items.length > 0) {
      const itemSelectMenu = new StringSelectMenuBuilder()
        .setCustomId(`shop:buy_select:${category}`)
        .setPlaceholder(`🛒 Choose a ${categoryLabels[category] || 'Item'} to Buy...`.slice(0, 150));

      const shopOptions: StringSelectMenuOptionBuilder[] = [];

      items.slice(0, 25).forEach((item) => {
        const isLocked = isOverseerUser ? false : user.level < item.levelRequired;
        const ownedQuantity = user.inventory.find(i => i.itemId === item.id)?.quantity || 0;
        const rawLabel = `${item.name} — $${item.price.toLocaleString()} ${isLocked ? '(Locked)' : ''}`;
        const cleanLabel = (rawLabel.trim() || item.name || 'Item').slice(0, 100);

        const descText = item.description && item.description.trim().length > 0
          ? `Own: ${ownedQuantity} | Lv. Req: ${item.levelRequired} | ${item.description.trim()}`
          : `Own: ${ownedQuantity} | Level Requirement: ${item.levelRequired}`;
        const cleanDesc = descText.slice(0, 100);

        const option = new StringSelectMenuOptionBuilder()
          .setLabel(cleanLabel)
          .setValue(item.id.slice(0, 100))
          .setDescription(cleanDesc);

        if (item.emoji && item.emoji.trim().length > 0) {
          try {
            option.setEmoji(item.emoji.trim());
          } catch (err) {}
        }

        shopOptions.push(option);
      });

      if (shopOptions.length >= 1 && shopOptions.length <= 25) {
        itemSelectMenu.addOptions(shopOptions);
        const itemSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(itemSelectMenu);
        container.addActionRowComponents(itemSelectRow);
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`*No valid items available in this category yet. Check back soon!*`)
        );
      }
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`*No items available in this category yet. Check back soon!*`)
      );
    }
  }

  return {
    components: [container],
    files: files,
    flags: MessageFlags.IsComponentsV2
  };
}
