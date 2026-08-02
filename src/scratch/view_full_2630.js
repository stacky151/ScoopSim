const fs = require('fs');

const logPath = "C:\\Users\\selis\\.gemini\\antigravity\\brain\\2b7c9ec4-89fe-46fd-857a-47cd94c88aab\\.system_generated\\logs\\transcript_full.jsonl";
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 2630) {
      console.log(obj.tool_calls[0].args.CodeContent);
    }
  } catch (e) {}
}
