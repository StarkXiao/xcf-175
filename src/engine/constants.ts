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

export const STAR_LEVEL_NAMES: Record<number, string> = {
  1: '一星',
  2: '二星',
  3: '三星',
  4: '四星',
  5: '五星',
  6: '六星',
};

export const BREAKTHROUGH_TIER_NAMES: Record<number, string> = {
  0: '未突破',
  1: '突破一阶',
  2: '突破二阶',
  3: '突破三阶',
  4: '突破四阶',
};

export const STAR_EMOJI = '⭐';

export const BREAKTHROUGH_EMOJI = '🔮';

export const CODEX_RANK_NAMES: Record<number, string> = {
  0: '未解锁',
  1: '初识',
  2: '熟识',
  3: '精通',
  4: '传说',
};

export const SEASON_DURATION_DAYS = 30;

export const SEASON_POINT_WIN_BASE = 25;
export const SEASON_POINT_WIN_STREAK_BONUS = 5;
export const SEASON_POINT_WIN_DIFFICULTY_BONUS = 8;
export const SEASON_POINT_LOSS_BASE = -15;
export const SEASON_POINT_LOSS_STREAK_REDUCTION = 3;

export const RANK_TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'] as const;

export const RANK_TIER_NAMES: Record<string, string> = {
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
  diamond: '钻石',
  master: '大师',
  grandmaster: '宗师',
};

export const RANK_TIER_EMOJIS: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
  diamond: '💠',
  master: '👑',
  grandmaster: '🔱',
};

export const RANK_TIER_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#00e5ff',
  diamond: '#b388ff',
  master: '#ff6e40',
  grandmaster: '#ff1744',
};

export const RANK_SUB_TIER_NAMES: Record<number, string> = {
  1: 'III',
  2: 'II',
  3: 'I',
};

export const RANK_POINT_THRESHOLDS: Record<string, { promotion: number; demotion: number }> = {
  bronze: { promotion: 100, demotion: 0 },
  silver: { promotion: 200, demotion: 0 },
  gold: { promotion: 350, demotion: 50 },
  platinum: { promotion: 550, demotion: 100 },
  diamond: { promotion: 800, demotion: 150 },
  master: { promotion: 1100, demotion: 200 },
  grandmaster: { promotion: Infinity, demotion: 250 },
};

export const SEASON_REWARD_COINS: Record<string, number> = {
  bronze: 500,
  silver: 1000,
  gold: 2000,
  platinum: 4000,
  diamond: 7000,
  master: 12000,
  grandmaster: 20000,
};

export const SEASON_REWARD_GEMS: Record<string, number> = {
  bronze: 5,
  silver: 10,
  gold: 20,
  platinum: 35,
  diamond: 60,
  master: 100,
  grandmaster: 200,
};

export const RANK_PROTECTION_CONFIG: Record<string, { maxCount: number; resetOnPromotion: boolean }> = {
  bronze: { maxCount: 99, resetOnPromotion: true },
  silver: { maxCount: 5, resetOnPromotion: true },
  gold: { maxCount: 4, resetOnPromotion: true },
  platinum: { maxCount: 3, resetOnPromotion: true },
  diamond: { maxCount: 3, resetOnPromotion: true },
  master: { maxCount: 2, resetOnPromotion: true },
  grandmaster: { maxCount: 2, resetOnPromotion: true },
};

export const MATCHMAKING_CONFIG = {
  tierRange: 1,
  pointRange: 150,
  fairThreshold: 0.7,
  challengeBonus: 1.3,
  advantagePenalty: 0.8,
  sameTierBonus: 1.1,
} as const;

export const SEASON_SETTLEMENT_CONFIG = {
  softResetRatio: 0.5,
  minResetPoints: 0,
  placementMatchesCount: 5,
  placementBasePoints: 75,
  seasonEndWarningHours: 24,
} as const;

export const SEASON_PLACEMENT_TIERS: { minWins: number; tier: import('@/types').RankTier; subTier: import('@/types').RankSubTier }[] = [
  { minWins: 5, tier: 'gold', subTier: 2 },
  { minWins: 4, tier: 'silver', subTier: 3 },
  { minWins: 3, tier: 'silver', subTier: 2 },
  { minWins: 2, tier: 'silver', subTier: 1 },
  { minWins: 1, tier: 'bronze', subTier: 3 },
  { minWins: 0, tier: 'bronze', subTier: 1 },
];

export const RANK_DEMOTION_PROTECTION_THRESHOLD: Record<string, number> = {
  bronze: 0,
  silver: 30,
  gold: 80,
  platinum: 150,
  diamond: 250,
  master: 400,
  grandmaster: 600,
};
