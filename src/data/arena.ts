import type {
  ArenaTier,
  ArenaTierConfig,
  ArenaRankInfo,
  ArenaOpponent,
  ArenaDailyReward,
  ArenaDefenseConfig,
  LineupConfig,
  Animal,
  FormationPosition,
  TargetStrategy,
} from '@/types';
import { ANIMAL_TEMPLATES } from './animals';
import { generateId } from '@/utils/id';
import { pickRandom, randomInt, chance } from '@/utils/random';
import { ARENA_CONSTANTS } from '@/engine/constants';

const ARENA_TIER_CONFIGS: ArenaTierConfig[] = [
  {
    tier: 'rookie',
    name: '新秀',
    emoji: '🌱',
    color: '#8bc34a',
    pointThreshold: 0,
    rewards: {
      coins: 500,
      gems: 5,
    },
  },
  {
    tier: 'amateur',
    name: '业余',
    emoji: '⚡',
    color: '#03a9f4',
    pointThreshold: 200,
    rewards: {
      coins: 1000,
      gems: 10,
      materials: [{ templateId: 'mat_bt_fire_2', count: 2 }],
    },
  },
  {
    tier: 'professional',
    name: '职业',
    emoji: '🏆',
    color: '#ff9800',
    pointThreshold: 500,
    rewards: {
      coins: 2000,
      gems: 20,
      materials: [{ templateId: 'mat_bt_thunder_3', count: 2 }],
    },
  },
  {
    tier: 'elite',
    name: '精英',
    emoji: '💎',
    color: '#9c27b0',
    pointThreshold: 900,
    rewards: {
      coins: 4000,
      gems: 40,
      materials: [{ templateId: 'mat_bt_thunder_3', count: 3 }],
    },
  },
  {
    tier: 'legendary',
    name: '传奇',
    emoji: '👑',
    color: '#f44336',
    pointThreshold: 1400,
    rewards: {
      coins: 8000,
      gems: 80,
      materials: [{ templateId: 'mat_bt_fire_4', count: 2 }],
    },
  },
  {
    tier: 'champion',
    name: '冠军',
    emoji: '🔱',
    color: '#e91e63',
    pointThreshold: 2000,
    rewards: {
      coins: 15000,
      gems: 150,
      materials: [{ templateId: 'mat_bt_fire_4', count: 3 }],
    },
  },
];

const ARENA_TIER_ORDER: ArenaTier[] = ['rookie', 'amateur', 'professional', 'elite', 'legendary', 'champion'];

const FAKE_CHALLENGER_NAMES = [
  '暗夜猎手', '霓虹骑士', '赛博行者', '量子幽灵', '钢铁意志',
  '深渊守望', '电子幻影', '暗影刺客', '虚空行者', '烈焰战神',
  '冰霜领主', '雷霆使者', '自然之息', '黑暗贤者', '机械之心',
  '幻影舞者', '赤红猎鹰', '星辰旅者', '混沌魔导', '永恒守卫',
];

const FAKE_AVATARS = [
  '🥊', '🏴‍☠️', '👑', '⚔️', '💨',
  '☠️', '🏰', '👺', '🤖', '🦾',
  '🦊', '🐺', '🐍', '🦅', '🐉',
];

export const getArenaTierConfig = (tier: ArenaTier): ArenaTierConfig => {
  return ARENA_TIER_CONFIGS.find(c => c.tier === tier) || ARENA_TIER_CONFIGS[0];
};

export const getAllArenaTierConfigs = (): ArenaTierConfig[] => {
  return ARENA_TIER_CONFIGS;
};

export const getArenaTierIndex = (tier: ArenaTier): number => {
  return ARENA_TIER_ORDER.indexOf(tier);
};

export const calculateArenaTierFromPoints = (points: number): ArenaTier => {
  for (let i = ARENA_TIER_CONFIGS.length - 1; i >= 0; i--) {
    if (points >= ARENA_TIER_CONFIGS[i].pointThreshold) {
      return ARENA_TIER_CONFIGS[i].tier;
    }
  }
  return 'rookie';
};

export const createDefaultArenaRankInfo = (): ArenaRankInfo => ({
  rank: 1000,
  arenaPoints: 0,
  tier: 'rookie',
  wins: 0,
  losses: 0,
  winStreak: 0,
  highestRank: 1000,
  highestPoints: 0,
  totalAttacks: 0,
  totalDefenses: 0,
  defenseWins: 0,
});

