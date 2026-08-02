import { ModalSubmitInteraction, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildAdminHubMessage } from '../builders/adminHubBuilder';

export async function handleGiveawayModalSubmit(interaction: ModalSubmitInteraction) {
  const { customId } = interaction;

  if (customId === 'admin_giveaway_modal') {
    const title = interaction.fields.getTextInputValue('giveaway_title');
    const description = interaction.fields.getTextInputValue('giveaway_desc');
    const durationHours = parseInt(interaction.fields.getTextInputValue('giveaway_duration') || '24', 10);
    const maxEntries = parseInt(interaction.fields.getTextInputValue('giveaway_max_entries') || '1', 10);
    const winners = parseInt(interaction.fields.getTextInputValue('giveaway_winners') || '1', 10);

    const now = new Date();
    const endsAt = new Date(now.getTime() + Math.max(1, durationHours) * 60 * 60 * 1000);

    const giveaway = await safeTransaction(async () => {
      await prisma.giveaway.updateMany({
        where: { isPublished: false },
        data: { isEnded: true }
      });

      return await prisma.giveaway.create({
        data: {
          title,
          description,
          endsAt,
          maxEntriesPerUser: maxEntries,
          winnerCount: winners,
          isPublished: true,
          createdBy: interaction.user.id
        }
      });
    });

    const container = new ContainerBuilder().setAccentColor(0x48BB78);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🚀 OFFICIAL GIVEAWAY PUBLISHED & LIVE!\n` +
        `**${giveaway.title}**\n\n` +
        `*${giveaway.description}*\n\n` +
        `• ⏰ **Duration**: **${durationHours} Hours** (Ends <t:${Math.floor(endsAt.getTime() / 1000)}:R>)\n` +
        `• 🏆 **Winners**: **${winners} Winner(s)**\n` +
        `• 🎟️ **Max Entries**: **${maxEntries} per user**\n\n` +
        `📢 **Automated 15-Command Reminder Broadcasts are now LIVE across all network servers!** Users will see this giveaway pop up on their very next command.`
      )
    );

    return interaction.reply({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  if (customId === 'admin_user_credit_modal') {
    const targetUserId = interaction.fields.getTextInputValue('credit_user_id');
    const cashAmount = parseInt(interaction.fields.getTextInputValue('credit_cash_amount') || '0', 10);
    const tokenAmount = parseInt(interaction.fields.getTextInputValue('credit_token_amount') || '0', 10);

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('cross_red')} Target user ID \`${targetUserId}\` not found in database.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    await safeTransaction(async () => {
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          money: { increment: cashAmount },
          prestigeTokens: { increment: tokenAmount }
        }
      });
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `✅ **FUNDS CREDITED SUCCESSFULLY!**\n` +
        `• Target User: <@${targetUserId}>\n` +
        `• Cash Added: ${e('cash')} **+$${cashAmount.toLocaleString()}**\n` +
        `• Prestige Tokens Added: ${e('gem')} **+${tokenAmount}**`
      )
    );

    return interaction.reply({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  if (customId === 'admin_user_ban_modal') {
    const targetUserId = interaction.fields.getTextInputValue('ban_user_id');
    const reason = interaction.fields.getTextInputValue('ban_reason') || 'Violation of Terms of Service';

    const existingBan = await prisma.bannedUser.findUnique({ where: { id: targetUserId } });
    let actionText = '';

    await safeTransaction(async () => {
      if (existingBan) {
        await prisma.bannedUser.delete({ where: { id: targetUserId } });
        actionText = `✅ Unbanned user <@${targetUserId}> from ScoopShack!`;
      } else {
        await prisma.bannedUser.create({
          data: { id: targetUserId, reason }
        });
        actionText = `⛔ Banned user <@${targetUserId}> from ScoopShack. Reason: *${reason}*`;
      }
    });

    const successContainer = new ContainerBuilder().setAccentColor(existingBan ? 0x48BB78 : 0xED4245);
    successContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(actionText));

    return interaction.reply({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
}
