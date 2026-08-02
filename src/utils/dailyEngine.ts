import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';

export async function claimDailyReward(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found.');

  const now = new Date();
  if (user.lastDaily) {
    const diffMs = now.getTime() - user.lastDaily.getTime();
    if (diffMs < 72000000) {
      const nextAvailable = new Date(user.lastDaily.getTime() + 72000000);
      const remainingMins = Math.ceil((nextAvailable.getTime() - now.getTime()) / 60000);
      const hours = Math.floor(remainingMins / 60);
      const mins = remainingMins % 60;
      throw new Error(`Daily reward already claimed! Come back in **${hours}h ${mins}m**.`);
    }
  }

  let newStreak = 1;
  if (user.lastDaily) {
    const diffMs = now.getTime() - user.lastDaily.getTime();
    if (diffMs <= 129600000) {
      newStreak = user.dailyStreak + 1;
    } else {
      newStreak = 1;
    }
  }

  const baseReward = 500;
  const streakBonus = (newStreak - 1) * 250;
  const totalCash = Math.min(10000, baseReward + streakBonus);

  const isMilestone = newStreak % 7 === 0;
  const bonusTokens = isMilestone ? 5 : 0;

  return await safeTransaction(async () => {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        money: { increment: totalCash },
        prestigeTokens: { increment: bonusTokens },
        dailyStreak: newStreak,
        lastDaily: now,
      },
    });

    return {
      totalCash,
      bonusTokens,
      newStreak,
      user: updatedUser,
    };
  });
}

export async function spinFortuneWheel(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found.');

  const now = new Date();
  if (user.lastWheelSpin) {
    const diffMs = now.getTime() - user.lastWheelSpin.getTime();
    if (diffMs < 72000000) {
      const nextAvailable = new Date(user.lastWheelSpin.getTime() + 72000000);
      const remainingMins = Math.ceil((nextAvailable.getTime() - now.getTime()) / 60000);
      const hours = Math.floor(remainingMins / 60);
      const mins = remainingMins % 60;
      throw new Error(`Fortune Wheel already spun today! Ready again in **${hours}h ${mins}m**.`);
    }
  }

  const rand = Math.random();
  let prizeLabel = '';
  let prizeEmoji = '';
  let rewardCash = 0;
  let rewardTokens = 0;
  let rewardExp = 0;

  if (rand < 0.30) {
    prizeLabel = '$1,000 Cash';
    prizeEmoji = '💵';
    rewardCash = 1000;
  } else if (rand < 0.45) {
    prizeLabel = '$5,000 Cash Jackpot!';
    prizeEmoji = '💰';
    rewardCash = 5000;
  } else if (rand < 0.65) {
    prizeLabel = '3 Prestige Tokens';
    prizeEmoji = '💎';
    rewardTokens = 3;
  } else if (rand < 0.70) {
    prizeLabel = '10 Prestige Tokens Mega Jackpot!';
    prizeEmoji = '🌟';
    rewardTokens = 10;
  } else {
    prizeLabel = '500 Empire EXP';
    prizeEmoji = '⭐';
    rewardExp = 500;
  }

  return await safeTransaction(async () => {
    let newLevel = user.level;
    let newExp = user.exp + rewardExp;
    while (newExp >= newLevel * 100) {
      newExp -= newLevel * 100;
      newLevel++;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        money: { increment: rewardCash },
        prestigeTokens: { increment: rewardTokens },
        exp: newExp,
        level: newLevel,
        lastWheelSpin: now,
      },
    });

    return {
      prizeLabel,
      prizeEmoji,
      rewardCash,
      rewardTokens,
      rewardExp,
      user: updatedUser,
    };
  });
}