export const calculateArenaRankFromPoints = (points: number): number => {
  const baseRank = 1000;
  const pointsPerRank = 2;
  return Math.max(1, baseRank - Math.floor(points / pointsPerRank));
};

export const calculatePointsChange = (
  attackerPoints: number,
  defenderPoints: number,
  isWin: boolean,
  difficulty: 'easy' | 'normal' | 'hard'
): number => {
  const baseChange = ARENA_CONSTANTS.BASE_POINT_CHANGE;
  const pointDiff = defenderPoints - attackerPoints;
  const diffFactor = 1 + (pointDiff / 500);

  const difficultyMultiplier = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.5 : 1;

  if (isWin) {
    return Math.max(ARENA_CONSTANTS.MIN_POINTS_GAIN, Math.floor(baseChange * diffFactor * difficultyMultiplier));
  } else {
    return -Math.max(ARENA_CONSTANTS.MIN_POINTS_LOSS, Math.floor(baseChange * (2 - diffFactor) * difficultyMultiplier));
  }
};

export const generateArenaOpponent = (
  playerPoints: number,
  playerTier: ArenaTier,
  availableAnimalTemplates: string[],
  difficulty: 'easy' | 'normal' | 'hard'
): ArenaOpponent => {
  const tierIdx = getArenaTierIndex(playerTier);
  const pointVariance = difficulty === 'easy' ? -100 : difficulty === 'hard' ? 100 : 0;
  const opponentPoints = Math.max(0, playerPoints + pointVariance + randomInt(-50, 50));
  const opponentTier = calculateArenaTierFromPoints(opponentPoints);

  const teamSize = Math.min(3, 1 + Math.floor(tierIdx / 2));
  const animalIds: string[] = [];
  const animalTemplateIds: string[] = [];
  const positions: FormationPosition[] = ['front', 'mid', 'back'];

  const usedTemplates = new Set<string>();
  for (let i = 0; i < teamSize; i++) {
    let templateId = pickRandom(availableAnimalTemplates);
    let attempts = 0;
    while (usedTemplates.has(templateId) && attempts < 10) {
      templateId = pickRandom(availableAnimalTemplates);
      attempts++;
    }
    usedTemplates.add(templateId);
    animalTemplateIds.push(templateId);

    const level = 1 + Math.floor(tierIdx * 1.5) + randomInt(0, 3);
    const rarity = Math.min(5, 1 + Math.floor(tierIdx / 2) + (chance(30) ? 1 : 0));

    animalIds.push(`arena_opponent_${generateId('animal')}_${templateId}_l${level}_r${rarity}`);
  }

  const lineupConfig: LineupConfig = {
    animals: animalIds.map((id, i) => ({
      animalId: id,
      position: positions[i] || 'back',
      targetStrategy: pickRandom<TargetStrategy>(['lowestHp', 'highestAtk', 'weakest', 'highestThreat']),
    })),
    actionPriority: pickRandom(['speedFirst', 'strategic', 'aggressive']),
  };

  const pointReward = calculatePointsChange(playerPoints, opponentPoints, true, difficulty);
  const pointRisk = Math.abs(calculatePointsChange(playerPoints, opponentPoints, false, difficulty));
  const expectedPointsGain = getExpectedPointsGain(playerPoints, opponentPoints, difficulty);

  return {
    id: generateId('opponent'),
    name: pickRandom(FAKE_CHALLENGER_NAMES),
    avatar: pickRandom(FAKE_AVATARS),
    tier: opponentTier,
    arenaPoints: opponentPoints,
    animalIds,
    animalTemplateIds,
    lineupConfig,
    difficulty,
    pointReward,
    pointRisk,
    expectedPointsGain,
  };
};

export const generateArenaOpponents = (
  playerPoints: number,
  playerTier: ArenaTier,
  ownedAnimalTemplateIds: string[]
): ArenaOpponent[] => {
  const templates = ownedAnimalTemplateIds.length > 0
    ? ownedAnimalTemplateIds
    : ANIMAL_TEMPLATES.filter(t => t.rarity <= 3).map(t => t.id);

  return [
    generateArenaOpponent(playerPoints, playerTier, templates, 'easy'),
    generateArenaOpponent(playerPoints, playerTier, templates, 'normal'),
    generateArenaOpponent(playerPoints, playerTier, templates, 'hard'),
  ];
};

