import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('No DISCORD_TOKEN found in environment!');
  process.exit(1);
}

const firstPart = token.split('.')[0];
if (!firstPart) {
  console.error('Invalid token format!');
  process.exit(1);
}
const clientId = Buffer.from(firstPart, 'base64').toString('ascii');
console.log(`Decoded Client ID: ${clientId}`);

const rest = new REST().setToken(token);

async function clean() {
  try {
    console.log('Purging all global commands...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );
    console.log('Successfully purged all global commands!');

    const targetGuildId = "1382063667981320363";
    console.log(`Purging all guild commands from ${targetGuildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, targetGuildId),
      { body: [] }
    );
    console.log(`Successfully purged guild commands in ${targetGuildId}!`);

  } catch (error) {
    console.error('Failed to clean commands:', error);
  }
}

clean();
