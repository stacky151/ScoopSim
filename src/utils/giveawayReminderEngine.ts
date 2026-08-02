import { CommandInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';

export async function trackCommandAndRemind(interaction: CommandInteraction) {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  if (guildId) {
    await prisma.serverStat.upsert({
      where: { guildId },
      create: { guildId, commandCount: 1, lastActiveAt: new Date() },
      update: { commandCount: { increment: 1 }, lastActiveAt: new Date() }
    }).catch(() => {});
  }

  const tracker = await prisma.userCommandTracker.upsert({
    where: { userId },
    create: { userId, commandCount: 1, lastRemindedCommandCount: 0 },
    update: { commandCount: { increment: 1 } }
  });

  const now = new Date();
  const activeGiveaway = await prisma.giveaway.findFirst({
    where: {
      isPublished: true,
      isEnded: false,
      endsAt: { gt: now }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!activeGiveaway) return;

  const existingEntry = await prisma.giveawayEntry.findUnique({
    where: {
      giveawayId_userId: {
        giveawayId: activeGiveaway.id,
        userId
      }
    }
  });

  if (existingEntry) return;

  const cmdCount = tracker.commandCount;
  const lastReminded = tracker.lastRemindedCommandCount;
  const isNewGiveaway = tracker.lastRemindedGiveawayId !== activeGiveaway.id;
  const is15CmdInterval = (cmdCount - lastReminded >= 15);
  const shouldRemind = isNewGiveaway || is15CmdInterval;

  if (!shouldRemind) return;

  await prisma.userCommandTracker.update({
    where: { userId },
    data: {
      lastRemindedCommandCount: cmdCount,
      lastRemindedGiveawayId: activeGiveaway.id
    }
  });

  const container = new ContainerBuilder().setAccentColor(0xFFD700);

  const hoursLeft = Math.max(0, Math.ceil((activeGiveaway.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 🎉 OFFICIAL SCOOPSHACK GIVEAWAY ANNOUNCEMENT!\n` +
      `**${activeGiveaway.title}**\n\n` +
      `*${activeGiveaway.description}*\n\n` +
      `• ⏰ **Time Remaining**: **${hoursLeft} Hours** (Ends <t:${Math.floor(activeGiveaway.endsAt.getTime() / 1000)}:R>)\n` +
      `• 🏆 **Winners**: **${activeGiveaway.winnerCount} Lucky Winner(s)**\n` +
      `• 🎟️ **Max Entries**: **${activeGiveaway.maxEntriesPerUser} Entry per User**\n\n` +
      `-# Click the button below to enter! Once entered, you will no longer receive reminders.`
    )
  );

  const entryButton = new ButtonBuilder()
    .setCustomId(`giveaway:enter:${activeGiveaway.id}:${userId}`)
    .setLabel('🎉 Enter Giveaway Now!')
    .setStyle(ButtonStyle.Success);

  container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(entryButton));

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    } else {
      await interaction.reply({
        components: [container],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }
  } catch (err) {
  }
}

export async function handleGiveawayEntryButton(interaction: any, giveawayId: string) {
  const userId = interaction.user.id;

  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
    include: { entries: true }
  });

  if (!giveaway || giveaway.isEnded || new Date() > giveaway.endsAt) {
    const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} This giveaway has already ended or is invalid.`)
    );
    return interaction.reply({
      components: [errorContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  const existingEntries = giveaway.entries.filter(e => e.userId === userId);
  if (existingEntries.length >= giveaway.maxEntriesPerUser) {
    const infoContainer = new ContainerBuilder().setAccentColor(0x3B82F6);
    infoContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`ℹ️ You have already entered this giveaway! Good luck!`)
    );
    return interaction.reply({
      components: [infoContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  await safeTransaction(async () => {
    await prisma.giveawayEntry.create({
      data: {
        giveawayId,
        userId
      }
    });
  });

  const botClientId = interaction.client.user?.id || '763123509417214022';
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=274878287936&scope=bot%20applications.commands`;
  const discordCommunityUrl = 'https://discord.gg/WJnDk43hw3';

  try {
    const dmContainer = new ContainerBuilder().setAccentColor(0xFFD700);
    dmContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🎉 GIVEAWAY ENTRY CONFIRMED!\n` +
        `You have successfully entered **${giveaway.title}**!\n\n` +
        `*${giveaway.description}*\n\n` +
        `• ⏰ **Ends**: <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>\n` +
        `• 🏆 **Winners**: **${giveaway.winnerCount} Lucky Winner(s)**\n\n` +
        `📢 **Want access to exclusive Discord-only giveaways and updates?**\n` +
        `Join our official ScoopShack Discord Community below! If you win when drawing occurs, create a ticket in **#create-a-ticket** or **#support** to claim your prize!`
      )
    );

    const dmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('💬 Join Official ScoopShack Discord')
        .setURL(discordCommunityUrl)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('➕ Invite ScoopShack Bot')
        .setURL(inviteUrl)
        .setStyle(ButtonStyle.Link)
    );

    dmContainer.addActionRowComponents(dmRow);

  } catch (dmErr) {}

  const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
  successContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `🎉 **GIVEAWAY ENTRY CONFIRMED!**\n` +
      `You have successfully entered **${giveaway.title}**!\n` +
      `*(Automated 15-command reminders have been permanently paused for this giveaway)*\n\n` +
      `💬 **Check your DMs for entry confirmation!** Join our Discord community below for exclusive server-only giveaways!`
    )
  );

  const replyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('💬 Join Official ScoopShack Discord')
      .setURL(discordCommunityUrl)
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel('➕ Invite ScoopShack Bot')
      .setURL(inviteUrl)
      .setStyle(ButtonStyle.Link)
  );

  successContainer.addActionRowComponents(replyRow);

  return interaction.reply({
    components: [successContainer],
    flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
  });
}
