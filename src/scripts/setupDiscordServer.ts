import { Guild, ChannelType, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

export async function setupOfficialDiscordServer(guild: Guild): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push(`🚀 Starting Automated Setup for Official Hub Guild: ${guild.name} (${guild.id})...`);

  await guild.channels.fetch().catch(() => {});
  await guild.roles.fetch().catch(() => {});

  const rolesToCreate = [
    { name: '👑 Ice Cream Baron', color: 0xFFD700, hoist: true, permissions: [PermissionFlagsBits.Administrator] },
    { name: '🛡️ Franchise Moderator', color: 0x9B59B6, hoist: true, permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers] },
    { name: '💎 Prestige VIP', color: 0x3498DB, hoist: true, permissions: [] },
    { name: '🍦 Master Scoop', color: 0x2ECC71, hoist: true, permissions: [] },
    { name: '🚚 Catering Expeditor', color: 0xE67E22, hoist: true, permissions: [] },
    { name: '🍧 ScoopShack Baron', color: 0x1ABC9C, hoist: true, permissions: [] }
  ];

  for (const roleDef of rolesToCreate) {
    const existing = guild.roles.cache.find(r => r.name === roleDef.name);
    if (!existing) {
      await guild.roles.create({
        name: roleDef.name,
        color: roleDef.color,
        hoist: roleDef.hoist,
        permissions: roleDef.permissions as any,
        reason: 'ScoopShack Automated Hub Setup'
      }).catch(e => log.push(`⚠️ Failed to create role ${roleDef.name}: ${e.message}`));
      log.push(`✅ Created role: ${roleDef.name}`);
    } else {
      log.push(`ℹ️ Role verified: ${roleDef.name}`);
    }
  }

  const categoryStructure = [
    {
      name: '📢 WELCOME & ANNOUNCEMENTS',
      channels: [
        {
          name: 'rules-and-info',
          readOnly: true,
          bannerAsset: 'channel_rules.jpg',
          title: '📜 OFFICIAL SERVER RULES & INFORMATION',
          content: `# 📜 OFFICIAL SERVER RULES & INFORMATION\n` +
                   `Welcome to the **Official ScoopShack Discord Hub**! To maintain a premium environment for all ice cream barons, please strictly follow these directives:\n\n` +
                   `1. 🤝 **Be Respectful**: Treat all players, staff, and community members with respect.\n` +
                   `2. 🚫 **No Spamming or Exploiting**: Command spamming or exploiting bugs will result in an immediate empire ban.\n` +
                   `3. 📢 **Keep Channels Relevant**: Use bot channels for bot gameplay and support channels for help.\n` +
                   `4. 🎁 **Giveaway Claiming**: All giveaway winners must open a ticket within 48 hours to claim their rewards!`
        },
        {
          name: 'announcements',
          readOnly: true,
          bannerAsset: 'channel_rules.jpg',
          title: '📢 OFFICIAL SCOOPSHACK ANNOUNCEMENTS',
          content: `# 📢 OFFICIAL SCOOPSHACK ANNOUNCEMENTS\n` +
                   `Stay updated with major game releases, event announcements, and dev broadcasts!\n` +
                   `Turn on channel notifications so you never miss an official announcement.`
        },
        {
          name: 'exclusive-giveaways',
          readOnly: true,
          bannerAsset: 'channel_giveaways.jpg',
          title: '🎁 EXCLUSIVE DISCORD-ONLY GIVEAWAYS',
          content: `# 🎁 EXCLUSIVE DISCORD-ONLY GIVEAWAYS\n` +
                   `Welcome to the VIP Giveaway Hub! As a member of our official server, you get access to **Discord-exclusive jackpots**, Cash boosts, Prestige Tokens, and custom stand themes!\n\n` +
                   `When you win a giveaway, a DM will be sent to you. Open a ticket in the support channel to claim your rewards!`
        },
        {
          name: 'patch-notes',
          readOnly: true,
          bannerAsset: 'channel_rules.jpg',
          title: '🚀 GAME UPDATE PATCH NOTES',
          content: `# 🚀 GAME UPDATE PATCH NOTES\n` +
                   `Detailed changelogs, balance patches, and new feature breakdowns are published here by the engineering team!`
        }
      ]
    },
    {
      name: '💬 COMMUNITY & LOUNGE',
      channels: [
        {
          name: 'general-chat',
          readOnly: false,
          bannerAsset: 'channel_rules.jpg',
          title: '💬 GENERAL COMMUNITY LOUNGE',
          content: `# 💬 GENERAL COMMUNITY LOUNGE\n` +
                   `Talk strategy, discuss business expansion, and hang out with fellow ScoopShack ice cream barons!`
        },
        {
          name: 'flex-your-empire',
          readOnly: false,
          bannerAsset: 'channel_rules.jpg',
          title: '🏆 FLEX YOUR EMPIRE',
          content: `# 🏆 FLEX YOUR EMPIRE\n` +
                   `Post screenshots of your high-tier stands, max-level workers, 5-star reviews, and top leaderboard positions!`
        },
        {
          name: 'guild-recruitment',
          readOnly: false,
          bannerAsset: 'channel_rules.jpg',
          title: '🤝 FRANCHISE GUILD RECRUITMENT',
          content: `# 🤝 FRANCHISE GUILD RECRUITMENT\n` +
                   `Recruit members for your franchise guild or find an active ice cream franchise to join!`
        },
        {
          name: 'feedback-and-ideas',
          readOnly: false,
          bannerAsset: 'channel_rules.jpg',
          title: '💡 FEEDBACK & SUGGESTIONS',
          content: `# 💡 FEEDBACK & SUGGESTIONS\n` +
                   `Propose new features, flavor recipes, weather effects, and UI improvements directly to the dev team!`
        }
      ]
    },
    {
      name: '🎫 SUPPORT & CLAIMING',
      channels: [
        {
          name: 'create-a-ticket',
          readOnly: false,
          bannerAsset: 'channel_support.jpg',
          title: '🎫 SUPPORT & GIVEAWAY CLAIM DESK',
          content: `# 🎫 SUPPORT & GIVEAWAY CLAIM DESK\n` +
                   `Need help with your account or won a giveaway?\n` +
                   `Create a ticket or mention the staff team to get instant assistance!`
        },
        {
          name: 'bot-help-faq',
          readOnly: true,
          bannerAsset: 'channel_support.jpg',
          title: '❓ BOT HELP & FREQUENTLY ASKED QUESTIONS',
          content: `# ❓ FREQUENTLY ASKED QUESTIONS\n` +
                   `• **How do I start?**: Type /start to open your first ice cream stand.\n` +
                   `• **How do I serve customers?**: Type /stand and click **Serve Next Customer**.\n` +
                   `• **How do I earn Prestige Tokens?**: Type /prestige once you reach Level 10!\n` +
                   `• **How do I join a Guild?**: Type /guild to view or create a franchise guild.`
        }
      ]
    },
    {
      name: '🤖 SCOOPSHACK BOT ZONES',
      channels: [
        {
          name: 'bot-commands',
          readOnly: false,
          bannerAsset: 'channel_rules.jpg',
          title: '🍦 BOT COMMANDS ZONE',
          content: `# 🍦 BOT COMMANDS ZONE\n` +
                   `Execute all your ScoopShack slash commands here! Type /help for a full command overview.`
        },
        {
          name: 'daily-and-spins',
          readOnly: false,
          bannerAsset: 'channel_giveaways.jpg',
          title: '🎲 DAILY LOYALTY & WHEEL SPINS',
          content: `# 🎲 DAILY LOYALTY & WHEEL SPINS\n` +
                   `Claim your 20-hour daily rewards and spin the fortune wheel here! Type /daily to claim!`
        }
      ]
    }
  ];

  const everyoneRole = guild.roles.everyone;

  for (const catDef of categoryStructure) {
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === catDef.name
    );

    if (!category) {
      category = await guild.channels.create({
        name: catDef.name,
        type: ChannelType.GuildCategory,
        reason: 'ScoopShack Automated Setup'
      });
      log.push(`📁 Created Category: ${catDef.name}`);
    } else {
      log.push(`📁 Verified Category: ${catDef.name}`);
    }

    for (const chanDef of catDef.channels) {
      let channel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText && c.name === chanDef.name
      ) as any;

      if (!channel) {
        const permissionOverwrites: any[] = [];
        if (chanDef.readOnly) {
          permissionOverwrites.push({
            id: everyoneRole.id,
            deny: [PermissionFlagsBits.SendMessages]
          });
        }

        channel = await guild.channels.create({
          name: chanDef.name,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites,
          reason: 'ScoopShack Automated Setup'
        });
        log.push(`💬 Created Channel: #${chanDef.name}`);
      } else {
        log.push(`💬 Verified Channel: #${chanDef.name}`);
      }

      try {
        const recentMessages = await channel.messages.fetch({ limit: 10 }).catch(() => new Map());
        const existingBannerMsg = recentMessages.find((m: any) => m.author.id === guild.client.user?.id);

        if (existingBannerMsg) {
          await existingBannerMsg.delete().catch(() => {});
        }

        const bannerPath = path.join(process.cwd(), 'assets', 'channel_banners', chanDef.bannerAsset);
        const files: AttachmentBuilder[] = [];

        const container = new ContainerBuilder().setAccentColor(0x3B82F6);

        if (fs.existsSync(bannerPath)) {
          const { MediaGalleryItemBuilder } = require('discord.js');
          const attachment = new AttachmentBuilder(bannerPath, { name: chanDef.bannerAsset });
          files.push(attachment);
          const item = new MediaGalleryItemBuilder()
            .setURL('attachment://' + chanDef.bannerAsset)
            .setDescription(chanDef.title);
          const gallery = new MediaGalleryBuilder().addItems(item);
          container.addMediaGalleryComponents(gallery);
        }

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chanDef.content));

        if (chanDef.name === 'create-a-ticket') {
          const ticketRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('ticket:open:general')
              .setLabel('🎫 Open Support & Prize Claim Ticket')
              .setStyle(ButtonStyle.Primary)
          );
          container.addActionRowComponents(ticketRow);
        }

        const sentMsg = await channel.send({
          components: [container],
          files,
          flags: MessageFlags.IsComponentsV2 as any
        });

        await sentMsg.pin().catch(() => {});
        log.push(`📌 Sent & Pinned Component V2 Banner in #${chanDef.name}`);
      } catch (pinErr: any) {
        log.push(`⚠️ Could not send/pin banner in #${chanDef.name}: ${pinErr.message}`);
      }
    }
  }

  log.push(`🎉 OFFICIAL SCOOPSHACK DISCORD SERVER SETUP COMPLETE!`);
  return { success: true, log };
}
