import { Client } from 'discord.js';
import { prisma } from '../index';
import { safeTransaction } from './dbTransaction';
import { calculateOfflineEarnings } from './simulationEngine';
import { checkExpiredGiveaways } from './giveawayWinnerEngine';

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

let lastDailyResetDate = new Date().toDateString();
let lastWeeklyResetDate = getWeekNumber(new Date());

export function initCronJobs(client: Client) {
  console.log('Initializing background simulation cron jobs...');

  setInterval(async () => {
    try {
      const now = new Date();

      await checkExpiredGiveaways(client).catch(() => {});

      if (now.toDateString() !== lastDailyResetDate) {
        console.log('[Cron Job] Triggering global daily quest wipe...');
        await safeTransaction(async () => {
          await prisma.userQuest.deleteMany({
            where: { isWeekly: false }
          });
        });
        lastDailyResetDate = now.toDateString();
      }

      const currentWeek = getWeekNumber(now);
      if (currentWeek !== lastWeeklyResetDate && now.getDay() === 1) {
        console.log('[Cron Job] Triggering global weekly quest wipe...');
        await safeTransaction(async () => {
          await prisma.userQuest.deleteMany({
            where: { isWeekly: true }
          });
        });
        lastWeeklyResetDate = currentWeek;
      }

      console.log('Running background simulation checks...');
      const stands = await prisma.iceCreamStand.findMany({
        include: {
          user: {
            include: {
              workers: true
            }
          },
          batches: true
        }
      });

      for (const stand of stands) {
        const result = await calculateOfflineEarnings(stand.id);
        if (!result || !(result as any).stand) continue;

        const updatedStand = (result as any).stand;
        const user = stand.user;

        if (!user.notifyEmpty || stand.notifiedEmpty) continue;

        const isDirty = updatedStand.cleanliness <= 0;
        const hasScoops = updatedStand.batches.some((b: any) => b.scoops > 0);
        const hasContainers = updatedStand.batches.some(
          (b: any) => b.smallCones > 0 || b.largeCones > 0 || b.smallBoxes > 0 || b.largeBoxes > 0
        );

        const hasManager = stand.user.workers.some(w => w.type === 'manager');
        let isExpired = false;
        if (!hasManager && stand.activeUntil) {
          isExpired = new Date().getTime() >= new Date(stand.activeUntil).getTime();
        }

        if (isDirty || !hasScoops || !hasContainers || isExpired) {
          const discordUser = await client.users.fetch(stand.userId).catch(() => null);
          if (discordUser) {
            let reason = '';
            if (isDirty) reason = 'It became too dirty! Clean it to resume sales.';
            else if (!hasScoops) reason = 'You ran out of ice cream scoops. Buy refills in the `/shop`!';
            else if (isExpired) reason = 'Your active session expired! Open it again or hire a Manager to automate 24/7.';
            else reason = 'You ran out of cones or serving cups. Buy refills in the `/shop`!';

            const { buildNotificationMessage } = require('../builders/notificationBuilder');
            const dmPayload = buildNotificationMessage(stand.name, reason);


            await safeTransaction(async () => {
              await prisma.iceCreamStand.update({
                where: { id: stand.id },
                data: { notifiedEmpty: true }
              });
            });
          }
        }
      }
    } catch (error: any) {
      if (error?.code === 'P2021') {
        console.warn('⚠️ [Cron Engine] Database tables not initialized yet. Skipping simulation check until `npx prisma db push` is run.');
      } else {
        console.error('Error running background simulation checks:', error);
      }
    }
  }, 300000);
}
