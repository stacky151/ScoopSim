import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Learn how to play ScoopSim and see all available commands.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const container = new ContainerBuilder().setAccentColor(0xF59E0B);

    const bannerPath = path.join(__dirname, '../../assets/banners/help_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'help_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://help_banner.jpg')
        )
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${e('scoop')} Welcome to ScoopSim!\n` +
        `Build a global ice cream empire, expand across 15 countries worldwide, serve customers in interactive minigames, dispatch catering fleets, and compete on global leaderboards!\n\n` +
        `*Use the navigation buttons below to jump to interactive menus.*`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${e('store')} Core Gameplay Guide\n` +
        `1. **Start Your Empire**: Run \`/start\` to establish your first ice cream stand in the **USA**.\n` +
        `2. **Serve Customers**: Run \`/stand\` and click **Serve Customer (Minigame)** to play the 3-step interactive serving minigame (Container ➔ Flavor ➔ Topping) and hit 🔥 **Fever Frenzy** (+100% Cash & 2x EXP!).\n` +
        `3. **Automate & Manage**: Head to \`/shop\` to buy flavor refills, containers, and hire staff (*Cleaners*, *Cashiers*, *Managers*) for 24/7 passive income.\n` +
        `4. **Global Expansion**: Run \`/map\` to expand your empire across 15 real-world countries with real-time weather demand multipliers.\n` +
        `5. **Rebirth & Prestige**: Rebirth at Level 15+ to earn Prestige Tokens and unlock permanent global yield multipliers!`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${e('clipboard')} Full Command Reference\n` +
        `**🍦 Stand & Empire Operations:**\n` +
        `• \`/start\` — Create your empire or expand to new countries.\n` +
        `• \`/stand\` — Open your active stand POV & 3-step customer minigame.\n` +
        `• \`/map\` / \`/openstand\` — View global world map & country stand network.\n` +
        `• \`/shop\` — Buy flavor refills, containers, equipment, and hire staff.\n` +
        `• \`/profile\` — View your empire level, net worth, EXP, and stand stats.\n\n` +
        `**☀️ Events & Special Features:**\n` +
        `• \`/summer\` — Top.gg Summer Boardwalk Festival hub & $10,000 gift.\n` +
        `• \`/event\` — Network-wide community scoop milestone event hub.\n` +
        `• \`/catering\` — Dispatch catering trucks on corporate & wedding contracts.\n` +
        `• \`/weather\` — View real-time 2-hour country weather rotations.\n\n` +
        `**🏆 Progression & Social:**\n` +
        `• \`/guild\` — Create or join a guild franchise and upgrade vault perks.\n` +
        `• \`/quests\` — Claim daily and weekly quest cash rewards.\n` +
        `• \`/daily\` — Claim 20-hour streak rewards and spin the fortune wheel.\n` +
        `• \`/leaderboard\` — View server and global top ice cream barons.\n` +
        `• \`/rebirth\` — Reset empire for permanent +50% earnings multipliers.\n` +
        `• \`/prestige\` — Upgrade global yield, speed, and supplier discounts.\n` +
        `• \`/achievements\` — View and claim achievement milestone rewards.\n\n` +
        `**⚙️ Support & Community:**\n` +
        `• \`/ticket\` — Open a private support or giveaway prize claim desk.\n` +
        `• \`/vote\` — Vote on Top.gg for daily bonus cash & streak rewards.\n` +
        `• \`/discord\` — Join the official ScoopSim community support server.\n` +
        `• \`/settings\` — Customize notification preferences & stand themes.\n` +
        `• \`/changelog\` — View recent updates and patch notes.`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:open_quests')
        .setLabel('Daily Quests')
        .setEmoji(e('clipboard'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('profile:open_shop')
        .setLabel('Shop')
        .setEmoji(e('store'))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile:open_leaderboard')
        .setLabel('Leaderboard')
        .setEmoji(e('trophy'))
        .setStyle(ButtonStyle.Secondary)
    );
    container.addActionRowComponents(row);

    await interaction.reply({
      components: [container],
      files: files,
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
    });
  }
};
