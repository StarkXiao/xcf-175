import type { Element, StatusEffectType } from '@/types';

export const BATTLE_CONSTANTS = {
  MAX_TEAM_SIZE: 3,
  MAX_SKILLS_PER_ANIMAL: 3,
  MAX_PARTS_PER_ANIMAL: 6,
  BASE_CRIT_RATE: 15,
  BASE_CRIT_DAMAGE: 1.8,
  DEFENSE_FACTOR: 0.5,
  RANDOM_DAMAGE_RANGE: 0.1,
  TURN_DELAY: 800,
  ANIMATION_DELAY: 500,
  MAX_BATTLE_TURNS: 50,
  ELEMENT_ADVANTAGE_MULTIPLIER: 1.5,
  ELEMENT_DISADVANTAGE_MULTIPLIER: 0.75,
  COMBO_DAMAGE_BONUS_PER_HIT: 0.1,
  COMBO_MAX_MULTIPLIER: 2.0,
} as const;

export const ELEMENT_CHART: Record<Element, Element> = {
  fire: 'nature',
  nature: 'thunder',
  thunder: 'ice',
  ice: 'fire',
  dark: 'dark',
};

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: '火',
  ice: '冰',
  thunder: '雷',
  nature: '自然',
  dark: '暗',
};

export const ELEMENT_EMOJIS: Record<Element, string> = {
  fire: '🔥',
  ice: '❄️',
  thunder: '⚡',
  nature: '🌿',
  dark: '🌑',
};

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff4400',
  ice: '#00ccff',
  thunder: '#ffee00',
  nature: '#00ff66',
  dark: '#aa00ff',
};

export const STATUS_EFFECT_CONFIG: Record<StatusEffectType, {
  name: string;
  emoji: string;
  color: string;
  baseDamage: number;
  defaultDuration: number;
  skipTurnChance: number;
  statModifier?: { stat: 'atk' | 'def' | 'spd'; value: number };
}> = {
  poison: {
    name: '中毒',
    emoji: '☠️',
    color: '#00ff66',
    baseDamage: 8,
    defaultDuration: 3,
    skipTurnChance: 0,
  },
  burn: {
    name: '灼烧',
    emoji: '🔥',
    color: '#ff4400',
    baseDamage: 10,
    defaultDuration: 2,
    skipTurnChance: 0,
    statModifier: { stat: 'atk', value: -15 },
  },
  freeze: {
    name: '冰冻',
    emoji: '❄️',
    color: '#00ccff',
    baseDamage: 0,
    defaultDuration: 2,
    skipTurnChance: 40,
    statModifier: { stat: 'spd', value: -30 },
  },
  paralysis: {
    name: '麻痹',
    emoji: '⚡',
    color: '#ffee00',
    baseDamage: 0,
    defaultDuration: 2,
    skipTurnChance: 30,
  },
  bleed: {
    name: '流血',
    emoji: '🩸',
    color: '#ff0044',
    baseDamage: 6,
    defaultDuration: 3,
    skipTurnChance: 0,
    statModifier: { stat: 'def', value: -10 },
  },
};

export const hasElementAdvantage = (attacker: Element, defender: Element): boolean => {
  if (attacker === 'dark' || defender === 'dark') return false;
  return ELEMENT_CHART[attacker] === defender;
};

export const hasElementDisadvantage = (attacker: Element, defender: Element): boolean => {
  if (attacker === 'dark' || defender === 'dark') return false;
  return ELEMENT_CHART[defender] === attacker;
};

export const GACHA_RATES = {
  animal: {
    1: 55,
    2: 30,
    3: 12,
    4: 2.5,
    5: 0.5,
  },
  part: {
    1: 50,
    2: 30,
    3: 15,
    4: 4,
    5: 1,
  },
  skill: {
    1: 50,
    2: 30,
    3: 15,
    4: 4,
    5: 1,
  },
  limited: {
    1: 45,
    2: 30,
    3: 18,
    4: 5.5,
    5: 1.5,
  },
} as const;

export const GACHA_COST = {
  animal: 100,
  animalTen: 900,
  part: 50,
  skill: 80,
  limited: 10,
  limitedTen: 90,
} as const;

export const GACHA_COSTS = GACHA_COST;

export const PITY_CONFIG = {
  hardPityR5: 90,
  hardPityR4: 60,
  softPityR5Start: 75,
  softPityR5Bonus: 6,
  limitedHardPityR5: 80,
  limitedHardPityR4: 50,
  limitedSoftPityR5Start: 65,
  limitedSoftPityR5Bonus: 8,
  featuredR5Rate: 50,
  featuredR4Rate: 50,
} as const;

export const LIMITED_POOL: {
  featuredAnimalTemplateIds: string[];
  featuredPartTemplateIds: string[];
  featuredSkillTemplateIds: string[];
  endsAt: number;
} = {
  featuredAnimalTemplateIds: ['boar_urban', 'snake_alley'],
  featuredPartTemplateIds: ['head_crown', 'body_titanium', 'weapon_plasma'],
  featuredSkillTemplateIds: ['skill_thunder', 'skill_charge', 'skill_thunder_wave'],
  endsAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
};

export const BET_OPTIONS = [10, 50, 100, 500, 1000] as const;

export const WIN_MULTIPLIER = {
  easy: 1.2,
  normal: 1.5,
  hard: 2.0,
} as const;

export const SAVE_KEY = 'neon_colosseum_save_v1';

export const STORAGE_THROTTLE = 1000;

export const RARITY_MULTIPLIER = {
  1: 1,
  2: 1.2,
  3: 1.5,
  4: 2,
  5: 3,
} as const;

export const LEVEL_EXP_MULTIPLIER = 100;

export const INITIAL_PLAYER_DATA = {
  coins: 1000,
  totalWins: 0,
  totalLosses: 0,
} as const;

export const NEWBIE_GIFT = {
  coins: 500,
  animals: 3,
} as const;
