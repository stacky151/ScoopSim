const fs = require('fs');
const logPath = "C:\\Users\\selis\\.gemini\\antigravity\\brain\\2b7c9ec4-89fe-46fd-857a-47cd94c88aab\\.system_generated\\logs\\transcript.jsonl";
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  if (line.includes('canvasRenderer.ts') && line.includes('write_to_file')) {
    try {
      const obj = JSON.parse(line);
      console.log(`LINE ${i} | STEP ${obj.step_index}`);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'write_to_file' || tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
            console.log("TOOL CALL ARGS:", JSON.stringify(tc.args).substring(0, 500));
          }
        }
      }
    } catch (e) {
    }
  }
}
