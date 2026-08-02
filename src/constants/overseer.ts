export const OWNER_USER_ID = '711620148053803069';

export function isOwner(userId: string): boolean {
  return userId === OWNER_USER_ID;
}

export function isOverseer(userId: string): boolean {
  return isOwner(userId);
}

export function getOwnerFooter(userId: string): string {
  if (isOwner(userId)) {
    return `\n\n-# ⚡ Developer Access Active (ID: ${userId})`;
  }
  return '';
}

export function getOverseerFooter(userId: string): string {
  return getOwnerFooter(userId);
}
