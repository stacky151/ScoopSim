const fs = require('fs');
const logPath = "C:\\Users\\selis\\.gemini\\antigravity\\brain\\2b7c9ec4-89fe-46fd-857a-47cd94c88aab\\.system_generated\\logs\\transcript.jsonl";
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      const lower = obj.content.toLowerCase();
      if (lower.includes('clean') || lower.includes('canvas') || lower.includes('draw') || lower.includes('image')) {
        console.log(`Step ${obj.step_index}: ${obj.content.substring(0, 400)}...`);
      }
    }
  } catch (e) {}
}
