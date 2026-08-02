export interface WeatherInfo {
  type: string;
  name: string;
  emoji: string;
  desc: string;
  salesMult: number;
  tipBonusPct: number;
  boostedFlavors: string[];
}

export type WeatherType = 'sunny' | 'heatwave' | 'rainstorm' | 'blizzard' | 'golden_hour';

export const WEATHER_TYPES: Record<string, WeatherInfo> = {
  sunny: {
    type: 'sunny',
    name: 'Sunny & Warm',
    emoji: '☀️',
    desc: 'High demand for refreshing sorbets and fruit flavors! +20% Tip rates.',
    salesMult: 1.25,
    tipBonusPct: 20,
    boostedFlavors: ['lemon', 'pistachio', 'vanilla'],
  },
  heatwave: {
    type: 'heatwave',
    name: 'Blazing Heatwave',
    emoji: '🔥',
    desc: 'Record-breaking heatwave! Massive foot traffic spike across all stands.',
    salesMult: 1.60,
    tipBonusPct: 35,
    boostedFlavors: ['lemon', 'mint', 'strawberry'],
  },
  rainstorm: {
    type: 'rainstorm',
    name: 'Heavy Rainstorm',
    emoji: '🌧️',
    desc: 'Slightly reduced foot traffic, but high demand for rich chocolate & hot fudge.',
    salesMult: 0.85,
    tipBonusPct: 10,
    boostedFlavors: ['chocolate', 'caramel', 'coffee'],
  },
  blizzard: {
    type: 'blizzard',
    name: 'Winter Blizzard',
    emoji: '❄️',
    desc: 'Freezing weather! Only hardcore gelato fans visit, paying 2x for warm gourmet toppings.',
    salesMult: 0.70,
    tipBonusPct: 50,
    boostedFlavors: ['chocolate', 'hazelnut'],
  },
  golden_hour: {
    type: 'golden_hour',
    name: 'Golden Sunset',
    emoji: '🌈',
    desc: 'Perfect weather condition! +50% sales multiplier and increased double-scoop chances.',
    salesMult: 1.50,
    tipBonusPct: 25,
    boostedFlavors: ['vanilla', 'chocolate', 'strawberry', 'pistachio', 'lemon', 'matcha'],
  },
};

export const WEATHER_CONFIGS = WEATHER_TYPES;

const forcedWeatherMap = new Map<string, string>();

export function forceCountryWeather(countryName: string, weatherType: string) {
  forcedWeatherMap.set(countryName, weatherType);
}

const WEATHER_KEYS = Object.keys(WEATHER_TYPES);

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCountryWeather(countryName: string): WeatherInfo {
  if (forcedWeatherMap.has(countryName)) {
    const forced = forcedWeatherMap.get(countryName)!;
    if (WEATHER_TYPES[forced]) return WEATHER_TYPES[forced];
  }

  const currentSlot = Math.floor(Date.now() / 7200000);
  const countryHash = hashString(countryName);
  const index = (currentSlot + countryHash) % WEATHER_KEYS.length;
  const key = WEATHER_KEYS[index];
  return (WEATHER_TYPES[key || 'sunny'] || WEATHER_TYPES.sunny)!;
}

export function getWeatherMultiplier(weather: string | WeatherInfo): number {
  if (typeof weather === 'object' && weather !== null) {
    return weather.salesMult || 1.0;
  }
  const info = WEATHER_TYPES[weather as string];
  return info ? info.salesMult : 1.0;
}
