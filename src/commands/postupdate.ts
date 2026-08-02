import { SlashCommandBuilder, ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('postupdate')
    .setDescription('Post a new changelog update to all players (Developer only).')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('The update category type')
        .setRequired(true)
        .addChoices(
          { name: '⚙️ General Update', value: 'update' },
          { name: '🧹 Bug Fixes', value: 'bug_fix' },
          { name: '⭐ Major Update', value: 'big_update' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const allowedGuilds = ['763123509417214022'];
    if (process.env.GUILD_ID) allowedGuilds.push(process.env.GUILD_ID);
    if (process.env.GUILD_IDS) {
      const devGuilds = process.env.GUILD_IDS.split(',').map(id => id.trim()).filter(Boolean);
      allowedGuilds.push(...devGuilds);
    }

    if (!allowedGuilds.includes(interaction.guildId || '') || interaction.user.id !== '711620148053803069') {
      return interaction.reply({
        content: '🚫 Restricted: Developer-only command in the home guild.',
        flags: MessageFlags.Ephemeral
      });
    }

    const category = interaction.options.getString('category', true);

    const modal = new ModalBuilder()
      .setCustomId(`postupdate_modal:${category}`)
      .setTitle('Publish New Update');

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Update Title')
      .setPlaceholder('e.g., V1.2.0 - Clean Map & Changelog System')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const descInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Details / Changelog Notes')
      .setPlaceholder('Enter the update descriptions and details here...')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(3800)
      .setRequired(true);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(descInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }
};
