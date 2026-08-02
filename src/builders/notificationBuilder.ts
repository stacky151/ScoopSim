import { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { e } from '../constants/emojis';

export function buildNotificationMessage(standName: string, reason: string, standId?: string, shopItems?: any[], userMoney: number = 0) {
  const container = new ContainerBuilder().setAccentColor(0xED4245);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${e('warning')} Ice Cream Stand Alert\n` +
      `Your stand **"${standName}"** is out of service!\n\n` +
      `**Reason:** ${reason}\n\n` +
      `*Sales are paused until you refill or clean your stand.*`
    )
  );

  if (standId && shopItems && shopItems.length > 0) {
    const buyRow = new ActionRowBuilder<ButtonBuilder>();
    for (const item of shopItems) {
      const shortName = item.name.replace(' Flavor Refill', '').replace(' Gelato Refill', '').replace('Box of ', '');
      buyRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`stand:fast_buy:${standId}:${item.id}`)
          .setLabel(`Buy & Refill ${shortName} ($${item.price})`)
          .setStyle(userMoney >= item.price ? ButtonStyle.Success : ButtonStyle.Secondary)
      );
    }
    container.addActionRowComponents(buyRow);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('settings:disable_notify')
      .setLabel('Disable Notifications')
      .setEmoji(e('stop'))
      .setStyle(ButtonStyle.Danger)
  );
  container.addActionRowComponents(row);

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any
  };
}
