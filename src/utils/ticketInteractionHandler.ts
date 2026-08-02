import { ButtonInteraction, ChannelType, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

export async function handleTicketButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];

  if (action === 'open') {
    const guild = interaction.guild;
    if (!guild) return;

    const user = interaction.user;
    const ticketChannelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 30);

    const existingChannel = guild.channels.cache.find(c => c.name === ticketChannelName);
    if (existingChannel) {
      const infoContainer = new ContainerBuilder().setAccentColor(0x3B82F6);
      infoContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`ℹ️ You already have an active ticket open: <#${existingChannel.id}>!`)
      );
      return interaction.reply({
        components: [infoContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    const category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.includes('SUPPORT')
    );

    const ticketChannel = await guild.channels.create({
      name: ticketChannelName,
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
        }
      ],
      reason: `Support Ticket created by ${user.tag}`
    });

    const modRole = guild.roles.cache.find(r => r.name.includes('Franchise Moderator'));
    const modMention = modRole ? `<@&${modRole.id}>` : '**🛡️ Franchise Moderator Team**';

    await ticketChannel.send({
      content: `<@${user.id}> ${modRole ? `<@&${modRole.id}>` : ''}`
    }).catch(() => {});

    const ticketContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    ticketContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# 🎫 OFFICIAL SUPPORT & PRIZE CLAIM DESK\n` +
        `Welcome <@${user.id}>! The ${modMention} team has been notified of your ticket.\n\n` +
        `⏳ **PLEASE REMAIN PATIENT**\n` +
        `Our staff team handles tickets in the order they are received. Please describe your request below and stay patient while an administrator or moderator connects with you.\n\n` +
        `📋 **WHY ARE YOU CREATING THIS TICKET?**\n` +
        `• 🎁 **Giveaway Prize Claiming**: Post a screenshot of your giveaway winning DM receipt and state your in-game username.\n` +
        `• 🐞 **Bug Reports & Issues**: Explain what happened, what command you used, and attach any screenshots.\n` +
        `• 💼 **Guild & Account Help**: Provide your Discord User ID and state what you need assistance with.\n\n` +
        `-# Click below when your request is fully resolved to close this ticket channel.`
      )
    );

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket:close')
        .setLabel('🔒 Close Support Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    ticketContainer.addActionRowComponents(closeRow);

    await ticketChannel.send({
      components: [ticketContainer],
      flags: MessageFlags.IsComponentsV2 as any
    });

    const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
    successContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`✅ **Support ticket created!** Head over to <#${ticketChannel.id}> to get assistance!`)
    );

    return interaction.reply({
      components: [successContainer],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }

  if (action === 'close') {
    const channel = interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const closeContainer = new ContainerBuilder().setAccentColor(0xED4245);
    closeContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`🔒 **Closing ticket channel in 5 seconds...** Thank you for contacting ScoopSim Support!`)
    );

    await interaction.reply({
      components: [closeContainer],
      flags: MessageFlags.IsComponentsV2 as any
    });

    setTimeout(async () => {
      await channel.delete().catch(() => {});
    }, 5000);
  }
}
