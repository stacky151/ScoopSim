import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MediaGalleryBuilder, MediaGalleryItemBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, AttachmentBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { drawWorldMap } from '../utils/canvasRenderer';
import { COUNTRIES_CONFIG, getActiveDurationMinutes } from '../utils/simulationEngine';
import { e } from '../constants/emojis';

export async function buildMapHubMessage(userId: string) {
  const stands = await prisma.iceCreamStand.findMany({
    where: { userId },
    include: { batches: true }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workers: true }
  });

  if (!user) throw new Error('User not found');

  let unreadCount = 0;
  const latestChangelog = await prisma.changelog.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (latestChangelog && user.lastReadChangelogId !== latestChangelog.id) {
    if (user.lastReadChangelogId) {
      const lastReadLog = await prisma.changelog.findUnique({
        where: { id: user.lastReadChangelogId }
      });
      unreadCount = await prisma.changelog.count({
        where: {
          createdAt: { gt: lastReadLog ? lastReadLog.createdAt : new Date(0) }
        }
      });
    } else {
      unreadCount = await prisma.changelog.count();
    }
  }

  const hasManager = user.workers.some(w => w.type === 'manager');

  const standsData = Object.keys(COUNTRIES_CONFIG).map(countryName => {
    const stand = stands.find(s => s.country === countryName);
    return {
      country: countryName,
      owned: !!stand,
      isActive: stand ? stand.isActive : false,
      hasManager: hasManager
    };
  });

  const imageBuffer = await drawWorldMap(standsData);
  const attachment = new AttachmentBuilder(imageBuffer, { name: 'world_map.png' });

  const container = new ContainerBuilder().setAccentColor(0x0f172a);

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL('attachment://world_map.png').setDescription('Global Ice Cream Network Map')
    )
  );

  const flagMap: Record<string, string> = {
    USA: 'flag_usa',
    Italy: 'flag_italy',
    Japan: 'flag_japan',
    Brazil: 'flag_brazil',
    Egypt: 'flag_egypt',
    France: 'flag_france',
    Australia: 'flag_australia',
    Belgium: 'flag_belgium',
    Iceland: 'flag_iceland',
    'South Africa': 'flag_south_africa',
    Mexico: 'flag_mexico',
    India: 'flag_india',
    Germany: 'flag_germany',
    Spain: 'flag_spain',
    Canada: 'flag_canada'
  };

  let indexText = `# ${e('globe')} Global Stand Network\n` +
    `${e('wallet')} **Wallet**: $${user.money.toLocaleString()} | ${e('star')} **Level**: ${user.level} | Rebirths: ${user.rebirths}\n\n` +
    `### ${e('store')} Stand Index:\n`;

  if (stands.length === 0) {
    indexText += `*No stands established. Run \`/start\` to establish your first stand!*`;
  } else {
    for (const st of stands) {
      let statusIcon = `${e('dot_red')} Closed`;
      if (hasManager) statusIcon = `${e('tie')} Automated`;
      else if (st.isActive) statusIcon = `${e('dot_green')} Open`;

      const totalScoops = st.batches.reduce((sum, b) => sum + b.scoops, 0);
      const totalCones = st.batches.reduce((sum, b) => sum + b.cones, 0);
      const totalCups = st.batches.reduce((sum, b) => sum + b.pots, 0);

      const ratingVal = (st.rating ?? 5.0).toFixed(1);
      indexText += `• **${st.name}** (${st.country}) | ⭐ **${ratingVal}** | Status: ${statusIcon}\n`;
      indexText += `  └- Cones: ${totalCones} | Cups: ${totalCups} | Scoops: ${totalScoops} | Unclaimed: **$${st.unclaimedMoney.toLocaleString()}**\n`;
    }
  }

  indexText += `\n### ${e('globe')} Available Countries:\n`;
  for (const [name, config] of Object.entries(COUNTRIES_CONFIG)) {
    const stand = stands.find(s => s.country === name);
    const owned = !!stand;
    const isAct = stand ? stand.isActive : false;
    const flagKey = flagMap[name] || 'globe';

    let statusStr = `${e('lock')} Locked`;
    if (owned) {
      if (hasManager) statusStr = `${e('tie')} Automated`;
      else if (isAct) statusStr = `${e('dot_green')} Open`;
      else statusStr = `${e('dot_red')} Closed`;
    }
    indexText += `• ${e(flagKey as any)} **${name}**: ${statusStr}\n`;
  }

  const { isOverseer, getOverseerFooter } = require('../constants/overseer');
  indexText += getOverseerFooter(userId);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(indexText));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`openstand:select_country:${userId}`)
    .setPlaceholder('🌍 Select a Country Location to View / Unlock...'.slice(0, 150));

  const countryEntries = Object.entries(COUNTRIES_CONFIG).slice(0, 25);
  const countryOptions: StringSelectMenuOptionBuilder[] = [];

  for (const [name, config] of countryEntries) {
    const stand = stands.find(s => s.country === name);
    const owned = !!stand;
    const isAct = stand ? stand.isActive : false;

    const rawLabel = `${name} — ${owned ? (isAct ? 'Open (Active)' : 'Owned (Closed)') : `Unlock ($${config.price.toLocaleString()})`}`;
    const cleanLabel = (rawLabel.trim() || name).slice(0, 100);
    const rawDesc = (config.description || '').trim();
    const cleanDesc = (rawDesc || `View ${name}`).slice(0, 100);

    countryOptions.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(cleanLabel)
        .setValue(name.slice(0, 100))
        .setDescription(cleanDesc)
    );
  }

  if (countryOptions.length >= 1 && countryOptions.length <= 25) {
    selectMenu.addOptions(countryOptions);
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    container.addActionRowComponents(selectRow);
  }

  const hasUpdates = unreadCount > 0;
  const changelogButton = new ButtonBuilder()
    .setCustomId('openstand:changelog')
    .setLabel(hasUpdates ? `Updates & Changelog (${unreadCount} New!)` : 'Updates & Changelog')
    .setEmoji(hasUpdates ? e('dot_red') : e('clipboard'))
    .setStyle(hasUpdates ? ButtonStyle.Danger : ButtonStyle.Secondary);

  const changelogRow = new ActionRowBuilder<ButtonBuilder>().addComponents(changelogButton);

  container.addActionRowComponents(changelogRow);

  const components: any[] = [container];

  return {
    components,
    files: [attachment],
    flags: MessageFlags.IsComponentsV2
  };
}

