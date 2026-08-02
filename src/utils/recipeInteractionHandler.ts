import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildRecipeMessage, TOPPINGS } from '../commands/recipe';

export async function handleRecipeButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const toppingId = parts[2];
  const targetUserId = parts[3];
  const userId = interaction.user.id;

  if (targetUserId && userId !== targetUserId) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your recipe studio!`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  if (action === 'menu') {
    const payload = await buildRecipeMessage(userId);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        components: payload.components,
        files: payload.files
      } as any);
    } else {
      await interaction.reply({
        components: payload.components,
        files: payload.files,
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }
    return;
  }

  const topping = TOPPINGS[toppingId || ''];
  if (!topping) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} Topping definition not found.`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      inventory: {
        include: { item: true }
      }
    }
  });

  if (!user) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} User profile not found. Run \`/start\` to begin.`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  if (action === 'buy') {
    if (user.money < topping.cost) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Insufficient cash! Requires **$${topping.cost.toLocaleString()}**.`)
      );
      return interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    await safeTransaction(async () => {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { money: { decrement: topping.cost } }
        });

        let item = await tx.shopItem.findFirst({
          where: { name: topping.name }
        });

        if (!item) {
          item = await tx.shopItem.create({
            data: {
              name: topping.name,
              type: 'topping',
              price: topping.cost,
              description: topping.desc
            }
          });
        }

        await tx.userInventory.create({
          data: {
            userId,
            itemId: item.id
          }
        });
      });
    });

    await interaction.deferUpdate();
    const payload = await buildRecipeMessage(userId);
    await interaction.editReply({
      components: payload.components,
      files: payload.files
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`🎉 Purchased ${topping.emoji} **${topping.name}**! Applied \`${topping.effect}\` to your signature recipe.`)
    );
    await interaction.followUp({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
