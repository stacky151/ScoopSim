const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logId = 'a308cba9-87ae-4f3e-a01f-a1accf47ea1e';
  
  const log = await prisma.changelog.findUnique({
    where: { id: logId }
  });

  if (!log) {
    console.error('Changelog entry not found.');
    return;
  }

  // Replace Unicode emojis with their custom Discord tags
  let newDescription = log.description;
  newDescription = newDescription.replace(/🌍/g, '<:sc_globe:1517200328603209832>');
  newDescription = newDescription.replace(/📋/g, '<:sc_clipboard:1517203954339942490>');
  newDescription = newDescription.replace(/📢/g, '<:sc_event_rumor:1517603592998092890>');
  newDescription = newDescription.replace(/⏱️/g, '<:sc_clock:1517211254597488832>');

  await prisma.changelog.update({
    where: { id: logId },
    data: { description: newDescription }
  });

  console.log('Changelog database entry successfully updated with custom emoji tags!');
}

main().catch(err => {
  console.error(err);
});
