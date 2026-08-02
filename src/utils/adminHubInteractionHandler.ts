import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { e } from '../constants/emojis';
import { buildAdminHubMessage } from '../builders/adminHubBuilder';
import { forceCountryWeather, WeatherType } from './weatherEngine';

const ADMIN_USER_ID = '711620148053803069';

export async function handleAdminHubInteraction(interaction: any, parts: string[]) {
  const userId = interaction.user.id;

  if (userId !== ADMIN_USER_ID) {
    const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
    errorContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} Access Denied. Executive Administrator Clearance Required.`)
    );
    return interaction.reply({
      components: [errorContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  const type = parts[1];

  try {
    if (type === 'select_server') {
      const guildId = interaction.values[0];
      await interaction.deferUpdate();
      const payload = await buildAdminHubMessage(interaction.client, userId, 'server_detail', guildId);
      await interaction.editReply(payload as any);
      return;
    }

    if (type === 'tab') {
      const tabName = parts[2] || 'overview';
      await interaction.deferUpdate();
      const payload = await buildAdminHubMessage(interaction.client, userId, tabName);
      await interaction.editReply(payload as any);
      return;
    }

    if (type === 'action') {
      const actionName = parts[2];

      if (actionName === 'reset_server') {
        const guildId = parts[3];
        if (!guildId) return;
        await safeTransaction(async () => {
          const serverUsers = await prisma.user.findMany({
            where: { guildMember: { guildId } }
          });
          const userIds = serverUsers.map(u => u.id);

          await prisma.iceCreamStand.deleteMany({
            where: { userId: { in: userIds } }
          });
          await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { money: 500, level: 1, exp: 0 }
          });
        });

        const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
        successContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`⚡ **SERVER ECONOMY RESET COMPLETE!** Reset economy for server \`${guildId}\`.`)
        );
        return interaction.reply({
          components: [successContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }

      if (actionName === 'toggle_ban_server') {
        const guildId = parts[3];
        if (!guildId) return;
        const existingBan = await prisma.bannedServer.findUnique({ where: { id: guildId } });
        let statusText = '';

        await safeTransaction(async () => {
          if (existingBan) {
            await prisma.bannedServer.delete({ where: { id: guildId } });
            statusText = `✅ Unbanned server \`${guildId}\`!`;
          } else {
            await prisma.bannedServer.create({
              data: { id: guildId, reason: 'Administrator Blacklist' }
            });
            statusText = `🚫 Banned server \`${guildId}\` from ScoopSim access.`;
          }
        });

        const successContainer = new ContainerBuilder().setAccentColor(existingBan ? 0x48BB78 : 0xED4245);
        successContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(statusText));

        return interaction.reply({
          components: [successContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }

      if (actionName === 'modal_create_giveaway') {
        const modal = new ModalBuilder()
          .setCustomId('admin_giveaway_modal')
          .setTitle('🎉 Create Official Giveaway Announcement');

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('giveaway_title')
              .setLabel('Giveaway Title')
              .setPlaceholder('e.g., 🍦 Summer Gelato Fest — $100,000 Cash!')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('giveaway_desc')
              .setLabel('Giveaway Description')
              .setPlaceholder('Describe the prizes and rules...')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('giveaway_duration')
              .setLabel('Duration in Hours')
              .setValue('24')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('giveaway_max_entries')
              .setLabel('Max Entries Per User')
              .setValue('1')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('giveaway_winners')
              .setLabel('Winner Count')
              .setValue('1')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      if (actionName === 'publish_giveaway') {
        const giveawayId = parts[3];
        if (!giveawayId) return;
        await safeTransaction(async () => {
          await prisma.giveaway.update({
            where: { id: giveawayId },
            data: { isPublished: true }
          });
        });

        const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
        successContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `🚀 **GIVEAWAY PUBLISHED NETWORK-WIDE!**\n` +
            `Automated 15-command reminders are now active for all network users!`
          )
        );
        return interaction.reply({
          components: [successContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }

      if (actionName === 'draw_giveaway_winners') {
        const giveawayId = parts[3];
        if (!giveawayId) return;

        const { concludeGiveaway } = require('./giveawayWinnerEngine');
        const res = await concludeGiveaway(interaction.client, giveawayId);

        const resultContainer = new ContainerBuilder().setAccentColor(res.winners.length > 0 ? 0xFFD700 : 0xED4245);
        resultContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# 🎲 GIVEAWAY WINNERS DRAWN!\n` +
            `**${res.message}**\n\n` +
            (res.winners.length > 0
              ? `🏆 **Winning Accounts**: ${res.winners.map((id: string) => `<@${id}>`).join(', ')}\n\n` +
                `💬 *Direct Messages with entry verification and prize instructions have been dispatched to all winners!*`
              : `*No entries were submitted for this giveaway.*`)
          )
        );

        return interaction.reply({
          components: [resultContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }

      if (actionName === 'modal_user_credit') {
        const modal = new ModalBuilder()
          .setCustomId('admin_user_credit_modal')
          .setTitle('💵 Credit Funds to User');

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('credit_user_id')
              .setLabel('Target Discord User ID')
              .setPlaceholder('e.g. 711620148053803069')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('credit_cash_amount')
              .setLabel('Cash Amount to Add')
              .setValue('50000')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('credit_token_amount')
              .setLabel('Prestige Tokens to Add')
              .setValue('5')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

        return interaction.showModal(modal);
      }

      if (actionName === 'modal_user_ban') {
        const modal = new ModalBuilder()
          .setCustomId('admin_user_ban_modal')
          .setTitle('⛔ Ban / Unban User');

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('ban_user_id')
              .setLabel('Target Discord User ID')
              .setPlaceholder('e.g. 123456789012345678')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId('ban_reason')
              .setLabel('Reason for Ban')
              .setValue('Violation of Terms of Service')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

        return interaction.showModal(modal);
      }

      if (actionName === 'force_weather') {
        const weathers: WeatherType[] = ['sunny', 'heatwave', 'rainstorm', 'blizzard', 'golden_hour'];
        const randomWeather = weathers[Math.floor(Math.random() * weathers.length)] || 'sunny';
        forceCountryWeather('USA', randomWeather);

        const successContainer = new ContainerBuilder().setAccentColor(0x3B82F6);
        successContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`🌪️ **FORCED WEATHER ROTATION!** USA weather set to **${randomWeather}**!`)
        );
        return interaction.reply({
          components: [successContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }

      if (actionName === 'trigger_expo') {
        const now = new Date();
        const endsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        await safeTransaction(async () => {
          await prisma.globalEvent.create({
            data: {
              title: '🎪 World Ice Cream Expo 2026',
              description: 'Server-wide +100% Cash Boost Event!',
              targetScoops: 500000,
              currentScoops: 0,
              endsAt
            }
          });
        });

        const successContainer = new ContainerBuilder().setAccentColor(0xFFD700);
        successContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`🎪 **GLOBAL WORLD EXPO EVENT TRIGGERED!** 48-Hour +100% Cash Boost Event is now LIVE!`)
        );
        return interaction.reply({
          components: [successContainer],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        });
      }
    }
  } catch (err) {
    console.error('Error in handleAdminHubInteraction:', err);
  }
}
