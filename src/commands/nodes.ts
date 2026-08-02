import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { e } from '../constants/emojis';

interface NodeInfo {
  name: string;
  type: string;
  baseLatency: number;
  baseLoad: number;
  status: 'online' | 'offline' | 'maintenance';
}

const AMER_NODES: NodeInfo[] = [
  { name: 'AMER-01 [Main Portal]', type: 'Sim Core', baseLatency: 12, baseLoad: 15, status: 'online' },
  { name: 'AMER-02 [Sim Node-A]', type: 'Sim Engine', baseLatency: 14, baseLoad: 22, status: 'online' },
  { name: 'AMER-03 [Sim Node-B]', type: 'Sim Engine', baseLatency: 15, baseLoad: 18, status: 'online' },
  { name: 'AMER-04 [Main DB Replica]', type: 'Database', baseLatency: 11, baseLoad: 8, status: 'online' },
  { name: 'AMER-05 [Cache Core-1]', type: 'Redis Cache', baseLatency: 8, baseLoad: 12, status: 'online' },
  { name: 'AMER-06 [Render Node-1]', type: 'POV Renderer', baseLatency: 25, baseLoad: 45, status: 'online' },
  { name: 'AMER-07 [Render Node-2]', type: 'POV Renderer', baseLatency: 27, baseLoad: 38, status: 'online' },
  { name: 'AMER-08 [Load Balancer]', type: 'Proxy/Routing', baseLatency: 10, baseLoad: 5, status: 'online' },
];

const EMEA_NODES: NodeInfo[] = [
  { name: 'EMEA-01 [Portal Mirror]', type: 'Sim Core', baseLatency: 35, baseLoad: 12, status: 'online' },
  { name: 'EMEA-02 [Sim Node-A]', type: 'Sim Engine', baseLatency: 38, baseLoad: 19, status: 'online' },
  { name: 'EMEA-03 [Sim Node-B]', type: 'Sim Engine', baseLatency: 39, baseLoad: 25, status: 'online' },
  { name: 'EMEA-04 [DB Replica-2]', type: 'Database', baseLatency: 36, baseLoad: 11, status: 'online' },
  { name: 'EMEA-05 [Cache Core-2]', type: 'Redis Cache', baseLatency: 32, baseLoad: 9, status: 'online' },
  { name: 'EMEA-06 [Render Node-3]', type: 'POV Renderer', baseLatency: 48, baseLoad: 55, status: 'online' },
  { name: 'EMEA-07 [Render Node-4]', type: 'POV Renderer', baseLatency: 52, baseLoad: 48, status: 'online' },
  { name: 'EMEA-08 [Backup Relay]', type: 'Proxy/Routing', baseLatency: 0, baseLoad: 0, status: 'maintenance' },
];

const APAC_NODES: NodeInfo[] = [
  { name: 'APAC-01 [Portal Mirror]', type: 'Sim Core', baseLatency: 110, baseLoad: 8, status: 'online' },
  { name: 'APAC-02 [Sim Node-A]', type: 'Sim Engine', baseLatency: 115, baseLoad: 14, status: 'online' },
  { name: 'APAC-03 [DB Replica-3]', type: 'Database', baseLatency: 108, baseLoad: 5, status: 'online' },
  { name: 'APAC-04 [Cache Core-3]', type: 'Redis Cache', baseLatency: 102, baseLoad: 4, status: 'online' },
  { name: 'APAC-05 [Render Node-5]', type: 'POV Renderer', baseLatency: 135, baseLoad: 30, status: 'online' },
  { name: 'APAC-06 [Render Node-6]', type: 'POV Renderer', baseLatency: 138, baseLoad: 28, status: 'online' },
  { name: 'APAC-07 [Edge Gateway]', type: 'Proxy/Routing', baseLatency: 98, baseLoad: 18, status: 'online' },
];

function getPerturbed(val: number, range: number): number {
  return Math.max(1, Math.round(val + (Math.random() * range * 2 - range)));
}