export const createOpponentAnimals = (opponent: ArenaOpponent): Animal[] => {
  return opponent.animalIds.map((encodedId, i) => {
    const parts = encodedId.split('_');
    const templateId = parts[4];
    const levelMatch = parts[5]?.match(/l(\d+)/);
    const rarityMatch = parts[6]?.match(/r(\d+)/);
    const level = levelMatch ? parseInt(levelMatch[1]) : 1;
    const rarity = rarityMatch ? parseInt(rarityMatch[1]) as 1 | 2 | 3 | 4 | 5 : 1;

    const template = ANIMAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return {
      id: generateId('enemy'),
      templateId,
      name: template.name,
      level,
      starLevel: (1 + Math.floor(level / 10)) as 1 | 2 | 3 | 4 | 5 | 6,
      breakthroughTier: Math.min(4, Math.floor(level / 15)) as 0 | 1 | 2 | 3 | 4,
      exp: 0,
      expToNext: level * 100,
      rarity,
      parts: [],
      skills: [
        { skillId: 'skill_bite', level: 1 + Math.floor(level / 5) },
        { skillId: 'skill_claw', level: 1 + Math.floor(level / 5) },
      ],
    };
  });
};

export const calculateDailyReward = (
  rank: number,
  tier: ArenaTier,
  points: number
): ArenaDailyReward => {
  const config = getArenaTierConfig(tier);
  const rankBonus = Math.max(0, 1 - (rank - 1) / 1000);
  const coins = Math.floor(config.rewards.coins * (0.5 + rankBonus * 0.5));
  const gems = Math.floor(config.rewards.gems * (0.5 + rankBonus * 0.5));

  const today = new Date().toISOString().split('T')[0];

  return {
    date: today,
    claimed: false,
    tier,
    rank,
    coins,
    gems,
    materials: config.rewards.materials,
  };
};

export const getDailyRewardCooldown = (lastClaimDate: string): number => {
  const today = new Date().toISOString().split('T')[0];
  if (lastClaimDate !== today) {
    return 0;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime() - Date.now();
};

export const getOpponentRefreshCooldown = (lastRefreshTime: number): number => {
  const cooldownMs = ARENA_CONSTANTS.OPPONENT_REFRESH_COOLDOWN * 1000;
  return Math.max(0, cooldownMs - (Date.now() - lastRefreshTime));
};

export const canAttack = (attackCountToday: number, maxDailyAttacks: number): boolean => {
  return attackCountToday < maxDailyAttacks;
};

export const getNextResetTime = (): number => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
};

export const isSameDay = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);
  return today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate();
};

export const createArenaDefenseConfig = (
  animalIds: string[],
  lineupConfig: LineupConfig
): ArenaDefenseConfig => ({
  animalIds: [...animalIds],
  lineupConfig: JSON.parse(JSON.stringify(lineupConfig)),
  updatedAt: Date.now(),
});

export const getPointsToNextTier = (points: number, currentTier: ArenaTier): number | null => {
  const currentIndex = getArenaTierIndex(currentTier);
  if (currentIndex >= ARENA_TIER_CONFIGS.length - 1) {
    return null;
  }
  const nextTier = ARENA_TIER_CONFIGS[currentIndex + 1];
  return Math.max(0, nextTier.pointThreshold - points);
};

export const formatArenaTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getDifficultyLabel = (difficulty: 'easy' | 'normal' | 'hard'): string => {
  const labels: Record<string, string> = {
    easy: '简单',
    normal: '普通',
    hard: '困难',
  };
  return labels[difficulty] || difficulty;
};

export const getDifficultyColor = (difficulty: 'easy' | 'normal' | 'hard'): string => {
  const colors: Record<string, string> = {
    easy: '#22c55e',
    normal: '#fbbf24',
    hard: '#ef4444',
  };
  return colors[difficulty] || '#ffffff';
};

export const getTierColor = (tier: ArenaTier): string => {
  const config = getArenaTierConfig(tier);
  return config.color;
};

export const getExpectedPointsGain = (
  attackerPoints: number,
  defenderPoints: number,
  difficulty: 'easy' | 'normal' | 'hard'
): number => {
  const baseChange = ARENA_CONSTANTS.BASE_POINT_CHANGE;
  const pointDiff = defenderPoints - attackerPoints;
  const diffFactor = 1 + (pointDiff / 500);
  const difficultyMultiplier = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 1.5 : 1;
  return Math.max(ARENA_CONSTANTS.MIN_POINTS_GAIN, Math.floor(baseChange * diffFactor * difficultyMultiplier));
};
