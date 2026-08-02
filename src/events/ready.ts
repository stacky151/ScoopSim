import { Client, Events, REST, Routes } from 'discord.js';
import { initCronJobs } from '../utils/cronJobs';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`Ready! Logged in as ${client.user?.tag}`);
    initCronJobs(client);

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
    try {
      const allCommands = client.commands.map(cmd => cmd.data.toJSON());

      console.log(`🌐 Registering ${allCommands.length} global slash commands...`);
      await rest.put(
        Routes.applicationCommands(client.user!.id),
        { body: allCommands }
      );

      const mainGuildId = '763123509417214022';
      const devGuildId = process.env.GUILD_ID;
      const devGuildIdsStr = process.env.GUILD_IDS;
      const guildsToClean = new Set<string>([mainGuildId]);
      if (devGuildId) guildsToClean.add(devGuildId);
      if (devGuildIdsStr) {
        devGuildIdsStr.split(',').map(id => id.trim()).filter(Boolean).forEach(id => guildsToClean.add(id));
      }

      for (const guildId of guildsToClean) {
        await rest.put(
          Routes.applicationGuildCommands(client.user!.id, guildId),
          { body: [] }
        ).catch(() => {});
      }

      console.log('✅ Slash commands cleanly registered globally with zero guild duplicates.');
    } catch (error) {
      console.error('Failed to register commands:', error);
    }
  },
};
