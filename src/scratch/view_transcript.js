const fs = require('fs');
const path = require('path');

const logPath = "C:\\Users\\selis\\.gemini\\antigravity\\brain\\2b7c9ec4-89fe-46fd-857a-47cd94c88aab\\.system_generated\\logs\\transcript.jsonl";
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

let userInputs = [];
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      userInputs.push(obj);
    }
  } catch (e) {
  }
}

console.log("LAST 6 USER INPUTS:");
const lastInputs = userInputs.slice(-6);
for (const input of lastInputs) {
  console.log("==================================================");
  console.log(`Step: ${input.step_index} | Created At: ${input.created_at}`);
  console.log(input.content);
}
