import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildFrameListMessage, THEMES } from '../commands/frame';

export async function handleFrameButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const themeId = parts[2];
  const targetUserId = parts[3];
  const userId = interaction.user.id;

  if (targetUserId && userId !== targetUserId) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This is not your cosmetics menu!`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  const themeDef = THEMES[themeId || ''];
  if (!themeDef) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} Theme definition not found.`)
    );
    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { themes: true }
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

  const ownedThemes = new Set(user.themes.map(t => t.themeId));
  ownedThemes.add('default');

  if (action === 'buy') {
    if (ownedThemes.has(themeId!)) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} You already own the **${themeDef.name}** theme!`)
      );
      return interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    if (user.level < themeDef.levelReq) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} You need to be Level **${themeDef.levelReq}** to unlock this theme.`)
      );
      return interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    if (user.money < themeDef.price) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Insufficient cash! Requires **$${themeDef.price.toLocaleString()}**.`)
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
          data: {
            money: { decrement: themeDef.price },
            equippedTheme: themeId!
          }
        });
        await tx.userTheme.create({
          data: { userId, themeId: themeId! }
        });
      });
    });

    await interaction.deferUpdate();

    const payload = await buildFrameListMessage(userId);
    await interaction.editReply({ components: payload.components, files: payload.files });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`🎉 Purchased and equipped the **${themeDef.name}** theme for **$${themeDef.price.toLocaleString()}**!`)
    );
    await interaction.followUp({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });

  } else if (action === 'equip') {
    if (!ownedThemes.has(themeId!)) {
      const container = new ContainerBuilder().setAccentColor(0xED4245);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} You do not own this theme yet!`)
      );
      return interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    await safeTransaction(async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { equippedTheme: themeId! }
      });
    });

    await interaction.deferUpdate();

    const payload = await buildFrameListMessage(userId);
    await interaction.editReply({ components: payload.components, files: payload.files });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✨ Equipped the **${themeDef.name}** theme!`)
    );
    await interaction.followUp({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