export async function buildCountryStandsMessage(userId: string, country: string) {
  const stands = await prisma.iceCreamStand.findMany({
    where: { userId, country },
    include: { batches: true }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workers: true }
  });

  if (!user) throw new Error('User not found');

  const hasManager = user.workers.some(w => w.type === 'manager');
  const now = new Date();

  const container = new ContainerBuilder().setAccentColor(0x3b82f6);

  const flagMap: Record<string, string> = {
    USA: 'flag_usa',
    Italy: 'flag_italy',
    Japan: 'flag_japan',
    Brazil: 'flag_brazil',
    Egypt: 'flag_egypt',
    France: 'flag_france',
    Australia: 'flag_australia',
    Belgium: 'flag_belgium',
    Iceland: 'flag_iceland',
    'South Africa': 'flag_south_africa'
  };
  const flagKey = flagMap[country] || 'store';

  let text = `# ${e(flagKey as any)} Stands in ${country}\n` +
    `${e('wallet')} **Wallet**: $${user.money.toLocaleString()}\n\n`;

  const row = new ActionRowBuilder<ButtonBuilder>();

  if (stands.length === 0) {
    text += `*You do not own any stands in ${country} yet.*`;
  } else {
    for (const stand of stands) {
      let activeText = `${e('dot_red')} Closed`;
      if (hasManager) {
        activeText = `${e('tie')} Automated (24/7)`;
      } else if (stand.isActive && stand.activeUntil) {
        const remaining = Math.max(0, Math.floor((new Date(stand.activeUntil).getTime() - now.getTime()) / 60000));
        activeText = `${e('dot_green')} Active (${remaining}m remaining)`;
      }

      text += `## ${stand.name}\n` +
        `• **Cleanliness**: ${stand.cleanliness}%\n` +
        `• **Unclaimed Money**: $${stand.unclaimedMoney.toLocaleString()}\n` +
        `• **Upgrades**: Storage Lv. ${stand.storageLevel} | Interest Lv. ${stand.interestLevel} | Duration Lv. ${stand.activeDurationLevel}\n` +
        `• **Status**: ${activeText}\n\n` +
        `### Batches:\n`;

      for (const batch of stand.batches) {
        text += `- **${batch.flavor.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}**: ${batch.scoops}/${batch.maxScoops} scoops | ${batch.cones}/${batch.maxCones} cones | ${batch.pots}/${batch.maxPots} cups\n`;
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`stand:select_open:${stand.id}`)
          .setLabel(`Open ${stand.name.substring(0, 12)}`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`stand:upgrades_menu:${stand.id}`)
          .setLabel('Upgrades')
          .setEmoji(e('gear'))
          .setStyle(ButtonStyle.Primary)
      );
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('openstand:back_to_hub')
      .setLabel('Back to Map Hub')
      .setEmoji(e('arrow_back'))
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(navRow);
  const components = [container];
  if (row.components.length > 0) {
    const controlContainer = new ContainerBuilder().setAccentColor(0x3b82f6);
    controlContainer.addActionRowComponents(row);
    components.push(controlContainer);
  }

  return {
    components,
    flags: MessageFlags.IsComponentsV2
  };
}

