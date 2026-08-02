export interface JukeboxStation {
  key: string;
  name: string;
  emoji: string;
  genre: string;
  desc: string;
  buffLabel: string;
  speedMult: number;
  cleanDecMult: number;
  tipMult: number;
  criticMult: number;
}

export const JUKEBOX_STATIONS: Record<string, JukeboxStation> = {
  synthwave: {
    key: 'synthwave',
    name: '80s Retro Synthwave',
    emoji: '📻',
    genre: 'Synthwave / Outrun',
    desc: 'High-energy retro beats keep foot traffic moving fast!',
    buffLabel: '+10% Sales Speed',
    speedMult: 0.90,
    cleanDecMult: 1.0,
    tipMult: 1.0,
    criticMult: 1.0,
  },
  lofi: {
    key: 'lofi',
    name: 'Lofi Chill Beats',
    emoji: '☕',
    genre: 'Lofi Hip-Hop',
    desc: 'Relaxing ambient beats reduce customer mess and stand degradation.',
    buffLabel: '-15% Dirt Accumulation Rate',
    speedMult: 1.0,
    cleanDecMult: 0.85,
    tipMult: 1.0,
    criticMult: 1.0,
  },
  tropical: {
    key: 'tropical',
    name: 'Tropical Beach Vibes',
    emoji: '🏖️',
    genre: 'Tropical Reggae / Salsa',
    desc: 'Sunny vacation rhythms put customers in a generous tipping mood!',
    buffLabel: '+20% Tip Payouts',
    speedMult: 1.0,
    cleanDecMult: 1.0,
    tipMult: 1.20,
    criticMult: 1.0,
  },
  jazz: {
    key: 'jazz',
    name: 'Jazz Cafe Lounge',
    emoji: '🎷',
    genre: 'Smooth Jazz',
    desc: 'Sophisticated cafe tunes attract high-paying VIP Food Critics.',
    buffLabel: '+15% VIP Critic Visit Chance',
    speedMult: 1.0,
    cleanDecMult: 1.0,
    tipMult: 1.0,
    criticMult: 1.15,
  },
};

const activeUserStations = new Map<string, string>();

export function getJukeboxStation(userId: string): JukeboxStation {
  const key = activeUserStations.get(userId) || 'synthwave';
  return (JUKEBOX_STATIONS[key] || JUKEBOX_STATIONS.synthwave)!;
}

export function setJukeboxStation(userId: string, stationKey: string): JukeboxStation {
  if (JUKEBOX_STATIONS[stationKey]) {
    activeUserStations.set(userId, stationKey);
    return JUKEBOX_STATIONS[stationKey];
  }
  return getJukeboxStation(userId);
}