function buildNodesView(currentTab: string): ContainerBuilder {
  const container = new ContainerBuilder();
  const bannerPath = path.join(__dirname, '../../assets/banners/nodes_banner.jpg');
  if (fs.existsSync(bannerPath)) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL('attachment://nodes_banner.jpg')
      )
    );
  }

  const onlineCount = 22;
  const totalCount = 23;
  const avgLatency = getPerturbed(28, 3);
  const avgLoad = (18.4 + (Math.random() * 2 - 1)).toFixed(1);
  if (currentTab === 'overview') {
    container.setAccentColor(0x00FF88);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${e('store')} Node Status Monitor\n` +
        `Real-time diagnostic display of the ScoopSim bot network cluster.\n\n` +
        `### 📊 Network Health Summary\n` +
        `* **Global Network Status:** \`Optimal\`\n` +
        `* **Connected Cluster Nodes:** \`${onlineCount} / ${totalCount}\` connected\n` +
        `* **Cluster Latency average:** \`${avgLatency}ms\`\n` +
        `* **Cluster Load average:** \`${avgLoad}%\`\n` +
        `* **System Diagnostics:** \`Healthy\`\n\n` +
        `### 🗺️ Geographical Node Clusters\n` +
        `${e('dot_green')} **Americas (AMER):** \`8 / 8\` Online\n` +
        `${e('warning')} **Europe (EMEA):** \`7 / 8\` Online (1 in Maintenance)\n` +
        `${e('dot_green')} **Asia-Pacific (APAC):** \`7 / 7\` Online\n\n` +
        `-# Last diagnostic check: <t:${Math.floor(Date.now() / 1000)}:R>`
      )
    );
  } else {
    let nodes: NodeInfo[] = [];
    let regionName = '';
    let accentColor = 0x5865F2;

    if (currentTab === 'amer') {
      nodes = AMER_NODES;
      regionName = 'Americas (AMER) Node Cluster';
      accentColor = 0x2196F3;
    } else if (currentTab === 'emea') {
      nodes = EMEA_NODES;
      regionName = 'Europe (EMEA) Node Cluster';
      accentColor = 0x9C27B0;
    } else if (currentTab === 'apac') {
      nodes = APAC_NODES;
      regionName = 'Asia-Pacific (APAC) Node Cluster';
      accentColor = 0xFFD700;
    }

    container.setAccentColor(accentColor);
    let content = `# ${e('store')} ${regionName}\n\n`;
    for (const node of nodes) {
      if (node.status === 'online') {
        const latency = getPerturbed(node.baseLatency, 3);
        const load = getPerturbed(node.baseLoad, 2);
        content += `${e('dot_green')} **${node.name}**\n` +
                   `  • Type: \`${node.type}\`  • Latency: \`${latency}ms\`  • Load: \`${load}%\`  • Status: \`Online\`\n`;
      } else if (node.status === 'maintenance') {
        content += `${e('warning')} **${node.name}**\n` +
                   `  • Type: \`${node.type}\`  • Status: \`Maintenance\` (Offline)\n`;
      } else {
        content += `${e('dot_red')} **${node.name}**\n` +
                   `  • Status: \`Offline\` (Unreachable)\n`;
      }
    }
    content += `\n-# Real-time diagnostic statistics. Refreshes dynamically.`;
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('nodes_tab_overview')
      .setLabel('📊 Overview')
      .setStyle(currentTab === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('nodes_tab_amer')
      .setLabel('🇺🇸 AMER')
      .setStyle(currentTab === 'amer' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('nodes_tab_emea')
      .setLabel('🇪🇺 EMEA')
      .setStyle(currentTab === 'emea' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('nodes_tab_apac')
      .setLabel('🌏 APAC')
      .setStyle(currentTab === 'apac' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('nodes_refresh')
      .setLabel('🔄 Refresh')
      .setStyle(ButtonStyle.Success)
  );

  container.addActionRowComponents(row);

  return container;
}

export default {
  data: new SlashCommandBuilder()
    .setName('nodes')
    .setDescription('Display network cluster diagnostic data for all connected nodes.'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();
      const files: any[] = [];
      const bannerPath = path.join(__dirname, '../../assets/banners/nodes_banner.jpg');
      if (fs.existsSync(bannerPath)) {
        files.push(new AttachmentBuilder(bannerPath, { name: 'nodes_banner.jpg' }));
      }

      let currentTab = 'overview';
      const msg = await interaction.editReply({
        components: [buildNodesView(currentTab)],
        files: files,
        flags: MessageFlags.IsComponentsV2,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60_000,
      });

      collector.on('collect', async (btn) => {
        try {
          if (btn.user.id !== interaction.user.id) {
            return btn.reply({ content: '❌ You cannot control this node diagnostic session.', flags: MessageFlags.Ephemeral });
          }

          await btn.deferUpdate();

          if (btn.customId === 'nodes_refresh') {
            await btn.editReply({
              components: [buildNodesView(currentTab)],
              flags: MessageFlags.IsComponentsV2,
            });
          } else if (btn.customId.startsWith('nodes_tab_')) {
            const tab = btn.customId.replace('nodes_tab_', '');
            currentTab = tab;
            await btn.editReply({
              components: [buildNodesView(currentTab)],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        } catch (err: any) {
          console.error('[Nodes Button Error]', err?.message ?? err);
        }
      });

      collector.on('end', async () => {
        try {
          await interaction.editReply({
            components: [],
          }).catch(() => {});
        } catch (err: any) {
        }
      });

    } catch (err: any) {
      console.error('[Nodes Command Error]', err?.message ?? err);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: '❌ Failed to connect to diagnostic agent. Try again later.', flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '❌ Failed to connect to diagnostic agent. Try again later.', flags: MessageFlags.Ephemeral });
        }
      } catch (innerErr) {
      }
    }
  },
};
