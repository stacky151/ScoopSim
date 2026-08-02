import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('discord')
    .setDescription('Join the official ScoopSim Discord Community & invite the bot!'),

  async execute(interaction: ChatInputCommandInteraction) {
    const botClientId = interaction.client.user?.id || '763123509417214022';
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${botClientId}&permissions=274878287936&scope=bot%20applications.commands`;
    const discordCommunityUrl = 'https://discord.gg/WJnDk43hw3';

    const container = new ContainerBuilder().setAccentColor(0x5865F2);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 💬 Official ScoopSim Community & Bot Invite Hub\n` +
        `Join our thriving community of ice cream barons, participate in **server-exclusive giveaways**, get instant dev updates, and expand your franchise empire!\n\n` +
        `### ⭐ Community Perks & Benefits\n` +
        `• 🎁 **Exclusive Server-Only Giveaways**: Cash jackpots, Prestige Tokens, and custom stand themes!\n` +
        `• 📢 **Patch Updates & Sneak Peeks**: Direct access to incoming game updates and feature voting.\n` +
        `• 💬 **Baron Trading & Guild Recruitment**: Connect with top players and recruit members for your franchise guild.\n` +
        `• ➕ **Bot Installation**: Add ScoopSim to your server with strictly required permissions!\n\n` +
        `-# Click below to join the community or add ScoopSim to your server.`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('💬 Join Official ScoopSim Discord')
        .setURL(discordCommunityUrl)
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('➕ Invite ScoopSim Bot to Your Server')
        .setURL(inviteUrl)
        .setStyle(ButtonStyle.Link)
    );

    container.addActionRowComponents(buttonRow);

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 as any
    });
  }
};
