import { ButtonInteraction } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { buildStandMessage, buildStandUpgradesMessage, buildStandSalesLogMessage, buildStandHireMessage } from '../builders/standBuilder';
import { buildCountryStandsMessage } from '../builders/openstandBuilder';
import { startActiveStandLoop, stopActiveStandLoop, standPageStates } from './standActiveLoop';
import { getActiveDurationMinutes } from './simulationEngine';
import { e } from '../constants/emojis';

export async function handleStandButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];

  if (action?.startsWith('order_') || action?.startsWith('jukebox_')) {
    const { handleStandMinigameButton } = require('./standMinigameHandler');
    return handleStandMinigameButton(interaction, parts);
  }

  let standId = parts[2];
  if ((action === 'upgrade' || action === 'hire_worker') && parts[3]) {
    standId = parts[3];
  }
  const userId = interaction.user.id;

  if (action === 'main') {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate().catch(() => {});
    }
    const stand = await prisma.iceCreamStand.findFirst({
      where: { userId },
      orderBy: { lastUpdated: 'desc' }
    });
    if (!stand) {
      return replyV2(interaction, `${e('cross_red')} No active stand found. Run \`/openstand\` to open one!`, 0xED4245);
    }
    const payload = await buildStandMessage(stand.id);
    await interaction.editReply({
      components: payload.components,
      files: payload.files,
      attachments: []
    } as any);
    return;
  }

  if (action === 'rename') {
    if (!standId) return;
    const stand = await prisma.iceCreamStand.findUnique({ where: { id: standId } });
    if (!stand) return;
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder: ARB } = require('discord.js');
    const modal = new ModalBuilder()
      .setCustomId(`stand_rename:${standId}`)
      .setTitle(`Rename ${stand.name.slice(0, 25)}`);
    const nameInput = new TextInputBuilder()
      .setCustomId('stand_name')
      .setLabel('New Stand Name')
      .setStyle(TextInputStyle.Short)
      .setValue(stand.name)
      .setMinLength(3)
      .setMaxLength(40)
      .setRequired(true);
    modal.addComponents(new ARB().addComponents(nameInput));
    await interaction.showModal(modal);
    return;
  }

  if (!standId) {
    return replyV2(interaction, `${e('cross_red')} Invalid stand operation.`, 0xED4245);
  }

  const { MessageFlags } = require('discord.js');
  if (interaction.message && !(interaction.message.flags && interaction.message.flags.has(MessageFlags.Ephemeral))) {
    const { standMessages } = require('./standActiveLoop');
    standMessages.set(standId, interaction.message);
  }

  await interaction.deferUpdate();

  const stand = await prisma.iceCreamStand.findUnique({
    where: { id: standId },
    include: {
      batches: true,
      user: {
        include: {
          inventory: {
            include: { item: true }
          },
          workers: true
        }
      }
    }
  });

  if (!stand || stand.userId !== userId) {
    return replyV2(interaction, `${e('cross_red')} You do not own this ice cream stand!`, 0xED4245);
  }

  const user = stand.user;

  try {
    if (action === 'select_open') {
      const now = new Date();
      const activeUntil = new Date(now.getTime() + getActiveDurationMinutes(stand.activeDurationLevel) * 60 * 1000);

      await safeTransaction(async () => {
        await prisma.iceCreamStand.update({
          where: { id: standId },
          data: { isActive: true, activeUntil }
        });
      });
      const { calculateOfflineEarnings } = require('./simulationEngine');
      await calculateOfflineEarnings(standId);

      const payload = await buildStandMessage(standId);
      await interaction.editReply({
        components: payload.components,
        files: payload.files,
        attachments: []
      } as any);

      startActiveStandLoop(standId, interaction.message);
      return;
    }

    if (action === 'fast_buy') {
      const itemId = parts[3];
      if (!itemId) return;

      const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
      if (!item) {
        return replyV2(interaction, `${e('cross_red')} Item not found in database.`, 0xED4245);
      }

      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { inventory: { include: { item: true } } }
      });

      if (!freshUser) {
        return replyV2(interaction, `${e('cross_red')} User not found.`, 0xED4245);
      }

      if (freshUser.money < item.price) {
        return replyV2(interaction, `${e('cross_red')} Insufficient money to buy ${item.name}.`, 0xED4245);
      }

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

      const getItemNameFromFlavorKey = (flavor: string): string => {
        if (flavor === 'pistachio') return 'Pistachio Gelato Refill';
        if (flavor === 'mint_chip') return 'Mint Chip Flavor Refill';
        if (flavor === 'lemon') return 'Lemon Sorbet Refill';
        if (flavor === 'mango') return 'Mango Delight Refill';
        if (flavor === 'coconut') return 'Coconut Cream Refill';
        if (flavor === 'caramel') return 'Salted Caramel Refill';
        if (flavor === 'blueberry') return 'Blueberry Splash Refill';
        if (flavor === 'matcha') return 'Matcha Green Tea Refill';
        if (flavor === 'cherry') return 'Cherry Blossom Refill';
        return `${flavor.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Flavor Refill`;
      };

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { money: { decrement: item.price } }
        });

        await tx.userInventory.upsert({
          where: { userId_itemId: { userId, itemId: item.id } },
          update: { quantity: { increment: 1 } },
          create: { userId, itemId: item.id, quantity: 1 }
        });

        if (item.type === 'food' && item.name.endsWith('Refill')) {
          const flavorKey = getFlavorKeyFromItemName(item.name);
          const standRec = await tx.iceCreamStand.findUnique({
            where: { id: standId },
            include: { batches: true }
          });

          if (standRec && flavorKey && !standRec.batches.some(b => b.flavor === flavorKey)) {
            const userInv = await tx.userInventory.findMany({
              where: { userId },
              include: { item: true }
            });
            const freezersCount = userInv.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
            const racksCount = userInv.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;

            const initialMaxScoops = 50 + (freezersCount * 50);
            const initialMaxSmallCones = 20 + (racksCount * 30);
            const initialMaxLargeCones = 10 + (racksCount * 15);
            const initialMaxSmallBoxes = 15;
            const initialMaxLargeBoxes = 10;

            await tx.iceCreamBatch.create({
              data: {
                standId: standId,
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
      });
    });

      let refilled = false;
      const postBuyUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { inventory: { include: { item: true } } }
      });
      const freshStand = await prisma.iceCreamStand.findUnique({
        where: { id: standId },
        include: { batches: true }
      });

      if (postBuyUser && freshStand) {
        const freezersCount = postBuyUser.inventory.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
        const racksCount = postBuyUser.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;
        const maxScoopsLimit = 50 + (freezersCount * 50) + ((freshStand.storageLevel - 1) * 100);
        const maxSmallConesLimit = 20 + (racksCount * 30) + ((freshStand.storageLevel - 1) * 50);
        const maxLargeConesLimit = 10 + (racksCount * 15) + ((freshStand.storageLevel - 1) * 25);
        const maxSmallBoxesLimit = 15 + ((freshStand.storageLevel - 1) * 30);
        const maxLargeBoxesLimit = 10 + ((freshStand.storageLevel - 1) * 20);

        await safeTransaction(async () => {
          await prisma.$transaction(async (tx) => {
          const localInventory = new Map<string, number>();
          for (const inv of postBuyUser.inventory) {
            localInventory.set(inv.item.name, inv.quantity);
          }

          for (const batch of freshStand.batches) {
            if (item.type === 'food' && item.name.endsWith('Refill')) {
              const flavorItemName = getItemNameFromFlavorKey(batch.flavor);
              if (flavorItemName === item.name) {
                const currentQty = localInventory.get(flavorItemName) || 0;
                if (currentQty > 0) {
                  const invRecord = postBuyUser.inventory.find(i => i.item.name === flavorItemName);
                  if (invRecord) {
                    await tx.userInventory.update({
                      where: { userId_itemId: { userId, itemId: invRecord.itemId } },
                      data: { quantity: { decrement: 1 } }
                    });
                    localInventory.set(flavorItemName, currentQty - 1);
                    await tx.iceCreamBatch.update({
                      where: { id: batch.id },
                      data: { scoops: Math.min(maxScoopsLimit, batch.scoops + 50) }
                    });
                    refilled = true;
                  }
                }
              }
            } else if (item.name === 'Box of Small Cones') {
              const neededCones = maxSmallConesLimit - batch.smallCones;
              if (neededCones > 0) {
                const currentQty = localInventory.get('Box of Small Cones') || 0;
                if (currentQty > 0) {
                  const coneRecord = postBuyUser.inventory.find(i => i.item.name === 'Box of Small Cones');
                  if (coneRecord) {
                    await tx.userInventory.update({
                      where: { userId_itemId: { userId, itemId: coneRecord.itemId } },
                      data: { quantity: { decrement: 1 } }
                    });
                    localInventory.set('Box of Small Cones', currentQty - 1);
                    await tx.iceCreamBatch.update({
                      where: { id: batch.id },
                      data: { smallCones: Math.min(maxSmallConesLimit, batch.smallCones + 50) }
                    });
                    refilled = true;
                  }
                }
              }
            } else if (item.name === 'Box of Large Cones') {
              const neededCones = maxLargeConesLimit - batch.largeCones;
              if (neededCones > 0) {
                const currentQty = localInventory.get('Box of Large Cones') || 0;
                if (currentQty > 0) {
                  const coneRecord = postBuyUser.inventory.find(i => i.item.name === 'Box of Large Cones');
                  if (coneRecord) {
                    await tx.userInventory.update({
                      where: { userId_itemId: { userId, itemId: coneRecord.itemId } },
                      data: { quantity: { decrement: 1 } }
                    });
                    localInventory.set('Box of Large Cones', currentQty - 1);
                    await tx.iceCreamBatch.update({
                      where: { id: batch.id },
                      data: { largeCones: Math.min(maxLargeConesLimit, batch.largeCones + 50) }
                    });
                    refilled = true;
                  }
                }
              }
            } else if (item.name === 'Box of Small Boxes') {
              const neededBoxes = maxSmallBoxesLimit - batch.smallBoxes;
              if (neededBoxes > 0) {
                const currentQty = localInventory.get('Box of Small Boxes') || 0;
                if (currentQty > 0) {
                  const boxRecord = postBuyUser.inventory.find(i => i.item.name === 'Box of Small Boxes');
                  if (boxRecord) {
                    await tx.userInventory.update({
                      where: { userId_itemId: { userId, itemId: boxRecord.itemId } },
                      data: { quantity: { decrement: 1 } }
                    });
                    localInventory.set('Box of Small Boxes', currentQty - 1);
                    await tx.iceCreamBatch.update({
                      where: { id: batch.id },
                      data: { smallBoxes: Math.min(maxSmallBoxesLimit, batch.smallBoxes + 50) }
                    });
                    refilled = true;
                  }
                }
              }
            } else if (item.name === 'Box of Large Boxes') {
              const neededBoxes = maxLargeBoxesLimit - batch.largeBoxes;
              if (neededBoxes > 0) {
                const currentQty = localInventory.get('Box of Large Boxes') || 0;
                if (currentQty > 0) {
                  const boxRecord = postBuyUser.inventory.find(i => i.item.name === 'Box of Large Boxes');
                  if (boxRecord) {
                    await tx.userInventory.update({
                      where: { userId_itemId: { userId, itemId: boxRecord.itemId } },
                      data: { quantity: { decrement: 1 } }
                    });
                    localInventory.set('Box of Large Boxes', currentQty - 1);
                    await tx.iceCreamBatch.update({
                      where: { id: batch.id },
                      data: { largeBoxes: Math.min(maxLargeBoxesLimit, batch.largeBoxes + 50) }
                    });
                    refilled = true;
                  }
                }
              }
            }
          }
          if (refilled) {
            await tx.iceCreamStand.update({
              where: { id: standId },
              data: { notifiedEmpty: false }
            });
          }
        });
      });
    }

      const postUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { inventory: { include: { item: true } } }
      });
      const postStand = await prisma.iceCreamStand.findUnique({
        where: { id: standId },
        include: { batches: true }
      });

      let missingItemsNeeded: { name: string; type: string }[] = [];
      let errorMsgs: string[] = [];

      if (postUser && postStand) {
        const freezersCount = postUser.inventory.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
        const racksCount = postUser.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;
        const maxScoopsLimit = 50 + (freezersCount * 50) + ((postStand.storageLevel - 1) * 100);
        const maxSmallConesLimit = 20 + (racksCount * 30) + ((postStand.storageLevel - 1) * 50);
        const maxLargeConesLimit = 10 + (racksCount * 15) + ((postStand.storageLevel - 1) * 25);
        const maxSmallBoxesLimit = 15 + ((postStand.storageLevel - 1) * 30);
        const maxLargeBoxesLimit = 10 + ((postStand.storageLevel - 1) * 20);

        for (const batch of postStand.batches) {
          if (batch.scoops <= 0) {
            const flavorItemName = getItemNameFromFlavorKey(batch.flavor);
            const hasInv = postUser.inventory.some(i => i.item.name === flavorItemName && i.quantity > 0);
            if (!hasInv) {
              errorMsgs.push(`Out of **${flavorItemName}**! Buy it in the shop.`);
              if (!missingItemsNeeded.some(item => item.name === flavorItemName)) {
                missingItemsNeeded.push({ name: flavorItemName, type: 'food' });
              }
            }
          }

          if (batch.smallCones <= 0) {
            const hasInv = postUser.inventory.some(i => i.item.name === 'Box of Small Cones' && i.quantity > 0);
            if (!hasInv) {
              errorMsgs.push('Out of **Box of Small Cones**! Buy it in the shop.');
              if (!missingItemsNeeded.some(item => item.name === 'Box of Small Cones')) {
                missingItemsNeeded.push({ name: 'Box of Small Cones', type: 'item' });
              }
            }
          }

          if (batch.largeCones <= 0) {
            const hasInv = postUser.inventory.some(i => i.item.name === 'Box of Large Cones' && i.quantity > 0);
            if (!hasInv) {
              if (postUser.level < 2) {
                errorMsgs.push('🔒 Out of **Box of Large Cones**! *(Locked — Unlocks at Level 2)*');
              } else {
                errorMsgs.push('Out of **Box of Large Cones**! Buy it in the shop.');
              }
              if (!missingItemsNeeded.some(item => item.name === 'Box of Large Cones')) {
                missingItemsNeeded.push({ name: 'Box of Large Cones', type: 'item' });
              }
            }
          }

          if (batch.smallBoxes <= 0) {
            const hasInv = postUser.inventory.some(i => i.item.name === 'Box of Small Boxes' && i.quantity > 0);
            if (!hasInv) {
              errorMsgs.push('Out of **Box of Small Boxes**! Buy it in the shop.');
              if (!missingItemsNeeded.some(item => item.name === 'Box of Small Boxes')) {
                missingItemsNeeded.push({ name: 'Box of Small Boxes', type: 'item' });
              }
            }
          }

          if (batch.largeBoxes <= 0) {
            const hasInv = postUser.inventory.some(i => i.item.name === 'Box of Large Boxes' && i.quantity > 0);
            if (!hasInv) {
              if (postUser.level < 3) {
                errorMsgs.push('🔒 Out of **Box of Large Boxes**! *(Locked — Unlocks at Level 3)*');
              } else {
                errorMsgs.push('Out of **Box of Large Boxes**! Buy it in the shop.');
              }
              if (!missingItemsNeeded.some(item => item.name === 'Box of Large Boxes')) {
                missingItemsNeeded.push({ name: 'Box of Large Boxes', type: 'item' });
              }
            }
          }
        }
      }

      let autoOpened = false;
      if (postStand && !postStand.isActive && postStand.cleanliness > 0) {
        const hasScoops = postStand.batches.some(b => b.scoops > 0);
        const hasContainers = postStand.batches.some(
          b => b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0
        );
        if (hasScoops && hasContainers) {
          const now = new Date();
          const activeUntil = new Date(now.getTime() + getActiveDurationMinutes(postStand.activeDurationLevel) * 60 * 1000);
          await safeTransaction(async () => {
            await prisma.iceCreamStand.update({
              where: { id: standId },
              data: { isActive: true, activeUntil }
            });
          });
          autoOpened = true;
        }
      }

      const { standMessages } = require('./standActiveLoop');
      const mainMsg = standMessages.get(standId);

      if (mainMsg) {
        let isUpgradesPage = false;
        const mainComponents: any = mainMsg.components;
        if (mainComponents && mainComponents.length > 0) {
          for (const row of mainComponents) {
            if (row.components && row.components.length > 0) {
              for (const component of row.components) {
                if (component.customId && (component.customId.startsWith('stand:upgrade:') || component.customId.startsWith('stand:back_to_stand:'))) {
                  isUpgradesPage = true;
                  break;
                }
              }
            }
            if (isUpgradesPage) break;
          }
        }

        const mainPayload: any = isUpgradesPage
          ? await buildStandUpgradesMessage(standId)
          : await buildStandMessage(standId);

        await mainMsg.edit({
          components: mainPayload.components,
          files: mainPayload.files || [],
          attachments: []
        } as any).catch((err: any) => console.error('Failed to edit main message during fast buy:', err));

        if (autoOpened) {
          startActiveStandLoop(standId, mainMsg);
        }
      }

      if (missingItemsNeeded.length > 0) {
        const missingNames = missingItemsNeeded.map(i => i.name);
        const shopItems = await prisma.shopItem.findMany({
          where: { name: { in: missingNames } }
        });

        const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${e('check_green')} Purchased **${item.name}**!\n\n${e('cross_red')} **Still missing other ingredients to reopen:**\n${errorMsgs.map(m => `• ${m}`).join('\n')}`
          )
        );

        const row = new ActionRowBuilder();
        for (const missing of missingItemsNeeded) {
          const shopItem = shopItems.find(i => i.name === missing.name);
          if (shopItem) {
            const isLocked = postUser ? postUser.level < shopItem.levelRequired : false;
            const canAfford = postUser ? postUser.money >= shopItem.price : false;
            const shortName = shopItem.name.replace(' Flavor Refill', '').replace(' Gelato Refill', '').replace('Box of ', '');
            const labelText = isLocked
              ? `🔒 ${shortName} (Lv. ${shopItem.levelRequired} Locked)`
              : `Buy & Refill ${shortName} ($${shopItem.price})`;
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`stand:fast_buy:${standId}:${shopItem.id}`)
                .setLabel(labelText)
                .setStyle(isLocked ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!canAfford || isLocked)
            );
          }
        }

        if (row.components.length > 0) {
          container.addActionRowComponents(row);
        }

        await interaction.editReply({
          components: [container]
        });
      } else {
        const { ContainerBuilder, TextDisplayBuilder } = require('discord.js');
        const container = new ContainerBuilder().setAccentColor(0x48BB78);
        if (autoOpened) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${e('check_green')} Purchased and consumed **${item.name}**!\n\n${e('dot_green')} **Shop back opened!**`
            )
          );
        } else {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${e('check_green')} Purchased and consumed **${item.name}**! All batches are fully stocked.`
            )
          );
        }

        await interaction.editReply({
          components: [container]
        });
      }
      return;
    }

    if (action === 'upgrades_menu') {
      standPageStates.set(standId, 'upgrades');
      const payload = await buildStandUpgradesMessage(standId);
      await interaction.editReply({
        components: payload.components,
        attachments: []
      } as any);
      return;
    }

    if (action === 'hire_menu') {
      standPageStates.set(standId, 'stand');
      const payload = await buildStandHireMessage(standId);
      await interaction.editReply({
        components: payload.components,
        attachments: []
      } as any);
      return;
    }

    if (action === 'hire_worker') {
      const workerType = parts[2];
      const actualStandId = parts[3];
      if (!workerType || !actualStandId) return;

      const WORKER_BASE_PRICES: Record<string, { price: number; lvReq: number }> = {
        cleaner:  { price: 200, lvReq: 2 },
        cashier:  { price: 300, lvReq: 3 },
        maker:    { price: 400, lvReq: 5 },
        manager:  { price: 500, lvReq: 7 },
      };

      const config = WORKER_BASE_PRICES[workerType];
      if (!config) return;

      const { isOwner } = require('../constants/overseer');
      const isOwnerUser = isOwner(userId);

      if (!isOwnerUser && user.level < config.lvReq) {
        return replyV2(interaction, `${e('lock')} You need to be **Level ${config.lvReq}** to hire this worker.`, 0xED4245);
      }

      const existingWorker = user.workers.find(w => w.type === workerType);
      const currentLevel = existingWorker ? existingWorker.level : 0;
      const cost = config.price * (currentLevel + 1);
      const costToDeduct = isOwnerUser ? 0 : cost;

      if (!isOwnerUser && user.money < cost) {
        return replyV2(interaction, `${e('cross_red')} Insufficient cash! You need **$${cost}** to ${currentLevel > 0 ? 'upgrade' : 'hire'} this worker.`, 0xED4245);
      }

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          if (costToDeduct > 0) {
            await tx.user.update({
              where: { id: userId },
              data: { money: { decrement: costToDeduct } }
            });
          }

          if (existingWorker) {
            await tx.worker.update({
              where: { id: existingWorker.id },
              data: { level: { increment: 1 } }
            });
          } else {
            await tx.worker.create({
              data: { userId, type: workerType, level: 1 }
            });
          }
        });
      });

      const actionText = existingWorker
        ? `${e('check_green')} **${workerType.charAt(0).toUpperCase() + workerType.slice(1)}** upgraded to **Level ${currentLevel + 1}**! **-$${cost}** charged.`
        : `${e('check_green')} **${workerType.charAt(0).toUpperCase() + workerType.slice(1)}** hired! **-$${cost}** charged.`;

      await replyV2(interaction, actionText, 0x48BB78);

      const payload = await buildStandHireMessage(actualStandId);
      await interaction.editReply({
        components: payload.components,
        attachments: []
      } as any);
      return;
    }

    if (action === 'back_to_stand') {
      standPageStates.set(standId, 'stand');
      const payload = await buildStandMessage(standId);
      await interaction.editReply({
        components: payload.components,
        files: payload.files,
        attachments: []
      } as any);
      return;
    }

    if (action === 'sales_log') {
      standPageStates.set(standId, 'sales_log');
      const payload = await buildStandSalesLogMessage(standId);
      await interaction.editReply({
        components: payload.components,
        attachments: []
      } as any);
      return;
    }

    if (action === 'refresh_log') {
      const payload = await buildStandSalesLogMessage(standId);
      await interaction.editReply({
        components: payload.components,
        attachments: []
      } as any);
      return;
    }

    if (action === 'upgrade') {
      const upgradeType = parts[2];
      const actualStandId = parts[3];
      if (!actualStandId) return;

      const { isOwner } = require('../constants/overseer');
      const isOwnerUser = isOwner(userId);

      const latestStand = await prisma.iceCreamStand.findUnique({
        where: { id: actualStandId }
      });
      if (!latestStand) return;

      let cost = 0;
      if (upgradeType === 'storage') cost = latestStand.storageLevel * 500;
      else if (upgradeType === 'interest') cost = latestStand.interestLevel * 800;
      else if (upgradeType === 'duration') cost = latestStand.activeDurationLevel * 400;

      const costToDeduct = isOwnerUser ? 0 : cost;

      if (!isOwnerUser && user.money < cost) {
        return replyV2(interaction, `${e('cross_red')} Insufficient cash! You need **$${cost}** to buy this upgrade.`, 0xED4245);
      }

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
        if (costToDeduct > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { money: { decrement: costToDeduct } }
          });
        }

        if (upgradeType === 'storage') {
          const nextLevel = latestStand.storageLevel + 1;
          await tx.iceCreamStand.update({
            where: { id: actualStandId },
            data: { storageLevel: nextLevel }
          });

          const userInv = await tx.userInventory.findMany({
            where: { userId },
            include: { item: true }
          });
          const freezersCount = userInv.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
          const racksCount = userInv.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;

          const newMaxScoops = 50 + (freezersCount * 50) + ((nextLevel - 1) * 100);
          const newMaxSmallCones = 20 + (racksCount * 30) + ((nextLevel - 1) * 50);
          const newMaxLargeCones = 10 + (racksCount * 15) + ((nextLevel - 1) * 25);
          const newMaxSmallBoxes = 15 + ((nextLevel - 1) * 30);
          const newMaxLargeBoxes = 10 + ((nextLevel - 1) * 20);

          await tx.iceCreamBatch.updateMany({
            where: { standId: actualStandId },
            data: {
              maxScoops: newMaxScoops,
              maxSmallCones: newMaxSmallCones,
              maxLargeCones: newMaxLargeCones,
              maxSmallBoxes: newMaxSmallBoxes,
              maxLargeBoxes: newMaxLargeBoxes,
            }
          });
        } else if (upgradeType === 'interest') {
          await tx.iceCreamStand.update({
            where: { id: actualStandId },
            data: { interestLevel: { increment: 1 } }
          });
        } else if (upgradeType === 'duration') {
          const nextLevel = latestStand.activeDurationLevel + 1;
          await tx.iceCreamStand.update({
            where: { id: actualStandId },
            data: { activeDurationLevel: nextLevel }
          });
        }
      });
    });

      await replyV2(interaction, `${e('check_green')} Stand upgrade purchased successfully!`, 0x48BB78);
      const payload = await buildStandUpgradesMessage(actualStandId);
      await interaction.editReply(payload as any);
      return;
    }

    if (action === 'refill_all' || action === 'batches_menu' || action === 'containers_menu') {
      let refilledAny = false;
      let errorMsgs: string[] = [];
      let missingItemsNeeded: { name: string; type: string }[] = [];

      const freezersCount = user.inventory.find(i => i.item.name === 'Upgraded Freezer')?.quantity || 0;
      const racksCount = user.inventory.find(i => i.item.name === 'High-Capacity Cone Rack')?.quantity || 0;
      const maxScoopsLimit = 50 + (freezersCount * 50) + ((stand.storageLevel - 1) * 100);
      const maxSmallConesLimit = 20 + (racksCount * 30) + ((stand.storageLevel - 1) * 50);
      const maxLargeConesLimit = 10 + (racksCount * 15) + ((stand.storageLevel - 1) * 25);
      const maxSmallBoxesLimit = 15 + ((stand.storageLevel - 1) * 30);
      const maxLargeBoxesLimit = 10 + ((stand.storageLevel - 1) * 20);

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
        const localInventory = new Map<string, number>();
        for (const inv of user.inventory) {
          localInventory.set(inv.item.name, inv.quantity);
        }

        for (const batch of stand.batches) {
          const neededScoops = maxScoopsLimit - batch.scoops;
          if (neededScoops > 0) {
            let flavorItemName = `${batch.flavor.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} Flavor Refill`;
            if (batch.flavor === 'pistachio') flavorItemName = 'Pistachio Gelato Refill';
            const currentQty = localInventory.get(flavorItemName) || 0;
            if (currentQty > 0) {
              const invRecord = user.inventory.find(i => i.item.name === flavorItemName);
              if (invRecord) {
                await tx.userInventory.update({
                  where: { userId_itemId: { userId, itemId: invRecord.itemId } },
                  data: { quantity: { decrement: 1 } }
                });
                localInventory.set(flavorItemName, currentQty - 1);
                await tx.iceCreamBatch.update({
                  where: { id: batch.id },
                  data: { scoops: Math.min(maxScoopsLimit, batch.scoops + 50) }
                });
                refilledAny = true;
              }
            } else {
              errorMsgs.push(`Out of **${flavorItemName}**! Buy it in the shop.`);
              if (!missingItemsNeeded.some(item => item.name === flavorItemName)) {
                missingItemsNeeded.push({ name: flavorItemName, type: 'food' });
              }
            }
          }

          const neededSmallCones = maxSmallConesLimit - batch.smallCones;
          if (neededSmallCones > 0) {
            const currentQty = localInventory.get('Box of Small Cones') || 0;
            if (currentQty > 0) {
              const coneRecord = user.inventory.find(i => i.item.name === 'Box of Small Cones');
              if (coneRecord) {
                await tx.userInventory.update({
                  where: { userId_itemId: { userId, itemId: coneRecord.itemId } },
                  data: { quantity: { decrement: 1 } }
                });
                localInventory.set('Box of Small Cones', currentQty - 1);
                await tx.iceCreamBatch.update({
                  where: { id: batch.id },
                  data: { smallCones: Math.min(maxSmallConesLimit, batch.smallCones + 50) }
                });
                refilledAny = true;
              }
            } else {
              errorMsgs.push('Out of **Box of Small Cones**! Buy it in the shop.');
              if (!missingItemsNeeded.some(item => item.name === 'Box of Small Cones')) {
                missingItemsNeeded.push({ name: 'Box of Small Cones', type: 'item' });
              }
            }
          }

          const neededLargeCones = maxLargeConesLimit - batch.largeCones;
          if (user.level >= 2 && neededLargeCones > 0) {
            const currentQty = localInventory.get('Box of Large Cones') || 0;
            if (currentQty > 0) {
              const coneRecord = user.inventory.find(i => i.item.name === 'Box of Large Cones');
              if (coneRecord) {
                await tx.userInventory.update({
                  where: { userId_itemId: { userId, itemId: coneRecord.itemId } },
                  data: { quantity: { decrement: 1 } }
                });
                localInventory.set('Box of Large Cones', currentQty - 1);
                await tx.iceCreamBatch.update({
                  where: { id: batch.id },
                  data: { largeCones: Math.min(maxLargeConesLimit, batch.largeCones + 50) }
                });
                refilledAny = true;
              }
            } else {
              errorMsgs.push('Out of **Box of Large Cones**! Buy it in the shop.');
              if (!missingItemsNeeded.some(item => item.name === 'Box of Large Cones')) {
                missingItemsNeeded.push({ name: 'Box of Large Cones', type: 'item' });
              }
            }
          }

          const neededSmallBoxes = maxSmallBoxesLimit - batch.smallBoxes;
          if (neededSmallBoxes > 0) {
            const currentQty = localInventory.get('Box of Small Boxes') || 0;
            if (currentQty > 0) {
              const cupRecord = user.inventory.find(i => i.item.name === 'Box of Small Boxes');
              if (cupRecord) {
                await tx.userInventory.update({
                  where: { userId_itemId: { userId, itemId: cupRecord.itemId } },
                  data: { quantity: { decrement: 1 } }
                });
                localInventory.set('Box of Small Boxes', currentQty - 1);
                await tx.iceCreamBatch.update({
                  where: { id: batch.id },
                  data: { smallBoxes: Math.min(maxSmallBoxesLimit, batch.smallBoxes + 50) }
                });
                refilledAny = true;
              }
            } else {
              errorMsgs.push('Out of **Box of Small Boxes**! Buy it in the shop.');
              if (!missingItemsNeeded.some(item => item.name === 'Box of Small Boxes')) {
                missingItemsNeeded.push({ name: 'Box of Small Boxes', type: 'item' });
              }
            }
          }

          const neededLargeBoxes = maxLargeBoxesLimit - batch.largeBoxes;
          if (user.level >= 3 && neededLargeBoxes > 0) {
            const currentQty = localInventory.get('Box of Large Boxes') || 0;
            if (currentQty > 0) {
              const cupRecord = user.inventory.find(i => i.item.name === 'Box of Large Boxes');
              if (cupRecord) {
                await tx.userInventory.update({
                  where: { userId_itemId: { userId, itemId: cupRecord.itemId } },
                  data: { quantity: { decrement: 1 } }
                });
                localInventory.set('Box of Large Boxes', currentQty - 1);
                await tx.iceCreamBatch.update({
                  where: { id: batch.id },
                  data: { largeBoxes: Math.min(maxLargeBoxesLimit, batch.largeBoxes + 50) }
                });
                refilledAny = true;
              }
            } else {
              errorMsgs.push('Out of **Box of Large Boxes**! Buy it in the shop.');
              if (!missingItemsNeeded.some(item => item.name === 'Box of Large Boxes')) {
                missingItemsNeeded.push({ name: 'Box of Large Boxes', type: 'item' });
              }
            }
          }
        }
        if (refilledAny) {
          await tx.iceCreamStand.update({
            where: { id: standId },
            data: { notifiedEmpty: false }
          });
        }
      });
    });

      if (!refilledAny) {
        const missingNames = missingItemsNeeded.map(i => i.name);
        const shopItems = await prisma.shopItem.findMany({
          where: { name: { in: missingNames } }
        });

        const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${e('cross_red')} **Nothing refilled:**\n${errorMsgs.map(m => `• ${m}`).join('\n')}`
          )
        );

        const row = new ActionRowBuilder();
        for (const missing of missingItemsNeeded) {
          const shopItem = shopItems.find(i => i.name === missing.name);
          if (shopItem) {
            const canAfford = user.money >= shopItem.price;
            const shortName = shopItem.name.replace(' Flavor Refill', '').replace(' Gelato Refill', '').replace('Box of ', '');
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`stand:fast_buy:${standId}:${shopItem.id}`)
                .setLabel(`Buy & Refill ${shortName} ($${shopItem.price})`)
                .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!canAfford || user.level < shopItem.levelRequired)
            );
          }
        }

        const payload: any = {
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        };
        if (row.components.length > 0) {
          container.addActionRowComponents(row);
        }

        return interaction.followUp(payload);
      } else {
        await replyV2(interaction, `${e('check_green')} Batches refilled using items from your inventory!`, 0x48BB78);

        const updatedStand = await prisma.iceCreamStand.findUnique({
          where: { id: standId },
          include: { batches: true }
        });
        if (updatedStand && !updatedStand.isActive && updatedStand.cleanliness > 0) {
          const hasScoops = updatedStand.batches.some(b => b.scoops > 0);
          const hasContainers = updatedStand.batches.some(
            b => b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0
          );
          if (hasScoops && hasContainers) {
            const now = new Date();
            const activeUntil = new Date(now.getTime() + getActiveDurationMinutes(updatedStand.activeDurationLevel) * 60 * 1000);
            await safeTransaction(async () => {
              await prisma.iceCreamStand.update({
                where: { id: standId },
                data: { isActive: true, activeUntil }
              });
            });
            startActiveStandLoop(standId, interaction.message);
            await replyV2(interaction, `${e('dot_green')} Stand has reopened automatically since it is stocked and clean!`, 0x48BB78);
          }
        }
      }

    } else if (action === 'clean') {
      const { incrementQuestProgress } = require('./simulationEngine');
      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          await tx.iceCreamStand.update({
            where: { id: standId },
            data: { cleanliness: 100, notifiedEmpty: false }
          });
          await incrementQuestProgress(tx, userId, 'clean_stand', 1);
        });
      });
      await replyV2(interaction, `${e('broom')} Stand cleaned! It looks sparkling clean now.`, 0x48BB78);

      const updatedStand = await prisma.iceCreamStand.findUnique({
        where: { id: standId },
        include: { batches: true }
      });
      if (updatedStand && !updatedStand.isActive) {
        const hasScoops = updatedStand.batches.some(b => b.scoops > 0);
        const hasContainers = updatedStand.batches.some(
          b => b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0
        );
        if (hasScoops && hasContainers) {
          const now = new Date();
          const activeUntil = new Date(now.getTime() + getActiveDurationMinutes(updatedStand.activeDurationLevel) * 60 * 1000);
          await safeTransaction(async () => {
            await prisma.iceCreamStand.update({
              where: { id: standId },
              data: { isActive: true, activeUntil }
            });
          });
          startActiveStandLoop(standId, interaction.message);
          await replyV2(interaction, `${e('dot_green')} Stand has reopened automatically since it is clean and stocked!`, 0x48BB78);
        }
      }

    } else if (action === 'collect') {
      const moneyCollected = stand.unclaimedMoney;
      const { incrementQuestProgress } = require('./simulationEngine');

      await safeTransaction(async () => {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { money: { increment: moneyCollected } }
          });
          await tx.iceCreamStand.update({
            where: { id: standId },
            data: { unclaimedMoney: 0 }
          });
          await incrementQuestProgress(tx, userId, 'collect_cash', moneyCollected);
        });
      });

      await replyV2(
        interaction,
        `${e('cash')} Collected **$${moneyCollected}** from your stand! New Cash balance: **$${user.money + moneyCollected}**`,
        0x48BB78
      );

    } else if (action === 'toggle_active') {
      const newActiveState = !stand.isActive;
      const now = new Date();
      const activeUntil = newActiveState ? new Date(now.getTime() + getActiveDurationMinutes(stand.activeDurationLevel) * 60 * 1000) : null;

      const { isOwner } = require('../constants/overseer');
      const isOwnerUser = isOwner(userId);

      if (newActiveState && !isOwnerUser) {
        const userWorkers = await prisma.worker.findMany({ where: { userId } });
        const hasCashier = userWorkers.some(w => w.type === 'cashier');
        const hasMaker = userWorkers.some(w => w.type === 'maker');

        if (!hasCashier || !hasMaker) {
          const missing = [];
          if (!hasCashier) missing.push(`${e('worker_cashier')} **Cashier** *(Lv. 3 Req in /shop)*`);
          if (!hasMaker) missing.push(`${e('worker_maker')} **Ice Cream Maker** *(Lv. 5 Req in /shop)*`);

          await replyV2(
            interaction,
            `⚠️ **Staff Required for Passive Background Sales!**\n` +
            `To open your stand for automated background customers, you need to hire the following staff in \`/shop\`:\n` +
            `• ${missing.join('\n• ')}\n\n` +
            `💡 *Tip: You can still manually serve customers anytime by clicking **Serve Customer (Minigame)** below!*`,
            0xF59E0B
          );
          return;
        }
      }

      await safeTransaction(async () => {
        await prisma.iceCreamStand.update({
          where: { id: standId },
          data: { isActive: newActiveState, ...(newActiveState ? { activeUntil } : {}) }
        });
      });

      if (newActiveState) {
        const userWorkers = user.workers;
        const hasManagerWorker = userWorkers.some(w => w.type === 'manager');
        const hasCashier = userWorkers.some(w => w.type === 'cashier');
        const hasMaker = userWorkers.some(w => w.type === 'maker');
        const hasCleaner = userWorkers.some(w => w.type === 'cleaner');

        if (!hasCashier || !hasMaker) {
          return replyV2(
            interaction,
            `${e('cross_red')} You must hire both an **Ice Cream Maker** and a **Cashier** in Hire Staff before you can open automatic stand sales! Serve customers via the Minigame until then.`,
            0xED4245
          );
        }

        const isFullyStaffed = hasManagerWorker && hasCashier && hasMaker && hasCleaner;

        startActiveStandLoop(standId, interaction.message);
        const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
        const { getOwnerFooter } = require('../constants/overseer');
        const container = new ContainerBuilder().setAccentColor(0x48BB78);

        if (isFullyStaffed) {
          const congratsText = `# 🎉 CONGRATULATIONS! 24/7 STAND AUTOMATION ACTIVE! 👔\n` +
            `Your stand **"${stand.name}"** is now operating **Permanently 24/7** under your hired Manager!\n\n` +

            `### 📋 What Just Happened?\n` +
            `• 👔 **Manager Supervision**: Your Manager supervises operations 24/7 so you (the CEO) no longer need to stay here clicking buttons manually!\n` +
            `• ⚠️ **Staff Operations**: Your hired **Cleaner, Cashier, and Maker** run transactions, scoop ice cream, and maintain cleanliness continuously around the clock.\n` +
            `• 💰 **Automated Wallet Deposits**: All sales revenue is deposited straight to your wallet with zero uncollected cash delays.\n\n` +

            `---\n\n` +

            `### 🚀 Next Steps for your Ice Cream Empire:\n` +
            `1. 🇺🇸 **Expand Across the USA**: Now that this stand is automated, head to **\`/map\`** or **\`/openstand\`** to open more stands in NYC, Los Angeles, Miami, and Chicago!\n` +
            `2. 🛒 **Upgrade Production**: Purchase larger freezers, cone racks, and higher staff levels in **\`/shop\`**.\n` +
            `3. 🌍 **Rebirth & Go Global**: Reach **Level 15** to **\`/rebirth\`**, boosting your earnings multiplier by **+50%** and unlocking global stands in France, Japan, Italy, Belgium, and beyond!\n` +
            getOwnerFooter(userId);

          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(congratsText));

          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('openstand:hub').setLabel('Open USA & Global Stands 🌍').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('shop:category:service').setLabel('Shop & Hire Staff 🛒').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`stand:back_to_stand:${stand.id}`).setLabel('Return to Stand POV 🏪').setStyle(ButtonStyle.Secondary)
          );
          container.addActionRowComponents(actionRow);

          await interaction.editReply({
            components: [container],
            attachments: [],
            flags: MessageFlags.IsComponentsV2 as any
          });
          return;
        }

        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${e('dot_green')} **Your stand is now open!** Customers are arriving at the counter. Click **Serve Customer** below to serve them!`
          )
        );
        const serveRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`stand:order_start:${userId}`)
            .setLabel('Serve Customer (Minigame)')
            .setEmoji('🍨')
            .setStyle(ButtonStyle.Success)
        );
        container.addActionRowComponents(serveRow);
        await interaction.followUp({
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      } else {
        stopActiveStandLoop(standId);
        await replyV2(interaction, `${e('stop')} Stand paused. Sales are suspended.`, 0xF56565);
      }

    } else if (action === 'manager_menu') {
      const { buildManagerDashboardMessage } = require('../builders/standBuilder');
      const payload = await buildManagerDashboardMessage(standId, userId);
      await interaction.editReply(payload as any);
      return;
    } else if (action === 'refresh') {
    } else if (action === 'close') {
      stopActiveStandLoop(standId);
      const payload = await buildCountryStandsMessage(userId, stand.country);
      await interaction.editReply({
        components: payload.components,
        attachments: []
      } as any);
      return;
    }

    const payload = await buildStandMessage(standId);
    await interaction.editReply(payload as any);

  } catch (error) {
    console.error('Error in stand button handler:', error);
    await replyV2(interaction, `${e('cross_red')} An error occurred processing this action.`, 0xED4245);
  }
}

async function replyV2(interaction: any, text: string, color: number) {
  const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  const payload = {
    components: [container],
    flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
  };
  return interaction.followUp(payload);
}

export async function handleStandRenameModal(interaction: any, parts: string[]) {
  const standId = parts[1];
  const userId = interaction.user.id;

  if (!standId) return;

  try {
    const newName = interaction.fields.getTextInputValue('stand_name')?.trim();
    if (!newName || newName.length < 3) {
      const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
      const c = new ContainerBuilder().setAccentColor(0xED4245);
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Stand name must be at least 3 characters.`));
      return interaction.reply({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    }

    const stand = await prisma.iceCreamStand.findUnique({ where: { id: standId } });
    if (!stand || stand.userId !== userId) {
      const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
      const c = new ContainerBuilder().setAccentColor(0xED4245);
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Stand not found or not owned by you.`));
      return interaction.reply({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    }

    await safeTransaction(async () => {
      await prisma.iceCreamStand.update({
        where: { id: standId },
        data: { name: newName }
      });
    });

    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    const c = new ContainerBuilder().setAccentColor(0x48BB78);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `${e('check_green')} Stand renamed to **"${newName}"** successfully!`
    ));
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    } else {
      await interaction.reply({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    }

  } catch (err) {
    console.error('[StandRenameModal] Error:', err);
    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} Failed to rename stand. Please try again.`));
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    } else {
      await interaction.reply({ components: [c], flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any });
    }
  }
}
