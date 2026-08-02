import fs from 'fs';
import path from 'path';

const searchDir = path.join(__dirname, '../src');

function walk(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, fileList);
    } else if (filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk(searchDir);
const terms = ['.cones', 'maxCones', '.pots', 'maxPots'];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const term of terms) {
      if (line.includes(term)) {
        console.log(`${path.relative(searchDir, file)}:L${idx + 1}: ${line.trim()}`);
      }
    }
  });
}
