import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';

export const PERK_TYPES: Record<string, { name: string; emoji: string; desc: string; baseCost: number }> = {
  global_mult: {
    name: 'Franchise Multiplier',
    emoji: '📈',
    desc: '+5% global cash sales multiplier per level across all members.',
    baseCost: 5000,
  },
  clean_rate: {
    name: 'Sanitation Service',
    emoji: '🧹',
    desc: '-10% stand dirt accumulation rate per level for all members.',
    baseCost: 3000,
  },
  event_bonus: {
    name: 'Event Sponsorship',
    emoji: '🎪',
    desc: '+15% catering contract payouts per level for all members.',
    baseCost: 8000,
  },
};

export async function createGuild(ownerId: string, name: string, tag: string) {
  const creationCost = 10000;

  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    include: { guildMember: true },
  });

  if (!user) throw new Error('User not found.');
  if (user.money < creationCost) throw new Error(`You need **$${creationCost.toLocaleString()}** cash to establish a Franchise Guild.`);
  if (user.guildMember) throw new Error('You are already a member of a Franchise Guild! Leave your current guild first.');

  const cleanTag = tag.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  if (cleanTag.length < 2) throw new Error('Guild tag must be 2-4 alphanumeric characters.');

  return await safeTransaction(async () => {
    await prisma.user.update({
      where: { id: ownerId },
      data: { money: { decrement: creationCost } },
    });

    const guild = await prisma.guild.create({
      data: {
        name,
        tag: cleanTag,
        ownerId,
        level: 1,
        vaultBalance: 0,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
            contributedCash: 0,
          },
        },
        perks: {
          create: [
            { type: 'global_mult', level: 1 },
            { type: 'clean_rate', level: 1 },
            { type: 'event_bonus', level: 1 },
          ],
        },
      },
      include: {
        members: true,
        perks: true,
      },
    });

    return guild;
  });
}

export async function depositToVault(userId: string, amount: number) {
  if (amount <= 0) throw new Error('Deposit amount must be greater than 0.');

  const member = await prisma.guildMember.findUnique({
    where: { userId },
    include: { user: true, guild: true },
  });

  if (!member) throw new Error('You are not currently in a Franchise Guild.');
  if (member.user.money < amount) throw new Error(`You do not have **$${amount.toLocaleString()}** in your wallet.`);

  return await safeTransaction(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { money: { decrement: amount } },
    });

    const updatedMember = await prisma.guildMember.update({
      where: { userId },
      data: { contributedCash: { increment: amount } },
    });

    const xpGained = Math.floor(amount / 100);
    const updatedGuild = await prisma.guild.update({
      where: { id: member.guildId },
      data: {
        vaultBalance: { increment: amount },
        xp: { increment: xpGained },
      },
    });

    const newLevel = Math.floor(updatedGuild.xp / 1000) + 1;
    if (newLevel > updatedGuild.level) {
      await prisma.guild.update({
        where: { id: member.guildId },
        data: { level: newLevel },
      });
    }

    return { updatedGuild, updatedMember };
  });
}

export async function upgradePerk(userId: string, perkType: string) {
  const perkDef = PERK_TYPES[perkType];
  if (!perkDef) throw new Error('Invalid perk type.');

  const member = await prisma.guildMember.findUnique({
    where: { userId },
    include: { guild: { include: { perks: true } } },
  });

  if (!member) throw new Error('You are not in a Franchise Guild.');
  if (member.role !== 'OWNER' && member.role !== 'OFFICER') {
    throw new Error('Only Guild Owners and Officers can purchase perk upgrades.');
  }

  const currentPerk = member.guild.perks.find(p => p.type === perkType);
  const currentLevel = currentPerk ? currentPerk.level : 1;
  const upgradeCost = perkDef.baseCost * currentLevel;

  if (member.guild.vaultBalance < upgradeCost) {
    throw new Error(`Guild Vault needs **$${upgradeCost.toLocaleString()}** (Current: **$${member.guild.vaultBalance.toLocaleString()}**).`);
  }

  return await safeTransaction(async () => {
    await prisma.guild.update({
      where: { id: member.guildId },
      data: { vaultBalance: { decrement: upgradeCost } },
    });

    await prisma.guildPerk.upsert({
      where: {
        guildId_type: {
          guildId: member.guildId,
          type: perkType,
        },
      },
      create: {
        guildId: member.guildId,
        type: perkType,
        level: 2,
      },
      update: {
        level: { increment: 1 },
      },
    });

    return upgradeCost;
  });
}
