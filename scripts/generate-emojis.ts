import 'dotenv/config';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { EMOJI_DEFINITIONS } from '../src/constants/emojis';

const API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';
const API_KEY = process.env.PIXELLAB_API_KEY || '21305997-2625-4bd8-8eeb-6135e8568f31';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Auto-extract Client ID from Discord Bot Token if not present in env
let CLIENT_ID = process.env.CLIENT_ID;
if (!CLIENT_ID && DISCORD_TOKEN) {
  const tokenParts = DISCORD_TOKEN.split('.');
  if (tokenParts[0]) {
    try {
      CLIENT_ID = Buffer.from(tokenParts[0], 'base64').toString('utf-8');
      console.log(`[Discord] Decoded Client ID from token: ${CLIENT_ID}`);
    } catch (e) {
      console.error('[-] Failed to decode Client ID from token:', e);
    }
  }
}

async function generateEmoji(name: string, prompt: string): Promise<string | null> {
  console.log(`[PixelLab] Generating image for: ${name} (Prompt: "${prompt}")`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: prompt,
        image_size: { width: 128, height: 128 },
        no_background: true,
        text_guidance_scale: 8,
      }),
    });

    if (!response.ok) {
      console.error(`[-] PixelLab failed for ${name}: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(text);
      return null;
    }

    const data: any = await response.json();
    const base64 = data.image?.base64 || data.image || data.base64 || data.data;
    if (!base64) {
      console.error(`[-] Could not find base64 image in PixelLab response for ${name}:`, data);
      return null;
    }
    return base64;
  } catch (err) {
    console.error(`[-] PixelLab error for ${name}:`, err);
    return null;
  }
}

async function run() {
  if (!API_KEY) {
    console.error('[-] PIXELLAB_API_KEY is missing.');
    return;
  }
  if (!CLIENT_ID || !DISCORD_TOKEN) {
    console.error('[-] Discord credentials (CLIENT_ID / DISCORD_TOKEN) missing.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const emojiIds: Record<string, string> = {};

  const assetsDir = path.join(__dirname, '..', 'assets', 'emojis');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Fetch existing application emojis to avoid duplicates
  const existingEmojiMap: Record<string, string> = {};
  try {
    console.log('[Discord] Fetching existing application emojis...');
    const existing = await rest.get(Routes.applicationEmojis(CLIENT_ID)) as any;
    const items = Array.isArray(existing) ? existing : (existing && Array.isArray(existing.items) ? existing.items : []);
    if (items.length > 0) {
      for (const emoji of items) {
        if (emoji.name && emoji.id) {
          existingEmojiMap[emoji.name] = emoji.id;
        }
      }
      console.log(`[Discord] Found ${items.length} existing emojis.`);
    }
  } catch (err) {
    console.warn('[Discord] Warning: could not fetch existing emojis, proceeding with normal generation/upload:', err);
  }

  console.log(`[+] Starting generation for ${Object.keys(EMOJI_DEFINITIONS).length} emojis...`);

  for (const [key, def] of Object.entries(EMOJI_DEFINITIONS)) {
    // Check if this emoji already exists on Discord
    if (existingEmojiMap[def.name]) {
      const existingId = existingEmojiMap[def.name] as string;
      emojiIds[key] = existingId;
      console.log(`[Discord] Emoji ${def.name} already exists. Skipping upload. ID: ${existingId}`);
      continue;
    }

    let base64: string | null = null;
    const localFilePath = path.join(assetsDir, `${def.name}.png`);

    if (fs.existsSync(localFilePath)) {
      console.log(`[Local] Found existing image for ${def.name}, reading from disk...`);
      base64 = fs.readFileSync(localFilePath).toString('base64');
    } else {
      // 2-second rate-limit spacing to avoid spamming the PixelLab API
      await new Promise(resolve => setTimeout(resolve, 2000));
      base64 = await generateEmoji(def.name, def.prompt);
      if (base64) {
        const buffer = Buffer.from(base64, 'base64');
        fs.writeFileSync(localFilePath, buffer);
      }
    }

    if (!base64) continue;

    console.log(`[Discord] Uploading emoji: ${def.name}`);
    try {
      const dataUri = `data:image/png;base64,${base64}`;
      const response: any = await rest.post(
        Routes.applicationEmojis(CLIENT_ID),
        {
          body: {
            name: def.name,
            image: dataUri,
          },
        }
      );

      if (response && response.id) {
        emojiIds[key] = response.id;
        console.log(`[+] Emoji ${def.name} uploaded successfully. ID: ${response.id}`);
      }
    } catch (err) {
      console.error(`[-] Failed to upload emoji ${def.name} to Discord:`, err);
    }
  }

  const emojisFilePath = path.join(__dirname, '..', 'src', 'constants', 'emojis.ts');
  if (fs.existsSync(emojisFilePath) && Object.keys(emojiIds).length > 0) {
    let content = fs.readFileSync(emojisFilePath, 'utf-8');
    const replacementStr = `export const EMOJI_IDS: Record<string, string> = ${JSON.stringify(emojiIds, null, 2)};`;
    
    content = content.replace(
      /export const EMOJI_IDS: Record<string, string> = \{[\s\S]*?\};/,
      replacementStr
    );

    fs.writeFileSync(emojisFilePath, content);
    console.log('[+] Emojis registry updated in src/constants/emojis.ts.');
  } else {
    console.log('[-] Emojis constants file not found or no emojis uploaded.');
  }
}

run();
