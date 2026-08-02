import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { loadCommands } from './handlers/commandHandler';
import { loadEvents } from './handlers/eventHandler';

dotenv.config();

export const prisma = new PrismaClient();

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

async function bootstrap() {
  try {
    console.log('Starting ScoopShack Bot...');
    await prisma.$connect();
    console.log('Database connected successfully via Prisma.');

    await loadCommands(client);
    await loadEvents(client);

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Fatal Initialization Error:', error);
    process.exit(1);
  }
}

bootstrap();

process.on('unhandledRejection', (reason: any) => {
  console.error('🛡️ [Anti-Crash Guard] Unhandled Rejection:', reason?.stack || reason?.message || reason);
});

process.on('uncaughtException', (err: Error, origin: string) => {
  console.error(`🛡️ [Anti-Crash Guard] Uncaught Exception (${origin}):`, err.stack || err.message);
});

process.on('uncaughtExceptionMonitor', (err: Error, origin: string) => {
  console.error(`🛡️ [Anti-Crash Monitor] Exception Detected (${origin}):`, err.stack || err.message);
});

process.on('warning', (warning: Error) => {
  if (warning.name === 'DeprecationWarning') return;
  console.warn('🛡️ [Anti-Crash Monitor] Process Warning:', warning.name, warning.message);
});
