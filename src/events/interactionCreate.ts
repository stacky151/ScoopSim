import { Events, Interaction } from 'discord.js';

const buttonCooldowns = new Map<string, number>();
const BUTTON_COOLDOWN_MS = 250;

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        if (typeof command.autocomplete === 'function') {
          await command.autocomplete(interaction);
        }
      } catch (error) {
        console.error(`Error executing autocomplete for ${interaction.commandName}`);
        console.error(error);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
        const { trackCommandAndRemind } = require('../utils/giveawayReminderEngine');
        await trackCommandAndRemind(interaction).catch(() => {});
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
        const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
        const { e } = require('../constants/emojis');
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} There was an error while executing this command!`));
        const payload = {
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
    } else if (interaction.isButton()) {
      const { customId } = interaction;
      const parts = customId.split(':');
      const prefix = parts[0];

      const now = Date.now();
      const lastPress = buttonCooldowns.get(interaction.user.id) || 0;
      if (now - lastPress < BUTTON_COOLDOWN_MS) {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate().catch(() => {});
        }
        return;
      }
      buttonCooldowns.set(interaction.user.id, now);
      if (buttonCooldowns.size > 1000) {
        const cutoff = Date.now() - 60000;
        for (const [uid, ts] of buttonCooldowns.entries()) {
          if (ts < cutoff) buttonCooldowns.delete(uid);
        }
      }

      try {
        if (prefix === 'shop') {
          const { handleShopButton } = require('../utils/shopInteractionHandler');
          await handleShopButton(interaction, parts);
        } else if (prefix === 'stand') {
          const { handleStandButton } = require('../utils/standInteractionHandler');
          await handleStandButton(interaction, parts);
        } else if (prefix === 'openstand') {
          const { handleOpenStandButton } = require('../utils/openstandInteractionHandler');
          await handleOpenStandButton(interaction, parts);
        } else if (prefix === 'changelog') {
          const { handleChangelogButton } = require('../utils/changelogInteractionHandler');
          await handleChangelogButton(interaction, parts);
        } else if (prefix === 'map') {
          const { handleMapInteraction } = require('../utils/mapInteractionHandler');
          await handleMapInteraction(interaction, parts);
        } else if (prefix === 'rebirth') {
          const { handleRebirthButton } = require('../utils/rebirthInteractionHandler');
          await handleRebirthButton(interaction, parts);
        } else if (prefix === 'settings') {
          const { handleSettingsButton } = require('../utils/settingsInteractionHandler');
          await handleSettingsButton(interaction, parts);
        } else if (prefix === 'quests') {
          const { handleQuestsButton } = require('../utils/questsInteractionHandler');
          await handleQuestsButton(interaction, parts);
        } else if (prefix === 'profile') {
          const { handleProfileButton } = require('../utils/profileInteractionHandler');
          await handleProfileButton(interaction, parts);
        } else if (prefix === 'prestige') {
          const { handlePrestigeButton } = require('../utils/prestigeInteractionHandler');
          await handlePrestigeButton(interaction, parts);
        } else if (prefix === 'achievements') {
          const { handleAchievementsButton } = require('../utils/achievementsInteractionHandler');
          await handleAchievementsButton(interaction, parts);
        } else if (prefix === 'frame') {
          const { handleFrameButton } = require('../utils/frameInteractionHandler');
          await handleFrameButton(interaction, parts);
        } else if (prefix === 'leaderboard') {
          const { handleLeaderboardButton } = require('../utils/leaderboardInteractionHandler');
          await handleLeaderboardButton(interaction, parts);
        } else if (prefix === 'recipe') {
          const { handleRecipeButton } = require('../utils/recipeInteractionHandler');
          await handleRecipeButton(interaction, parts);
        } else if (prefix === 'guild') {
          const { handleGuildButton } = require('../utils/guildInteractionHandler');
          await handleGuildButton(interaction, parts);
        } else if (prefix === 'catering') {
          const { handleCateringButton } = require('../utils/cateringInteractionHandler');
          await handleCateringButton(interaction, parts);
        } else if (prefix === 'daily') {
          const { handleDailyButton } = require('../utils/dailyInteractionHandler');
          await handleDailyButton(interaction, parts);
        } else if (prefix === 'admin') {
          const { handleAdminHubInteraction } = require('../utils/adminHubInteractionHandler');
          await handleAdminHubInteraction(interaction, parts);
        } else if (prefix === 'giveaway') {
          const { handleGiveawayEntryButton } = require('../utils/giveawayReminderEngine');
          await handleGiveawayEntryButton(interaction, parts[2]);
        } else if (prefix === 'ticket') {
          const { handleTicketButton } = require('../utils/ticketInteractionHandler');
          await handleTicketButton(interaction, parts);
        } else if (prefix === 'summer') {
          const { handleSummerButton } = require('../utils/summerInteractionHandler');
          await handleSummerButton(interaction, parts);
        } else {
          console.warn(`Unhandled button interaction prefix: ${prefix}`);
        }
      } catch (error) {
        console.error(`Error handling button prefix ${prefix}:`, error);
        const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
        const { e } = require('../constants/emojis');
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} An error occurred while processing this action.`));
        const payload = {
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    } else if (interaction.isAnySelectMenu()) {
      const { customId } = interaction;
      const parts = customId.split(':');
      const prefix = parts[0];

      try {
        if (prefix === 'map') {
          const { handleMapInteraction } = require('../utils/mapInteractionHandler');
          await handleMapInteraction(interaction, parts);
        } else if (prefix === 'shop') {
          const { handleShopButton } = require('../utils/shopInteractionHandler');
          await handleShopButton(interaction, parts);
        } else if (prefix === 'recipe') {
          const { handleRecipeButton } = require('../utils/recipeInteractionHandler');
          await handleRecipeButton(interaction, parts);
        } else if (prefix === 'openstand') {
          const { handleOpenStandButton } = require('../utils/openstandInteractionHandler');
          await handleOpenStandButton(interaction, parts);
        } else if (prefix === 'admin') {
          const { handleAdminHubInteraction } = require('../utils/adminHubInteractionHandler');
          await handleAdminHubInteraction(interaction, parts);
        } else {
          console.warn(`Unhandled select menu interaction prefix: ${prefix}`);
        }
      } catch (error) {
        console.error(`Error handling select menu prefix ${prefix}:`, error);
        const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
        const { e } = require('../constants/emojis');
        const container = new ContainerBuilder().setAccentColor(0xED4245);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} An error occurred while processing your menu selection.`));
        const payload = {
          components: [container],
          flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    } else if (interaction.isModalSubmit()) {
      const { customId } = interaction;
      const parts = customId.split(':');
      const prefix = parts[0];

      try {
        if (customId.startsWith('admin_')) {
          const { handleGiveawayModalSubmit } = require('../utils/giveawayModalHandler');
          await handleGiveawayModalSubmit(interaction);
        } else if (prefix === 'map') {
          const { handleMapModal } = require('../utils/mapInteractionHandler');
          await handleMapModal(interaction, parts);
        } else if (prefix === 'settings') {
          const { handleSettingsModal } = require('../utils/settingsInteractionHandler');
          await handleSettingsModal(interaction, parts);
        } else if (prefix === 'postupdate_modal') {
          const { handlePostUpdateModal } = require('../utils/changelogInteractionHandler');
          await handlePostUpdateModal(interaction, parts);
        } else if (prefix === 'stand_rename') {
          const { handleStandRenameModal } = require('../utils/standInteractionHandler');
          await handleStandRenameModal(interaction, parts);
        } else {
          console.warn(`Unhandled modal submission prefix: ${prefix}`);
        }
      } catch (error) {
        console.error(`Error handling modal prefix ${prefix}:`, error);
        if (!interaction.replied && !interaction.deferred) {
          const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
          const { e } = require('../constants/emojis');
          const container = new ContainerBuilder().setAccentColor(0xED4245);
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${e('cross_red')} An error occurred while processing this form.`));
          await interaction.reply({
            components: [container],
            flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
          });
        }
      }
    }
  },
};
