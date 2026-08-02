import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
} from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';
import { drawWorldMap, MapCountryStatus } from '../utils/canvasRenderer';
import { COUNTRIES_CONFIG } from '../utils/simulationEngine';

export async function buildMapMessage(userId: string, selectedCountry?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stands: true,
      workers: true,
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const ownedStandsMap = new Map(user.stands.map(s => [s.country, s]));
  const activeStand = user.stands.find(s => s.isActive) || user.stands[0];
  const activeCountry = activeStand ? activeStand.country : null;
  const currentSelection = selectedCountry || (activeCountry || 'USA');
  const targetConfig = COUNTRIES_CONFIG[currentSelection] || COUNTRIES_CONFIG['USA']!;

  const mapData: MapCountryStatus[] = Object.keys(COUNTRIES_CONFIG).map(c => ({
    country: c,
    owned: ownedStandsMap.has(c),
    isActive: c === activeCountry,
    hasManager: user.workers.some(w => w.type === 'manager')
  }));

  const mapBuffer = await drawWorldMap(mapData);
  const attachment = new AttachmentBuilder(mapBuffer, { name: 'world_map.png' });

  const container = new ContainerBuilder().setAccentColor(0x3B82F6);

  const { isOverseer, getOverseerFooter } = require('../constants/overseer');
  let headerText = `# 🌍 World Map & Empire Expansion\n` +
    `Expand your ice cream franchise across 15 global markets. Each country features unique weather patterns, flavor bonuses, and traffic multipliers.\n\n` +
    `• **Your Cash**: ${e('cash')} **$${user.money.toLocaleString()}** | ${e('star')} **Level ${user.level}**\n` +
    `• **Active Location**: 🚩 **${activeCountry ? activeCountry : 'None (Click Below to Start!)'}** (${user.stands.length}/15 Stands Unlocked)\n` +
    getOverseerFooter(userId);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerText));

  const isOwned = ownedStandsMap.has(currentSelection);
  const isCurrentlyActive = activeCountry !== null && currentSelection === activeCountry;

  let statusBadge = '🔒 **Locked**';
  if (isCurrentlyActive) statusBadge = '🚩 **Active Stand Location**';
  else if (isOwned) statusBadge = '✅ **Unlocked Stand**';
  else if (targetConfig.price === 0) statusBadge = '🆓 **Starting Location (FREE)**';

  const cardText = `### 📍 **${targetConfig.name}** (${statusBadge})\n` +
    `*${targetConfig.description}*\n\n` +
    `• ${targetConfig.benefit}\n` +
    `• ${targetConfig.doubt}\n` +
    `• **Unlock Cost**: ${targetConfig.price === 0 ? 'FREE' : `$${targetConfig.price.toLocaleString()}`}` +
    ` (Req. Rebirths: ${targetConfig.rebirths})`;

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cardText));

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const countryKeys = Object.keys(COUNTRIES_CONFIG).slice(0, 25);
  const mapOptions = countryKeys.map(c => {
    const rawLabel = `${c}${c === activeCountry ? ' (Active)' : ownedStandsMap.has(c) ? ' (Owned)' : ''}`;
    const cleanLabel = (rawLabel.trim() || c).slice(0, 100);
    const rawDesc = `Cost: $${COUNTRIES_CONFIG[c]!.price.toLocaleString()} • Rebirths: ${COUNTRIES_CONFIG[c]!.rebirths}`;
    const cleanDesc = rawDesc.slice(0, 100);

    return {
      label: cleanLabel,
      value: c.slice(0, 100),
      description: cleanDesc,
      emoji: c === activeCountry ? '🚩' : ownedStandsMap.has(c) ? '✅' : '🔒',
      default: c === currentSelection
    };
  });

  if (mapOptions.length >= 1 && mapOptions.length <= 25) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`map:select:${userId}`)
      .setPlaceholder('Select a country to inspect & expand...'.slice(0, 150))
      .addOptions(mapOptions);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    container.addActionRowComponents(selectRow);
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>();

  if (isCurrentlyActive) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`map:active:${currentSelection}:${userId}`)
        .setLabel('Currently Active Location')
        .setEmoji('🚩')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true)
    );
  } else if (isOwned) {
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`map:switch:${currentSelection}:${userId}`)
        .setLabel(`Switch Stand to ${currentSelection}`)
        .setEmoji('✈️')
        .setStyle(ButtonStyle.Primary)
    );
  } else {
    const canAfford = user.money >= targetConfig.price;
    const meetsRebirths = user.rebirths >= targetConfig.rebirths;
    const canUnlock = canAfford && meetsRebirths;

    let btnLabel = targetConfig.price === 0 ? `Establish Free Stand in ${currentSelection}` : `Unlock ${currentSelection} ($${targetConfig.price.toLocaleString()})`;
    if (!meetsRebirths) btnLabel = `Req. ${targetConfig.rebirths} Rebirths`;
    else if (!canAfford) btnLabel = `Need $${targetConfig.price.toLocaleString()}`;

    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`map:unlock:${currentSelection}:${userId}`)
        .setLabel(btnLabel)
        .setEmoji(canUnlock ? '🔓' : '🔒')
        .setStyle(canUnlock ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(!canUnlock)
    );
  }

  container.addActionRowComponents(actionRow);

  return {
    components: [container],
    files: [attachment],
    flags: MessageFlags.IsComponentsV2 as any
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Explore the global map and unlock ice cream stands in 15 countries.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${e('scoop')} You need to set up your ice cream stand first! Run \`/start\` to begin.`)
      );
      return interaction.reply({
        components: [errorContainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    const payload = await buildMapMessage(userId);
    await interaction.reply({
      components: payload.components,
      files: payload.files,
      flags: payload.flags | MessageFlags.Ephemeral
    });
  }
};
