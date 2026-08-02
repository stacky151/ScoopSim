import { Client, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';

export async function buildAdminHubMessage(client: Client, userId: string, activeTab: string = 'overview', selectedGuildId?: string) {
  const container = new ContainerBuilder().setAccentColor(0x9B59B6);

  const totalUsers = await prisma.user.count();
  const totalStands = await prisma.iceCreamStand.count();
  const serverStatAgg = await prisma.serverStat.aggregate({ _sum: { commandCount: true } });
  const totalCommandsNet = serverStatAgg._sum.commandCount || 0;

  const connectedGuilds = Array.from(client.guilds.cache.values());
  const activeGiveaway = await prisma.giveaway.findFirst({
    where: { isEnded: false },
    orderBy: { createdAt: 'desc' }
  });

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 👑 ScoopSim Central Intelligence — Admin Command Hub\n` +
      `*Production Network Management, Server Telemetry & Live Operations Studio*\n\n` +
      `🌐 **Connected Servers**: **${connectedGuilds.length} Guilds** | 👥 **Registered Users**: **${totalUsers.toLocaleString()}** | ⚡ **Network Commands**: **${totalCommandsNet.toLocaleString()}**`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (activeTab === 'overview') {
    let text = `## 📊 Network Server Telemetry\n` +
      `Select a server from the dropdown menu below to inspect member metrics, usage stats, and execute live server operations.\n\n`;

    const serverStatsMap = new Map((await prisma.serverStat.findMany()).map(s => [s.guildId, s.commandCount]));

    connectedGuilds.slice(0, 10).forEach(g => {
      const cmds = serverStatsMap.get(g.id) || 0;
      text += `• 🏰 **${g.name}** (\`${g.id}\`): **${g.memberCount.toLocaleString()} Members** | **${cmds} Commands Executed**\n`;
    });

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`admin:select_server:${userId}`)
      .setPlaceholder('🔍 Select a Server to Inspect & Manage...'.slice(0, 150));

    const serverOptions: StringSelectMenuOptionBuilder[] = [];

    connectedGuilds.slice(0, 25).forEach(g => {
      const cmds = serverStatsMap.get(g.id) || 0;
      const rawLabel = `${g.name} (${g.memberCount} Members)`;
      const cleanLabel = (rawLabel.trim() || `Guild ${g.id}`).slice(0, 100);
      const rawDesc = `ID: ${g.id} | Commands Executed: ${cmds}`;
      const cleanDesc = rawDesc.slice(0, 100);

      serverOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(cleanLabel)
          .setValue(g.id.slice(0, 100))
          .setDescription(cleanDesc)
      );
    });

    if (serverOptions.length >= 1 && serverOptions.length <= 25) {
      selectMenu.addOptions(serverOptions);
      container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }
  } else if (activeTab === 'server_detail' && selectedGuildId) {
    const guild = client.guilds.cache.get(selectedGuildId);
    const serverStat = await prisma.serverStat.findUnique({ where: { guildId: selectedGuildId } });
    const isBanned = !!(await prisma.bannedServer.findUnique({ where: { id: selectedGuildId } }));
    const serverStands = await prisma.iceCreamStand.count({
      where: {
        user: {
          guildMember: { guildId: selectedGuildId }
        }
      }
    });

    let text = `## 🏰 Server Inspector — ${guild ? guild.name : 'Unknown Guild'}\n` +
      `• **Guild ID**: \`${selectedGuildId}\`\n` +
      `• **Server Status**: ${isBanned ? `${e('cross_red')} **BLACK-LISTED / BANNED**` : `${e('check_green')} **ACTIVE & HEALTHY**`}\n` +
      `• **Total Server Members**: **${guild ? guild.memberCount.toLocaleString() : 'N/A'}**\n` +
      `• **Total Server Commands Executed**: **${serverStat ? serverStat.commandCount.toLocaleString() : 0}**\n` +
      `• **Active Open Stands**: **${serverStands} Stands**\n\n` +
      `### ⚡ Live Server Operations:`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin:action:reset_server:${selectedGuildId}:${userId}`)
        .setLabel('⚡ Reset Server Economy')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`admin:action:toggle_ban_server:${selectedGuildId}:${userId}`)
        .setLabel(isBanned ? '✅ Unban Server' : '🚫 Ban Server')
        .setStyle(isBanned ? ButtonStyle.Success : ButtonStyle.Danger)
    );

    container.addActionRowComponents(actionRow);
  } else if (activeTab === 'users') {
    let text = `## 👥 User Operations & Blacklist Center\n` +
      `Credit funds or globally manage user access across ScoopSim.\n\n` +
      `• **Banned Users Count**: **${await prisma.bannedUser.count()}**\n` +
      `• **Banned Servers Count**: **${await prisma.bannedServer.count()}**\n`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin:action:modal_user_credit:${userId}`)
        .setLabel('💵 Give Cash / Tokens')
        .setEmoji(e('cash'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`admin:action:modal_user_ban:${userId}`)
        .setLabel('⛔ Ban / Unban User')
        .setStyle(ButtonStyle.Danger)
    );

    container.addActionRowComponents(actionRow);
  } else if (activeTab === 'events') {
    let text = `## 🌪️ Global Events & Weather Engine\n` +
      `Instantly trigger or manipulate global environmental parameters.\n\n`;

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin:action:force_weather:${userId}`)
        .setLabel('🌪️ Force Weather Rotation')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`admin:action:trigger_expo:${userId}`)
        .setLabel('🎪 Trigger World Expo Event')
        .setStyle(ButtonStyle.Success)
    );

    container.addActionRowComponents(actionRow);
  } else if (activeTab === 'giveaway') {
    let text = `## 🎉 Giveaway Studio & Network Broadcast\n` +
      `Create official giveaway announcements that automatically pop up on users' 1st command and every 15 commands until entered.\n\n`;

    if (activeGiveaway) {
      const entryCount = await prisma.giveawayEntry.count({ where: { giveawayId: activeGiveaway.id } });
      text += `### 🌟 Active Giveaway Status\n` +
        `• **Title**: **${activeGiveaway.title}**\n` +
        `• **Status**: ${activeGiveaway.isPublished ? '🚀 **PUBLISHED & LIVE**' : '📝 **DRAFT PREVIEW**'}\n` +
        `• **Total Entries Received**: **${entryCount} Entries**\n` +
        `• **Winner Count**: **${activeGiveaway.winnerCount} Winners**\n` +
        `• **Ends**: <t:${Math.floor(activeGiveaway.endsAt.getTime() / 1000)}:R>\n\n`;
    } else {
      text += `*No active giveaway found. Click below to launch a new giveaway modal!*\n\n`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`admin:action:modal_create_giveaway:${userId}`)
        .setLabel('🎉 Create New Giveaway')
        .setStyle(ButtonStyle.Primary)
    );

    if (activeGiveaway && !activeGiveaway.isPublished) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin:action:publish_giveaway:${activeGiveaway.id}:${userId}`)
          .setLabel('🚀 Publish Giveaway Draft')
          .setStyle(ButtonStyle.Success)
      );
    } else if (activeGiveaway && activeGiveaway.isPublished && !activeGiveaway.isEnded) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`admin:action:draw_giveaway_winners:${activeGiveaway.id}:${userId}`)
          .setLabel('🎲 Draw Winners Now')
          .setStyle(ButtonStyle.Success)
      );
    }

    container.addActionRowComponents(actionRow);
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const tabRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`admin:tab:overview:${userId}`)
      .setLabel('Overview')
      .setEmoji('📊')
      .setStyle(activeTab === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`admin:tab:users:${userId}`)
      .setLabel('User Operations')
      .setEmoji('👥')
      .setStyle(activeTab === 'users' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`admin:tab:events:${userId}`)
      .setLabel('Global Events')
      .setEmoji('🌪️')
      .setStyle(activeTab === 'events' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`admin:tab:giveaway:${userId}`)
      .setLabel('Giveaway Studio')
      .setEmoji('🎉')
      .setStyle(activeTab === 'giveaway' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  container.addActionRowComponents(tabRow);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}
