import { ButtonInteraction, ContainerBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { e } from '../constants/emojis';
import { buyTruck, dispatchTruck, claimContractReward } from './cateringEngine';
import { buildCateringViewMessage } from '../commands/catering';

export async function handleCateringButton(interaction: ButtonInteraction, parts: string[]) {
  const action = parts[1];
  const userId = interaction.user.id;

  try {
    if (action === 'buy_truck') {
      const targetUserId = parts[2];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your menu.');
      await buyTruck(userId);
    } else if (action === 'claim') {
      const truckId = parts[2] || '';
      const targetUserId = parts[3];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your truck.');
      const { reward } = await claimContractReward(userId, truckId);

      const successContainer = new ContainerBuilder().setAccentColor(0x48BB78);
      successContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`🎉 Catering Contract Completed! Collected **+$${reward.toLocaleString()}** cash.`)
      );
      await interaction.followUp({
        components: [successContainer],
        flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
      });
    } else if (action === 'dispatch') {
      const contractId = parts[2] || '';
      const truckId = parts[3] || '';
      const targetUserId = parts[4];
      if (targetUserId && userId !== targetUserId) throw new Error('Not your truck.');
      await dispatchTruck(userId, truckId, contractId);
    }

    await interaction.deferUpdate();
    const payload = await buildCateringViewMessage(userId);
    await interaction.editReply({
      components: payload.components,
      files: payload.files,
    });
  } catch (error: any) {
    const container = new ContainerBuilder().setAccentColor(0xED4245);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${e('cross_red')} ${error.message || 'Catering interaction error.'}`)
    );
    await interaction.followUp({
      components: [container],
      flags: (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) as any,
    });
  }
}
