import { Client } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';

export async function loadCommands(client: Client) {
  const commandsPath = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
  }

  const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.resolve(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(filePath));
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        results.push(filePath);
      }
    });
    return results;
  };

  const commandFiles = getFilesRecursively(commandsPath);

  for (const filePath of commandFiles) {
    const command = require(filePath).default || require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}
