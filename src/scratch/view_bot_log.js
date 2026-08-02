const fs = require('fs');
const logPath = "C:\\Users\\selis\\.gemini\\antigravity\\brain\\2b7c9ec4-89fe-46fd-857a-47cd94c88aab\\.system_generated\\tasks\\task-3051.log";
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log("LAST 30 LOG LINES:");
  console.log(lines.slice(-30).join('\n'));
} else {
  console.log("Log file not found at " + logPath);
}
