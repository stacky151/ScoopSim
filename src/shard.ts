import { ShardingManager } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!process.env.DISCORD_TOKEN) {
  console.error('[ShardingManager] Error: DISCORD_TOKEN is not defined in .env');
  process.exit(1);
}

const manager = new ShardingManager(path.join(__dirname, 'index.ts'), {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto',
  execArgv: ['--import', 'tsx'],
});

manager.on('shardCreate', (shard) => {
  console.log(`[ShardingManager] Launched Shard #${shard.id}`);
});

console.log('[ShardingManager] Spawning client shards...');
manager.spawn().catch((err) => {
  console.error('[ShardingManager] Failed to spawn shards:', err);
});
