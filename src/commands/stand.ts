import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { prisma } from '../index';
import { e } from '../constants/emojis';
import { buildStandMessage } from '../builders/standBuilder';
import { startActiveStandLoop } from '../utils/standActiveLoop';

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
};

export default {
  data: new SlashCommandBuilder()
    .setName('stand')
    .setDescription('Quick-open your ice cream stand. Jumps straight to your stand if you only have one.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stands: {
          include: { batches: true }
        },
        workers: true
      }
    });

    if (!user) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('scoop')} You haven't started yet! Run \`/start\` to build your ice cream empire.`
        )
      );
      return interaction.reply({
        components: [errorContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    if (user.stands.length === 0) {
      const errorContainer = new ContainerBuilder().setAccentColor(0xED4245);
      errorContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e('store')} You don't have any stands yet. Run \`/start\` to establish your first one!`
        )
      );
      return interaction.reply({
        components: [errorContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any
      });
    }

    if (user.stands.length === 1) {
      const stand = user.stands[0]!;
      await interaction.deferReply({ ephemeral: false });
      const payload = await buildStandMessage(stand.id);
      const sentMessage = await interaction.editReply(payload as any);
      startActiveStandLoop(stand.id, sentMessage as any);
      return;
    }

    const hasManager = user.workers.some(w => w.type === 'manager');

    const container = new ContainerBuilder().setAccentColor(0x0f172a);

    let text = `# ${e('store')} Select a Stand\n` +
      `You have **${user.stands.length}** stands. Choose which one to open:\n\n`;

    for (const stand of user.stands) {
      let statusIcon = `${e('dot_red')} Closed`;
      if (hasManager) statusIcon = `${e('tie')} Automated`;
      else if (stand.isActive) statusIcon = `${e('dot_green')} Open`;

      const totalScoops = stand.batches.reduce((sum, b) => sum + b.scoops, 0);
      const flagKey = flagMap[stand.country] || 'globe';
      text += `• ${e(flagKey as any)} **${stand.name}** — ${statusIcon} | ${e('scoop')} ${totalScoops} scoops | ${e('money_bag')} $${stand.unclaimedMoney.toLocaleString()} unclaimed\n`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

    const row1 = new ActionRowBuilder<ButtonBuilder>();
    const row2 = new ActionRowBuilder<ButtonBuilder>();

    user.stands.forEach((stand, idx) => {
      const flagKey = flagMap[stand.country] || 'globe';
      const btn = new ButtonBuilder()
        .setCustomId(`stand:select_open:${stand.id}`)
        .setLabel(`${stand.name.substring(0, 20)} (${stand.country})`)
        .setEmoji(e(flagKey as any))
        .setStyle(stand.isActive ? ButtonStyle.Success : ButtonStyle.Primary);

      if (idx < 5) row1.addComponents(btn);
      else if (idx < 10) row2.addComponents(btn);
    });

    const components: any[] = [container];
    if (row1.components.length > 0) {
      const btnContainer = new ContainerBuilder().setAccentColor(0x0f172a);
      btnContainer.addActionRowComponents(row1);
      if (row2.components.length > 0) btnContainer.addActionRowComponents(row2);
      components.push(btnContainer);
    }

    await interaction.reply({
      components,
      flags: MessageFlags.IsComponentsV2 as any
    });
  }
};
