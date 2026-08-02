import { Client, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';

export async function concludeGiveaway(client: Client, giveawayId: string): Promise<{ success: boolean; message: string; winners: string[] }> {
  const giveaway = await prisma.giveaway.findUnique({
    where: { id: giveawayId },
    include: { entries: true }
  });

  if (!giveaway || giveaway.isEnded) {
    return { success: false, message: 'Giveaway not found or already ended.', winners: [] };
  }

  const uniqueUserIds = Array.from(new Set(giveaway.entries.map(e => e.userId)));

  if (uniqueUserIds.length === 0) {
    await safeTransaction(async () => {
      await prisma.giveaway.update({
        where: { id: giveawayId },
        data: { isEnded: true, winnerIds: '' }
      });
    });
    return { success: true, message: 'Giveaway ended with 0 entries.', winners: [] };
  }

  const shuffled = [...uniqueUserIds].sort(() => Math.random() - 0.5);
  const winningUserIds = shuffled.slice(0, Math.min(giveaway.winnerCount, shuffled.length));

  await safeTransaction(async () => {
    await prisma.giveaway.update({
      where: { id: giveawayId },
      data: {
        isEnded: true,
        winnerIds: winningUserIds.join(',')
      }
    });
  });

  const discordCommunityUrl = 'https://discord.gg/WJnDk43hw3';
  const botClientId = client.user?.id || '763123509417214022';
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=274878287936&scope=bot%20applications.commands`;

  for (const winnerId of winningUserIds) {
    try {
      const user = await client.users.fetch(winnerId).catch(() => null);
      if (!user) continue;

      const winnerContainer = new ContainerBuilder().setAccentColor(0xFFD700);
      winnerContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 🏆 CONGRATULATIONS! YOU HAVE WON THE GIVEAWAY!\n` +
          `You were randomly selected as an official winner of **${giveaway.title}**!\n\n` +
          `**🎁 Prize Package**: ${giveaway.description}\n\n` +
          `• 🏆 **Total Winners**: **${winningUserIds.length} Winner(s)**\n` +
          `• 👥 **Winning Accounts**: ${winningUserIds.map(id => `<@${id}>`).join(', ')}\n\n` +
          `🎫 **HOW TO CLAIM YOUR PRIZE**:\n` +
          `1. Click the button below to join our official **ScoopSim Discord Community**.\n` +
          `2. Open a ticket in **#create-a-ticket** or **#support** with your prize screenshot to claim your reward!\n\n` +
          `💬 *Congratulations on your victory, Ice Cream Baron!*`
        )
      );

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('💬 Join ScoopSim Discord to Claim')
          .setURL(discordCommunityUrl)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('➕ Invite ScoopSim Bot')
          .setURL(inviteUrl)
          .setStyle(ButtonStyle.Link)
      );

      winnerContainer.addActionRowComponents(actionRow);

    } catch (err) {
      console.error(`Failed to DM giveaway winner ${winnerId}:`, err);
    }
  }

  return {
    success: true,
    message: `Giveaway concluded! Picked ${winningUserIds.length} winner(s).`,
    winners: winningUserIds
  };
}

export async function checkExpiredGiveaways(client: Client) {
  const now = new Date();
  const expiredGiveaways = await prisma.giveaway.findMany({
    where: {
      isPublished: true,
      isEnded: false,
      endsAt: { lte: now }
    }
  });

  for (const giveaway of expiredGiveaways) {
    await concludeGiveaway(client, giveaway.id);
  }
}