export async function buildChangelogMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('User not found');

  const newestLog = await prisma.changelog.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const categories = ['update', 'bug_fix', 'big_update'] as const;
  const unreadCounts: Record<string, number> = {};

  const lastReadLog = user.lastReadChangelogId
    ? await prisma.changelog.findUnique({ where: { id: user.lastReadChangelogId } })
    : null;

  for (const cat of categories) {
    unreadCounts[cat] = await prisma.changelog.count({
      where: {
        category: cat,
        createdAt: {
          gt: lastReadLog ? lastReadLog.createdAt : new Date(0)
        }
      }
    });
  }

  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  let text = `# ${e('clipboard')} Broadcast Center\n\n`;

  const categoryEmojis: Record<string, string> = {
    update: e('gear'),
    bug_fix: e('broom'),
    big_update: e('star'),
  };

  const categoryLabels: Record<string, string> = {
    update: 'System Updates',
    bug_fix: 'Bug Fixes',
    big_update: 'Major Expansions',
  };

  if (!newestLog) {
    text += `*No update logs have been broadcasted yet.*`;
  } else {
    const emoji = categoryEmojis[newestLog.category] || e('warning');
    const label = categoryLabels[newestLog.category] || 'General';
    const dateStr = new Date(newestLog.createdAt).toLocaleDateString();

    text += `### ${e('sparkles')} Latest Broadcast:\n` +
      `**${emoji} ${newestLog.title}** (${label})\n` +
      `*Posted on ${dateStr}*\n\n` +
      `${newestLog.description}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Select a category below to browse historical archives.*`;
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const cat of categories) {
    const count = unreadCounts[cat] || 0;
    const label = categoryLabels[cat] || 'General';
    const emoji = categoryEmojis[cat] || e('warning');

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`changelog:cat:${cat}:0`)
        .setLabel(count > 0 ? `${label} (${count} New!)` : label)
        .setEmoji(count > 0 ? e('dot_red') : emoji)
        .setStyle(count > 0 ? ButtonStyle.Danger : ButtonStyle.Secondary)
    );
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('openstand:back_to_hub')
      .setLabel('Back to Map Hub')
      .setEmoji(e('arrow_back'))
      .setStyle(ButtonStyle.Primary)
  );

  container.addActionRowComponents(row);
  const container2 = new ContainerBuilder().setAccentColor(0x5865F2);
  container2.addActionRowComponents(navRow);

  return {
    components: [container, container2],
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export async function buildChangelogCategoryMessage(userId: string, category: string, page: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) throw new Error('User not found');

  const pageSize = 1;
  const skip = page * pageSize;

  const total = await prisma.changelog.count({
    where: { category }
  });

  const logs = await prisma.changelog.findMany({
    where: { category },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize
  });

  const categoryEmojis: Record<string, string> = {
    update: e('gear'),
    bug_fix: e('broom'),
    big_update: e('star'),
  };

  const categoryLabels: Record<string, string> = {
    update: 'System Updates',
    bug_fix: 'Bug Fixes',
    big_update: 'Major Expansions',
  };

  const catEmoji = categoryEmojis[category] || e('warning');
  const catLabel = categoryLabels[category] || 'General';

  const container = new ContainerBuilder().setAccentColor(0x5865F2);

  let text = `# ${catEmoji} ${catLabel} Archive\n\n`;

  if (logs.length === 0) {
    text += `*No updates in this category.*`;
  } else {
    const log = logs[0];
    if (!log) {
      text += `*No updates in this category.*`;
    } else {
      const dateStr = new Date(log.createdAt).toLocaleDateString();

      text += `## ${log.title}\n` +
        `*Posted on ${dateStr}*\n\n` +
        `${log.description}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Page ${page + 1} of ${total}*`;
    }
  }

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const navRow = new ActionRowBuilder<ButtonBuilder>();
  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`changelog:cat:${category}:${page - 1}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0 || total === 0)
  );

  const hasNext = (page + 1) * pageSize < total;
  navRow.addComponents(
    new ButtonBuilder()
      .setCustomId(`changelog:cat:${category}:${page + 1}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasNext || total === 0)
  );

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('openstand:changelog')
      .setLabel('Back to Broadcasts')
      .setEmoji(e('arrow_back'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('openstand:back_to_hub')
      .setLabel('Back to Map Hub')
      .setEmoji(e('globe'))
      .setStyle(ButtonStyle.Secondary)
  );

  container.addActionRowComponents(navRow);

  const container2 = new ContainerBuilder().setAccentColor(0x5865F2);
  container2.addActionRowComponents(actionRow);

  return {
    components: [container, container2],
    flags: MessageFlags.IsComponentsV2 as any
  };
}
