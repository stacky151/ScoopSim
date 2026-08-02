import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from 'discord.js';
import * as path from 'path';
import * as fs from 'fs';
import { getCountryWeather } from '../utils/weatherEngine';
import { COUNTRIES_CONFIG } from '../utils/simulationEngine';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Check real-time global weather conditions & flavor demand multipliers.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const container = new ContainerBuilder().setAccentColor(0x38BDF8);

    const bannerPath = path.join(__dirname, '../../assets/banners/weather_banner.jpg');
    const files: any[] = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'weather_banner.jpg' }));
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL('attachment://weather_banner.jpg')
        )
      );
    }

    let weatherReport = `# 🌤️ Global Weather & Flavor Demand Report\n` +
      `Real-time weather states rotate every 2 hours across all 15 global markets. Match your stand's active flavor batches to active weather trends to maximize revenue!\n\n`;

    const countryEntries = Object.entries(COUNTRIES_CONFIG);
    for (const [key, config] of countryEntries) {
      const weather = getCountryWeather(config.name);
      weatherReport += `📍 **${config.name}**: ${weather.emoji} **${weather.name}**\n` +
        `• Sales Multiplier: \`${weather.salesMult}x\` | Tip Rate Bonus: \`+${weather.tipBonusPct}%\`\n` +
        `• Hot Flavors: ${weather.boostedFlavors.map(f => `\`${f}\``).join(', ')}\n\n`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(weatherReport));

    await interaction.reply({
      components: [container],
      files: files,
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};
