import {
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
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
import { generateCustomerOrderAsync, getActiveUserOrder, processOrderStep, addChangeAmount } from './orderMinigameEngine';
import { JUKEBOX_STATIONS, getJukeboxStation, setJukeboxStation } from './jukeboxEngine';

export async function handleStandMinigameButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }

    if (action === 'order_start') {
      const targetUserId = parts[2];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your stand order minigame.');

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found.');

      const { isOwner, getOwnerFooter } = require('../constants/overseer');
      const isOwnerUser = isOwner(userId);

      let { order, isStockDepleted } = await generateCustomerOrderAsync(userId, user.level);

      if (isStockDepleted && isOwnerUser) {
        const stand = await prisma.iceCreamStand.findFirst({ where: { userId } });
        if (stand) {
          await prisma.iceCreamBatch.upsert({
            where: { id: `owner_batch_${stand.id}` },
            update: { scoops: 50, smallCones: 20, largeCones: 10, smallBoxes: 15, largeBoxes: 10 },
            create: {
              id: `owner_batch_${stand.id}`,
              standId: stand.id,
              flavor: 'vanilla',
              scoops: 50,
              maxScoops: 100,
              cones: 20,
              maxCones: 50,
              pots: 15,
              maxPots: 30,
              smallCones: 20,
              maxSmallCones: 50,
              largeCones: 10,
              maxLargeCones: 30,
              smallBoxes: 15,
              maxSmallBoxes: 30,
              largeBoxes: 10,
              maxLargeBoxes: 20
            }
          });
          const res = await generateCustomerOrderAsync(userId, user.level);
          order = res.order;
          isStockDepleted = res.isStockDepleted;
        }
      }

      if (isStockDepleted || !order) {
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ⚠️ Batch Stock Depleted!\n` +
            `All your ice cream scoops or container boxes are currently empty!\n\n` +
            `• You cannot serve customers until you restock ingredients.\n` +
            `• Head to **\`/shop\`** to purchase flavor refills and cone/box containers!`
          )
        );

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`stand:back_to_stand:${userId}`).setLabel('Return to Stand POV').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`stand:order_start:${userId}`).setLabel('Check Stock Again').setStyle(ButtonStyle.Secondary)
        );
        container.addActionRowComponents(row);

        await interaction.editReply({
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
        });
        return;
      }

      const container = new ContainerBuilder().setAccentColor(0x3B82F6);

      let imagePath = path.join(__dirname, '../../assets/customer_orders', order.officialOrder.imageFile);
      if (!fs.existsSync(imagePath)) {
        imagePath = path.join(__dirname, '../../assets/customer_orders', `order_${order.requestedFlavor}_${order.requestedContainer}.jpg`);
      }
      const files: any[] = [];
      if (fs.existsSync(imagePath)) {
        files.push(new AttachmentBuilder(imagePath, { name: 'customer_order.jpg' }));
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL('attachment://customer_order.jpg')
          )
        );
      }

      const remainingSec = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000));

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 🕹️ Customer Order at Counter!\n` +
          `🟢 **Status**: Active Minigame Order | ⏰ **Time Remaining**: \`${remainingSec}s\`\n` +
          `${order.archetype.emoji} **${order.archetype.name}**: *"I'd like ${order.officialOrder.label}!"*\n\n` +
          `**STEP 1**: Select the requested flavor (\`${order.requestedFlavor.toUpperCase()}\`) below!`
        )
      );

      const flavorRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_flavor:vanilla:${userId}`).setLabel('Vanilla 🍦').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`stand:order_flavor:chocolate:${userId}`).setLabel('Chocolate 🍫').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`stand:order_flavor:strawberry:${userId}`).setLabel('Strawberry 🍓').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`stand:order_flavor:pistachio:${userId}`).setLabel('Pistachio 💚').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`stand:order_flavor:lemon:${userId}`).setLabel('Lemon 🍋').setStyle(ButtonStyle.Primary)
      );

      const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_stop:${userId}`).setLabel('Stop Minigame 🛑').setStyle(ButtonStyle.Danger)
      );

      container.addActionRowComponents(flavorRow);
      container.addActionRowComponents(controlRow);

      const payload = {
        components: [container],
        files: files,
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      };

      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'order_flavor') {
      const flavorChoice = parts[2] || 'vanilla';
      const targetUserId = parts[3];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your order.');

      const { order } = await processOrderStep(userId, 'flavor', flavorChoice);

      const container = new ContainerBuilder().setAccentColor(0x3B82F6);

      let imagePath = path.join(__dirname, '../../assets/customer_orders', order.officialOrder.imageFile);
      if (!fs.existsSync(imagePath)) {
        imagePath = path.join(__dirname, '../../assets/customer_orders', `order_${order.requestedFlavor}_${order.requestedContainer}.jpg`);
      }
      const files: any[] = [];
      if (fs.existsSync(imagePath)) {
        files.push(new AttachmentBuilder(imagePath, { name: 'customer_order.jpg' }));
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL('attachment://customer_order.jpg')
          )
        );
      }

      const remainingSec = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000));

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 🕹️ Customer Order — Step 2!\n` +
          `Selected Flavor: \`${flavorChoice.toUpperCase()}\` ✅ | ⏰ **Time Remaining**: \`${remainingSec}s\`\n\n` +
          `**STEP 2**: Select the requested container (\`${order.requestedContainer.toUpperCase()}\`) below!`
        )
      );

      const containerRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_container:smallCone:${userId}`).setLabel('Small Cone 🍦').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`stand:order_container:largeCone:${userId}`).setLabel('Large Cone 🍦').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`stand:order_container:smallBox:${userId}`).setLabel('Small Box 📦').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`stand:order_container:largeBox:${userId}`).setLabel('Large Box 📦').setStyle(ButtonStyle.Success)
      );

      const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_stop:${userId}`).setLabel('Stop Minigame 🛑').setStyle(ButtonStyle.Danger)
      );

      container.addActionRowComponents(containerRow);
      container.addActionRowComponents(controlRow);

      const payload = {
        components: [container],
        files: files,
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      };

      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'order_container') {
      const containerChoice = parts[2] || 'smallCone';
      const targetUserId = parts[3];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your order.');

      await processOrderStep(userId, 'container', containerChoice);
      const order = getActiveUserOrder(userId);
      if (!order) throw new Error('No active order found.');

      const container = new ContainerBuilder().setAccentColor(0xF59E0B);
      const remainingSec = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000));
      const remainingNeeded = order.requiredChange - order.userGivenChange;

      let files: any[] = [];
      if (fs.existsSync('assets/banners/cash_register.jpg')) {
        files = [new AttachmentBuilder('assets/banners/cash_register.jpg', { name: 'cash_register.jpg' })];
        const gallery = new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://cash_register.jpg')
        );
        container.addMediaGalleryComponents(gallery);
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 💵 Cash Register — Payment & Change!\n` +
          `⏰ **Order Time Remaining**: \`${remainingSec}s\`\n` +
          `Order Total: **$${order.orderTotal}.00** | Customer Handed: 💵 **$${order.customerPaid}.00**\n` +
          `🎯 **Target Change Required**: **$${order.requiredChange}.00**\n\n` +
          `• Given Change So Far: **$${order.userGivenChange}.00**\n` +
          `• Remaining Change Needed: **$${remainingNeeded}.00** ${remainingNeeded < 0 ? `⚠️ *(Overpaid by $${Math.abs(remainingNeeded)}!)*` : remainingNeeded === 0 ? `✅ *(Exact Change!)*` : ''}\n\n` +
          `*Click cash buttons below to count change, then click **Complete Order**!*`
        )
      );

      const changeButtonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_change:1:${userId}`).setLabel('+$1 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:5:${userId}`).setLabel('+$5 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:10:${userId}`).setLabel('+$10 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:20:${userId}`).setLabel('+$20 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:0:${userId}`).setLabel('Reset 🔄').setStyle(ButtonStyle.Danger)
      );

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_confirm_change:${userId}`).setLabel('Complete Order & Give Change ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`stand:order_stop:${userId}`).setLabel('Cancel Order 🛑').setStyle(ButtonStyle.Danger)
      );

      container.addActionRowComponents(changeButtonsRow);
      container.addActionRowComponents(confirmRow);

      const payload = {
        components: [container],
        files: files,
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      };

      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'order_change') {
      const amount = Number(parts[2]) || 0;
      const targetUserId = parts[3];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your order.');

      await processOrderStep(userId, 'change_add', amount.toString());
      const order = getActiveUserOrder(userId);
      if (!order) throw new Error('No active order found.');

      const container = new ContainerBuilder().setAccentColor(0xF59E0B);
      const remainingSec = Math.max(0, Math.ceil((order.expiresAt - Date.now()) / 1000));
      const remainingNeeded = order.requiredChange - order.userGivenChange;

      let files: any[] = [];
      if (fs.existsSync('assets/banners/cash_register.jpg')) {
        files = [new AttachmentBuilder('assets/banners/cash_register.jpg', { name: 'cash_register.jpg' })];
        const gallery = new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://cash_register.jpg')
        );
        container.addMediaGalleryComponents(gallery);
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 💵 Cash Register — Payment & Change!\n` +
          `⏰ **Order Time Remaining**: \`${remainingSec}s\`\n` +
          `Order Total: **$${order.orderTotal}.00** | Customer Handed: 💵 **$${order.customerPaid}.00**\n` +
          `🎯 **Target Change Required**: **$${order.requiredChange}.00**\n\n` +
          `• Given Change So Far: **$${order.userGivenChange}.00**\n` +
          `• Remaining Change Needed: **$${remainingNeeded}.00** ${remainingNeeded < 0 ? `⚠️ *(Overpaid by $${Math.abs(remainingNeeded)}!)*` : remainingNeeded === 0 ? `✅ *(Exact Change!)*` : ''}\n\n` +
          `*Click cash buttons below to count change, then click **Complete Order**!*`
        )
      );

      const changeButtonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_change:1:${userId}`).setLabel('+$1 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:5:${userId}`).setLabel('+$5 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:10:${userId}`).setLabel('+$10 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:20:${userId}`).setLabel('+$20 💵').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`stand:order_change:0:${userId}`).setLabel('Reset 🔄').setStyle(ButtonStyle.Danger)
      );

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_confirm_change:${userId}`).setLabel('Complete Order & Give Change ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`stand:order_stop:${userId}`).setLabel('Cancel Order 🛑').setStyle(ButtonStyle.Danger)
      );

      container.addActionRowComponents(changeButtonsRow);
      container.addActionRowComponents(confirmRow);

      const payload = {
        components: [container],
        files: files,
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      };

      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'order_confirm_change') {
      const targetUserId = parts[2];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your order.');

      const result = await processOrderStep(userId, 'serve', 'done');

      let titleText = `🎉 **PERFECT SERVE & EXACT CHANGE! 🌟**`;
      if ((result as any).isExpired) titleText = `⏰ **ORDER EXPIRED! CUSTOMER LEFT! 😡**`;
      else if ((result as any).isUnderpaid) titleText = `❌ **UNDERPAID CHANGE! CUSTOMER ANGRY! 😡**`;
      else if ((result as any).isOverpaid) titleText = `⚠️ **OVERPAID CHANGE GIVEN! 💵**`;
      else if ((result as any).isWrong) titleText = `❌ **INCORRECT ORDER SERVED! 😡**`;

      const reviewQuote = (result as any).reviewQuote || "3 Stars. Decent.";
      const standRating = (result as any).standRating || 5.0;

      const container = new ContainerBuilder().setAccentColor(result.isPerfect ? 0x48BB78 : (result as any).isWrong || (result as any).isUnderpaid || (result as any).isExpired ? 0xED4245 : 0xEAB308);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${titleText}\n` +
          `${result.order.archetype.emoji} **${result.order.archetype.name}**: *"${reviewQuote}"*\n\n` +
          `⭐ **Stand Rating**: **${standRating} / 5.0**\n` +
          `Collected ${e('cash')} **+$${(result.rewardCash || 0).toLocaleString()}** Cash & **+${result.rewardExp} EXP**!`
        )
      );

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`stand:order_start:${userId}`).setLabel('Serve Next Customer 🍨').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`stand:order_stop:${userId}`).setLabel('Exit to Stand Overview 🏪').setStyle(ButtonStyle.Secondary)
      );

      container.addActionRowComponents(actionRow);

      const payload = {
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      };

      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'order_stop') {
      const stand = await prisma.iceCreamStand.findFirst({ where: { userId } });
      if (stand) {
        const { buildStandMessage } = require('../builders/standBuilder');
        const payload = await buildStandMessage(stand.id);
        await interaction.editReply(payload as any);
      } else {
        const container = new ContainerBuilder().setAccentColor(0x3B82F6);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${e('check_green')} Minigame stopped. Returned to stand!`)
        );
        await interaction.editReply({ components: [container] } as any);
      }
      return;
    }

    if (action === 'jukebox_menu') {
      const targetUserId = parts[2];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your jukebox menu.');

      const activeStation = getJukeboxStation(userId);

      const container = new ContainerBuilder().setAccentColor(0x9B59B6);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 📻 Stand Jukebox Radio Hub\n` +
          `Current Active Station: ${activeStation.emoji} **${activeStation.name}** (\`${activeStation.buffLabel}\`)\n\n` +
          `Select a radio station below to switch stand music and activate passive store buffs!`
        )
      );

      const stationKeys = Object.keys(JUKEBOX_STATIONS);
      const stationRow = new ActionRowBuilder<ButtonBuilder>();
      for (const k of stationKeys) {
        const st = JUKEBOX_STATIONS[k]!;
        stationRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`stand:jukebox_set:${k}:${userId}`)
            .setLabel(`${st.name}`)
            .setEmoji(st.emoji)
            .setStyle(st.key === activeStation.key ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
      }

      container.addActionRowComponents(stationRow);

      await interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
      return;
    }

    if (action === 'jukebox_set') {
      const stationKey = parts[2] || 'synthwave';
      const targetUserId = parts[3];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your jukebox menu.');

      const newStation = setJukeboxStation(userId, stationKey);

      const container = new ContainerBuilder().setAccentColor(0x48BB78);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `📻 **Radio Station Switched!** Now playing ${newStation.emoji} **${newStation.name}**!\n` +
          `• Active Buff: \`${newStation.buffLabel}\``
        )
      );

      await interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
      return;
    }

  } catch (error: any) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} ${error.message || 'Minigame error.'}`)
    );
    await interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
    });
  }
}
