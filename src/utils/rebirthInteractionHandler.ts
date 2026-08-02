import { ButtonInteraction } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';

export async function handleRebirthButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const userId = parts[2];

  if (action === 'cancel') {
    await interaction.message.delete().catch(() => null);
    return;
  }

  if (interaction.user.id !== userId) {
    return replyV2(interaction, '❌ You cannot interact with this rebirth menu.', 0xED4245);
  }

  await interaction.deferUpdate();

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.level < 15) {
      return replyV2(interaction, '❌ You do not meet the level requirement to rebirth.', 0xED4245);
    }

    await safeTransaction(async () => {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            level: 1,
            exp: 0,
            money: 100,
            rebirths: { increment: 1 }
          }
        });

        const stands = await tx.iceCreamStand.findMany({ where: { userId } });
        for (const stand of stands) {
          await tx.iceCreamBatch.deleteMany({ where: { standId: stand.id } });
        }
        await tx.iceCreamStand.deleteMany({ where: { userId } });

        await tx.userInventory.deleteMany({
          where: {
            userId,
            item: {
              type: { not: 'equipment' }
            }
          }
        });
      });
    });

    await replyV2(
      interaction,
      `🌟 **EMPIRE REBORN!** 🌟\n\n` +
      `Your level has reset to 1 and your earnings multiplier has increased!\n` +
      `Run \`/start\` to establish your new stand in your chosen country and begin climbing again!`,
      0x48BB78
    );

  } catch (error) {
    console.error('Error during rebirth transaction:', error);
    await replyV2(interaction, '❌ An error occurred during rebirth. Please try again.', 0xED4245);
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
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp(payload);
  } else {
    return interaction.reply(payload);
  }
}
