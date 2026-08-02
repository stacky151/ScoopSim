import { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from '../utils/dbTransaction';
import { COUNTRIES_CONFIG } from '../utils/simulationEngine';
import { e } from '../constants/emojis';

export default {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Start your Ice Cream Empire!'),
  async execute(interaction: CommandInteraction) {
    const userId = interaction.user.id;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { stands: true }
    });

    if (existingUser && existingUser.stands.length > 0) {
      const container = new ContainerBuilder().setAccentColor(0x3B82F6);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${e('globe')} World Map Hub\n` +
          `You have established active ice cream stands. Click a country below to manage operations or view details:`
        )
      );

      const row1 = new ActionRowBuilder<ButtonBuilder>();
      const row2 = new ActionRowBuilder<ButtonBuilder>();

      let addedToRow1 = 0;
      let addedToRow2 = 0;

      for (const country of Object.values(COUNTRIES_CONFIG)) {
        const hasStand = existingUser.stands.some(s => s.country === country.name);
        const emojiName = `flag_${country.name.toLowerCase().replace(' ', '_')}`;
        const label = `${country.name}`;
        const isSouthAfrica = country.name === 'South Africa';
        const isUnlocked = isSouthAfrica ? (existingUser.rebirths >= 9 || existingUser.stands.length >= 9) : true;

        if (isUnlocked) {
          const button = new ButtonBuilder()
            .setCustomId(`openstand:country:${country.name}`)
            .setLabel(label)
            .setEmoji(e(emojiName as any) as any)
            .setStyle(hasStand ? ButtonStyle.Success : ButtonStyle.Primary);

          if (addedToRow1 < 5) {
            row1.addComponents(button);
            addedToRow1++;
          } else if (addedToRow2 < 5) {
            row2.addComponents(button);
            addedToRow2++;
          }
        }
      }

      const components: any[] = [];
      if (addedToRow1 > 0) components.push(row1);
      if (addedToRow2 > 0) components.push(row2);

      const latestChangelog = await prisma.changelog.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (latestChangelog && existingUser.lastReadChangelogId !== latestChangelog.id) {
        const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`openstand:changelog`)
            .setLabel(`New Update: ${latestChangelog.title}`)
            .setEmoji(e('popper') as any)
            .setStyle(ButtonStyle.Danger)
        );
        components.push(row3);
      } else {
        const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`openstand:changelog`)
            .setLabel('Changelog Archives')
            .setEmoji(e('clipboard') as any)
            .setStyle(ButtonStyle.Secondary)
        );
        components.push(row3);
      }

      if (addedToRow1 === 0 && addedToRow2 === 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`\n${e('popper')} **Congratulations!** You have established ice cream stands in all 15 countries!`)
        );
      }

      return interaction.reply({
        components,
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      });
    }

    if (!existingUser) {
      await safeTransaction(async () => {
        await prisma.user.create({
          data: {
            id: userId,
            money: 100,
          }
        });
      });
    }

    const container = new ContainerBuilder().setAccentColor(0xFFA07A);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${e('scoop')} Welcome to ScoopSim! ${e('scoop')}\n` +
        `You are about to start your very own Ice Cream Stand empire!\n\n` +
        `To begin, you must select your starting country. USA is unlocked by default:\n\n` +
        `${e('flag_usa')} **USA**: Loves *Vanilla* (1.5x favorite price multiplier)\n\n` +
        `-# Click below to establish your first stand!`
      )
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('map:select:USA')
        .setLabel('USA')
        .setEmoji(e('globe'))
        .setStyle(ButtonStyle.Primary)
    );

    container.addActionRowComponents(row);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
};
