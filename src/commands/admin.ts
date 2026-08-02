import { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from '../utils/dbTransaction';
import { e } from '../constants/emojis';
import { standEventEffects } from '../utils/simulationEngine';
import { forceCountryWeather, WeatherType } from '../utils/weatherEngine';

const ADMIN_USER_ID = '711620148053803069';

export default {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Developer administration commands.')
    .addSubcommand(sub =>
      sub
        .setName('cash')
        .setDescription('Modify a user\'s cash balance.')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Choose add or set')
            .setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'set', value: 'set' }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('Cash amount')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Target user')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('prestige')
        .setDescription('Modify a user\'s prestige tokens.')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Choose add or set')
            .setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'set', value: 'set' }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('Token amount')
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('Target user')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('event')
        .setDescription('Spawn a dynamic random event on a stand.')
        .addStringOption(opt =>
          opt
            .setName('event_type')
            .setDescription('Choose event type')
            .setRequired(true)
            .addChoices(
              { name: 'VIP Food Critic', value: 'critic' },
              { name: 'Health Inspector Audit', value: 'inspector' },
              { name: 'Ice Cream Festival', value: 'festival' },
              { name: 'Gourmet Rumors', value: 'rumor' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('stand_id')
            .setDescription('Stand UUID')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('forceweather')
        .setDescription('Force weather in a specific country.')
        .addStringOption(opt =>
          opt
            .setName('weather_type')
            .setDescription('Weather type')
            .setRequired(true)
            .addChoices(
              { name: 'Sunny', value: 'sunny' },
              { name: 'Cloudy', value: 'cloudy' },
              { name: 'Rainy', value: 'rainy' },
              { name: 'Heatwave', value: 'heatwave' },
              { name: 'Typhoon', value: 'typhoon' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('country')
            .setDescription('Country name')
            .setRequired(true)
            .addChoices(
              { name: 'USA', value: 'USA' },
              { name: 'Italy', value: 'Italy' },
              { name: 'Japan', value: 'Japan' },
              { name: 'Brazil', value: 'Brazil' },
              { name: 'Egypt', value: 'Egypt' },
              { name: 'France', value: 'France' },
              { name: 'Australia', value: 'Australia' },
              { name: 'Belgium', value: 'Belgium' },
              { name: 'Iceland', value: 'Iceland' },
              { name: 'South Africa', value: 'South Africa' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('level')
        .setDescription('Set or add levels to a user.')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('add or set')
            .setRequired(true)
            .addChoices(
              { name: 'add', value: 'add' },
              { name: 'set', value: 'set' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Level amount').setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Wipe a player\'s entire empire and reset to starter state.')
        .addUserOption(opt =>
          opt.setName('user').setDescription('Target user').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('hub')
        .setDescription('Open the interactive Admin Hub Command Center.')
    )
    .addSubcommand(sub =>
      sub
        .setName('setupdiscord')
        .setDescription('Auto-build categories, channels, roles, and pin official banners in official Discord hub.')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const allowedGuilds = ['763123509417214022'];
    if (process.env.GUILD_ID) allowedGuilds.push(process.env.GUILD_ID);
    if (process.env.GUILD_IDS) {
      const devGuilds = process.env.GUILD_IDS.split(',').map(id => id.trim()).filter(Boolean);
      allowedGuilds.push(...devGuilds);
    }

    if (!allowedGuilds.includes(interaction.guildId || '') || interaction.user.id !== ADMIN_USER_ID) {
      return interaction.reply({
        content: `${e('cross_red')} Restricted: Developer permissions in the home guild required.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'setupdiscord') {
        if (!interaction.guild) {
          return interaction.reply({ content: 'This command can only be executed in a guild server.', flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { setupOfficialDiscordServer } = require('../scripts/setupDiscordServer');
        const result = await setupOfficialDiscordServer(interaction.guild);

        const container = new ContainerBuilder().setAccentColor(0x48BB78);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# 🎨 AUTOMATED DISCORD SERVER SETUP COMPLETE!\n` +
            `**Successfully designed and configured official Discord Hub!**\n\n` +
            `\`\`\`\n` +
            result.log.join('\n') +
            `\n\`\`\``
          )
        );

        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2 as any
        });
      }

      if (subcommand === 'hub') {
        const { buildAdminHubMessage } = require('../builders/adminHubBuilder');
        const payload = await buildAdminHubMessage(interaction.client, interaction.user.id, 'overview');
        return interaction.reply({
          components: payload.components,
          flags: (payload.flags | MessageFlags.Ephemeral) as any
        });
      }

      if (subcommand === 'cash') {
        const action = interaction.options.getString('action', true);
        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user', true);

        const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
        if (!dbUser) {
          return interaction.reply({ content: `${e('cross_red')} User not found in database.`, flags: MessageFlags.Ephemeral });
        }

        const newCash = action === 'add' ? dbUser.money + amount : amount;
        await safeTransaction(async () => {
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { money: newCash }
          });
        });

        return interaction.reply({
          content: `${e('check_green')} Cash successfully updated for <@${targetUser.id}>. New balance: **$${newCash.toLocaleString()}**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (subcommand === 'prestige') {
        const action = interaction.options.getString('action', true);
        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user', true);

        const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
        if (!dbUser) {
          return interaction.reply({ content: `${e('cross_red')} User not found in database.`, flags: MessageFlags.Ephemeral });
        }

        const newTokens = action === 'add' ? dbUser.prestigeTokens + amount : amount;
        await safeTransaction(async () => {
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { prestigeTokens: newTokens }
          });
        });

        return interaction.reply({
          content: `${e('check_green')} Prestige tokens updated for <@${targetUser.id}>. New balance: **${newTokens.toLocaleString()}** tokens.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (subcommand === 'event') {
        const eventType = interaction.options.getString('event_type', true);
        const standId = interaction.options.getString('stand_id', true);

        const stand = await prisma.iceCreamStand.findUnique({ where: { id: standId } });
        if (!stand) {
          return interaction.reply({ content: `${e('cross_red')} Stand not found.`, flags: MessageFlags.Ephemeral });
        }

        let effects = standEventEffects.get(standId) || {};
        if (eventType === 'critic') {
          effects.criticTrafficTicks = 10;
        } else if (eventType === 'inspector') {
          effects.pricePenaltyTicks = 0;
        } else if (eventType === 'festival') {
          effects.festivalTicks = 10;
        } else if (eventType === 'rumor') {
          const batches = await prisma.iceCreamBatch.findMany({ where: { standId } });
          const flavor = batches[0]?.flavor || 'vanilla';
          effects.rumorFlavor = flavor;
          effects.rumorTicks = 10;
        }
        standEventEffects.set(standId, effects);

        return interaction.reply({
          content: `${e('check_green')} Event **${eventType.toUpperCase()}** forced on stand **${stand.name}** (${standId}).`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (subcommand === 'forceweather') {
        const weatherType = interaction.options.getString('weather_type', true) as WeatherType;
        const country = interaction.options.getString('country', true);

        forceCountryWeather(country, weatherType);

        return interaction.reply({
          content: `${e('check_green')} Weather in **${country}** successfully forced to **${weatherType.toUpperCase()}**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (subcommand === 'level') {
        const action = interaction.options.getString('action', true);
        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user', true);

        const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
        if (!dbUser) return interaction.reply({ content: `${e('cross_red')} User not found.`, flags: MessageFlags.Ephemeral });

        const newLevel = action === 'add' ? dbUser.level + amount : amount;
        await safeTransaction(async () => {
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { level: Math.max(1, newLevel), exp: 0 }
          });
        });

        return interaction.reply({
          content: `${e('check_green')} Level updated for <@${targetUser.id}>. New level: **${Math.max(1, newLevel)}**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (subcommand === 'reset') {
        const targetUser = interaction.options.getUser('user', true);

        const dbUser = await prisma.user.findUnique({
          where: { id: targetUser.id },
          include: { stands: { include: { batches: true } } }
        });
        if (!dbUser) return interaction.reply({ content: `${e('cross_red')} User not found.`, flags: MessageFlags.Ephemeral });

        await safeTransaction(async () => {
          await prisma.$transaction(async (tx) => {
            for (const stand of dbUser.stands) {
              await tx.iceCreamBatch.deleteMany({ where: { standId: stand.id } });
            }
            await tx.iceCreamStand.deleteMany({ where: { userId: targetUser.id } });
            await tx.userInventory.deleteMany({ where: { userId: targetUser.id } });
            await tx.worker.deleteMany({ where: { userId: targetUser.id } });
            await tx.userQuest.deleteMany({ where: { userId: targetUser.id } });
            await tx.prestigeUpgrade.deleteMany({ where: { userId: targetUser.id } });
            await tx.userTheme.deleteMany({ where: { userId: targetUser.id } });
            await tx.user.update({
              where: { id: targetUser.id },
              data: {
                money: 100,
                level: 1,
                exp: 0,
                rebirths: 0,
                prestigeTokens: 0,
                equippedTheme: 'default',
              }
            });
          });
        });

        return interaction.reply({
          content: `${e('check_green')} Empire for <@${targetUser.id}> has been fully reset to starter state.`,
          flags: MessageFlags.Ephemeral
        });
      }

    } catch (error) {

      console.error('Error running admin command:', error);
      return interaction.reply({
        content: `${e('cross_red')} An error occurred while running the admin command.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
