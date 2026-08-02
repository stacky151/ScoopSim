const fs = require('fs');
const path = require('path');

// Load emoji definitions keys
const emojisFile = fs.readFileSync('src/constants/emojis.ts', 'utf-8');
const defsMatch = emojisFile.match(/export const EMOJI_DEFINITIONS: Record<string, EmojiEntry> = {([\s\S]*?)};/);
if (!defsMatch) {
  console.error('Could not find EMOJI_DEFINITIONS in src/constants/emojis.ts');
  process.exit(1);
}

const keys = new Set();
const keyRegex = /^\s*([a-zA-Z0-9_]+)\s*:/gm;
let m;
while ((m = keyRegex.exec(defsMatch[1])) !== null) {
  keys.add(m[1]);
}

console.log(`[Audit] Loaded ${keys.size} keys from EMOJI_DEFINITIONS.`);

// Scan all files in src
const scanDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Look for e('key') or e("key")
      const eRegex = /\be\(['"]([a-zA-Z0-9_]+)['"]\)/g;
      let match;
      while ((match = eRegex.exec(content)) !== null) {
        const key = match[1];
        if (!keys.has(key)) {
          console.warn(`[!] File ${fullPath} references missing emoji key: e('${key}')`);
        }
      }
    }
  }
};

scanDir('src');
console.log('[Audit] Scanning complete.');
