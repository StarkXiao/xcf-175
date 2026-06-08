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
} as const;

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
} as const;

export const GACHA_COST = {
  animal: 100,
  animalTen: 900,
  part: 50,
  skill: 80,
} as const;

export const GACHA_COSTS = GACHA_COST;

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
