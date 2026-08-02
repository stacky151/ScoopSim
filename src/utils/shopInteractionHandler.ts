import { ButtonInteraction } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { buildShopMessage } from '../builders/shopBuilder';
import { e } from '../constants/emojis';
import { isOverseer } from '../constants/overseer';

export async function handleShopButton(interaction: any, parts: string[]) {
  const action = parts[1];
  let targetId = parts[2];
  const userId = interaction.user.id;

  if (action === 'buy_select' && interaction.isStringSelectMenu()) {
    targetId = interaction.values[0];
  }

  if (!targetId) {
    return interaction.reply({ content: `${e('cross_red')} Invalid shop operation.`, ephemeral: true });
  }

  await interaction.deferUpdate();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      inventory: true,
      workers: true,
    }
  });

  if (!user) {
    return replyV2(interaction, `${e('cross_red')} User profile not found. Run \`/start\` first.`, 0xED4245);
  }

  const isOverseerUser = isOverseer(userId);

  try {
    if (action === 'category') {
      const payload = await buildShopMessage(userId, targetId);
      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'buy_item' || action === 'buy_select') {
      const item = await prisma.shopItem.findUnique({ where: { id: targetId } });
      if (!item) {
        return interaction.followUp({ content: `${e('cross_red')} Item not found in shop database.`, ephemeral: true });
      }

      const existingInv = user.inventory.find(i => i.itemId === item.id);
      const currentQty = existingInv ? existingInv.quantity : 0;
      const MAX_STOCK_LIMIT = 10;

      if ((item.type === 'food' || item.type === 'item') && currentQty >= MAX_STOCK_LIMIT && !isOverseerUser) {
        return replyV2(
          interaction,
          `⚠️ **Storage Limit Reached!** You already have **${currentQty}/${MAX_STOCK_LIMIT}** packs of **${item.name}** in stock.\n` +
          `Use your current refills or upgrade your storage in \`/stand\` before buying more!`,
          0xF59E0B
        );
      }

      if (!isOverseerUser && user.money < item.price) {
        return replyV2(
          interaction,
          `${e('cross_red')} Insufficient cash! You need **$${item.price}** to buy **${item.name}** but you only have **$${user.money}**.`,
          0xED4245
        );
      }

      const costToDeduct = isOverseerUser ? 0 : item.price;

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          if (costToDeduct > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { money: { decrement: costToDeduct } }
            });
          }

          await tx.userInventory.upsert({
            where: { userId_itemId: { userId, itemId: item.id } },
            update: { quantity: { increment: 1 } },
            create: { userId, itemId: item.id, quantity: 1 }
          });

          if (item.name === 'Upgraded Freezer') {
            await tx.iceCreamBatch.updateMany({
              where: { stand: { userId } },
              data: { maxScoops: { increment: 50 } }
            });
          } else if (item.name === 'High-Capacity Cone Rack') {
            await tx.iceCreamBatch.updateMany({
              where: { stand: { userId } },
              data: {
                maxCones: { increment: 30 },
                maxSmallCones: { increment: 30 },
                maxLargeCones: { increment: 15 }
              }
            });
          }

          if (item.type === 'food' && item.name.endsWith('Refill')) {
            const getFlavorKeyFromItemName = (name: string): string => {
              const nameLower = name.toLowerCase();
              if (nameLower.includes('vanilla')) return 'vanilla';
              if (nameLower.includes('chocolate')) return 'chocolate';
              if (nameLower.includes('strawberry')) return 'strawberry';
              if (nameLower.includes('mint')) return 'mint_chip';
              if (nameLower.includes('pistachio')) return 'pistachio';
              if (nameLower.includes('bubblegum')) return 'bubblegum';
              if (nameLower.includes('lemon')) return 'lemon';
              if (nameLower.includes('mango')) return 'mango';
              if (nameLower.includes('coconut')) return 'coconut';
              if (nameLower.includes('caramel')) return 'caramel';
              if (nameLower.includes('blueberry')) return 'blueberry';
              if (nameLower.includes('matcha')) return 'matcha';
              if (nameLower.includes('cherry')) return 'cherry';
              return '';
            };

            const flavorKey = getFlavorKeyFromItemName(item.name);
            const stands = await tx.iceCreamStand.findMany({
              where: { userId },
              include: { batches: true }
            });

            if (stands.length > 0 && flavorKey) {
              const userInv = await tx.userInventory.findMany({
                where: { userId },
                include: { item: true }
              });
              const freezersCount = userInv.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
              const racksCount = userInv.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;

              for (const stand of stands) {
                if (!stand.batches.some(b => b.flavor === flavorKey)) {
                  const initialMaxScoops = 50 + (freezersCount * 50) + ((stand.storageLevel - 1) * 100);
                  const initialMaxSmallCones = 20 + (racksCount * 30) + ((stand.storageLevel - 1) * 50);
                  const initialMaxLargeCones = 10 + (racksCount * 15) + ((stand.storageLevel - 1) * 25);
                  const initialMaxSmallBoxes = 15 + ((stand.storageLevel - 1) * 30);
                  const initialMaxLargeBoxes = 10 + ((stand.storageLevel - 1) * 20);

                  await tx.iceCreamBatch.create({
                    data: {
                      standId: stand.id,
                      flavor: flavorKey,
                      scoops: 0,
                      maxScoops: initialMaxScoops,
                      cones: 0,
                      maxCones: initialMaxSmallCones,
                      pots: 0,
                      maxPots: initialMaxSmallBoxes,
                      smallCones: 0,
                      maxSmallCones: initialMaxSmallCones,
                      largeCones: 0,
                      maxLargeCones: initialMaxLargeCones,
                      smallBoxes: 0,
                      maxSmallBoxes: initialMaxSmallBoxes,
                      largeBoxes: 0,
                      maxLargeBoxes: initialMaxLargeBoxes
                    }
                  });
                }
              }
            }
          }

          if (item.type === 'decoration') {
            let themeId = '';
            if (item.name === 'Cyberpunk Neon Theme') themeId = 'cyberpunk';
            else if (item.name === 'Retro Arcade Theme') themeId = 'retro';
            else if (item.name === 'Luxury Gold Theme') themeId = 'luxury';
            if (themeId) {
              await tx.userTheme.upsert({
                where: { userId_themeId: { userId, themeId } },
                update: {},
                create: { userId, themeId }
              });
              await tx.user.update({
                where: { id: userId },
                data: { equippedTheme: themeId }
              });
            }
          }
        });
      });

      await replyV2(interaction, `${e('check_green')} Purchased **${item.name}** for **$${costToDeduct}**! ${isOverseerUser ? '*(👑 Overseer Override)*' : ''}`, 0x48BB78);
    }

    if (action === 'buy_service') {
      const serviceType = targetId;
      const basePrices: Record<string, number> = {
        cleaner: 200,
        cashier: 300,
        maker: 400,
        manager: 500,
      };
      const basePrice = basePrices[serviceType] || 200;
      const activeWorker = user.workers.find(w => w.type === serviceType);
      const currentLevel = activeWorker ? activeWorker.level : 0;
      const price = Math.floor(basePrice * Math.pow(1.6, currentLevel));
      const costToDeduct = isOverseerUser ? 0 : price;

      if (!isOverseerUser && user.money < price) {
        return replyV2(
          interaction,
          `${e('cross_red')} Insufficient cash! You need **$${price}** to hire/upgrade this worker but you only have **$${user.money}**.`,
          0xED4245
        );
      }

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          if (costToDeduct > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { money: { decrement: costToDeduct } }
            });
          }

          if (activeWorker) {
            await tx.worker.update({
              where: { id: activeWorker.id },
              data: { level: { increment: 1 } }
            });
          } else {
            await tx.worker.create({
              data: { userId, type: serviceType, level: 1 }
            });
          }
        });
      });

      await replyV2(
        interaction,
        `${e('check_green')} Successfully ${currentLevel > 0 ? 'upgraded' : 'hired'} your **${serviceType.toUpperCase()}** for **$${price}**!`,
        0x48BB78
      );
    }

    const findActiveCategory = (components: any[]): string | null => {
      for (const comp of components) {
        if (comp.customId && comp.customId.startsWith('shop:category:')) {
          if (comp.style === 1) {
            return comp.customId.split(':')[2];
          }
        }
        const children = comp.components || comp.elements || [];
        if (children.length > 0) {
          const result = findActiveCategory(children);
          if (result) return result;
        }
      }
      return null;
    };

    const category = findActiveCategory(interaction.message.components) || 'food';
    const payload = await buildShopMessage(userId, category);
    await interaction.editReply(payload as any);

  } catch (error) {
    console.error('Error buying shop item:', error);
    await replyV2(interaction, `${e('cross_red')} An error occurred while processing your purchase.`, 0xED4245);
  }
}

async function replyV2(interaction: any, text: string, color: number) {
  const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  return interaction.followUp({
    components: [container],
    flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
  });
}
