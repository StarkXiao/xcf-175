import type {
  RankTier,
  RankSubTier,
  RankInfo,
  RankTierConfig,
  SeasonInfo,
  SeasonReward,
  SeasonRecord,
  LeaderboardEntry,
  RankChangeResult,
  DynamicDifficultyTier,
  MatchmakingResult,
  SeasonBattleSummary,
  SeasonSettlementResult,
  SeasonStats,
  RankProtectionState,
} from '@/types';
import {
  RANK_TIER_ORDER,
  RANK_TIER_NAMES,
  RANK_TIER_EMOJIS,
  RANK_TIER_COLORS,
  RANK_POINT_THRESHOLDS,
  SEASON_REWARD_COINS,
  SEASON_REWARD_GEMS,
  SEASON_POINT_WIN_BASE,
  SEASON_POINT_WIN_STREAK_BONUS,
  SEASON_POINT_WIN_DIFFICULTY_BONUS,
  SEASON_POINT_LOSS_BASE,
  SEASON_POINT_LOSS_STREAK_REDUCTION,
  SEASON_DURATION_DAYS,
  RANK_PROTECTION_CONFIG,
  MATCHMAKING_CONFIG,
  SEASON_SETTLEMENT_CONFIG,
  SEASON_PLACEMENT_TIERS,
  RANK_DEMOTION_PROTECTION_THRESHOLD,
} from '@/engine/constants';
import { generateId } from '@/utils/id';
import { randomInt, pickRandom } from '@/utils/random';

const RANK_TIER_CONFIGS: RankTierConfig[] = [
  {
    tier: 'bronze',
    name: '青铜',
    emoji: '🥉',
    color: '#cd7f32',
    pointThreshold: 0,
    subTiers: 3,
    rewards: [
      { type: 'coins', amount: 500, description: '500金币' },
      { type: 'gems', amount: 5, description: '5宝石' },
    ],
  },
  {
    tier: 'silver',
    name: '白银',
    emoji: '🥈',
    color: '#c0c0c0',
    pointThreshold: 100,
    subTiers: 3,
    rewards: [
      { type: 'coins', amount: 1000, description: '1000金币' },
      { type: 'gems', amount: 10, description: '10宝石' },
    ],
  },
  {
    tier: 'gold',
    name: '黄金',
    emoji: '🥇',
    color: '#ffd700',
    pointThreshold: 200,
    subTiers: 3,
    rewards: [
      { type: 'coins', amount: 2000, description: '2000金币' },
      { type: 'gems', amount: 20, description: '20宝石' },
    ],
  },
  {
    tier: 'platinum',
    name: '铂金',
    emoji: '💎',
    color: '#00e5ff',
    pointThreshold: 350,
    subTiers: 3,
    rewards: [
      { type: 'coins', amount: 4000, description: '4000金币' },
      { type: 'gems', amount: 35, description: '35宝石' },
    ],
  },
  {
    tier: 'diamond',
    name: '钻石',
    emoji: '💠',
    color: '#b388ff',
    pointThreshold: 550,
    subTiers: 3,
    rewards: [
      { type: 'coins', amount: 7000, description: '7000金币' },
      { type: 'gems', amount: 60, description: '60宝石' },
    ],
  },
  {
    tier: 'master',
    name: '大师',
    emoji: '👑',
    color: '#ff6e40',
    pointThreshold: 800,
    subTiers: 3,
    rewards: [
      { type: 'coins', amount: 12000, description: '12000金币' },
      { type: 'gems', amount: 100, description: '100宝石' },
    ],
  },
  {
    tier: 'grandmaster',
    name: '宗师',
    emoji: '🔱',
    color: '#ff1744',
    pointThreshold: 1100,
    subTiers: 1,
    rewards: [
      { type: 'coins', amount: 20000, description: '20000金币' },
      { type: 'gems', amount: 200, description: '200宝石' },
    ],
  },
];

export const getRankTierConfig = (tier: RankTier): RankTierConfig => {
  return RANK_TIER_CONFIGS.find(c => c.tier === tier) || RANK_TIER_CONFIGS[0];
};

export const getAllRankTierConfigs = (): RankTierConfig[] => {
  return RANK_TIER_CONFIGS;
};

export const createDefaultRankInfo = (): RankInfo => ({
  tier: 'bronze',
  subTier: 1 as RankSubTier,
  points: 0,
  seasonWins: 0,
  seasonLosses: 0,
  highestTier: 'bronze',
  highestSubTier: 1 as RankSubTier,
});

const SEASON_NAMES = [
  '霓虹黎明',
  '赛博暗潮',
  '钢铁风暴',
  '电子深渊',
  '暗影裂隙',
  '量子狂潮',
  '幻影终章',
  '赤红审判',
  '虚空纪元',
  '永恒回路',
];

let currentSeasonIndex = 0;

export const createSeason = (index?: number): SeasonInfo => {
  const idx = index ?? currentSeasonIndex;
  currentSeasonIndex = idx + 1;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const seasonNumber = idx + 1;
  return {
    id: generateId('season'),
    name: `S${seasonNumber}`,
    subtitle: SEASON_NAMES[idx % SEASON_NAMES.length],
    startTime: now,
    endTime: now + SEASON_DURATION_DAYS * dayMs,
    status: 'active',
  };
};

export const isSeasonEnded = (season: SeasonInfo): boolean => {
  return Date.now() >= season.endTime;
};

export const getSeasonRemainingTime = (season: SeasonInfo): number => {
  return Math.max(0, season.endTime - Date.now());
};

export const getSeasonProgress = (season: SeasonInfo): number => {
  const total = season.endTime - season.startTime;
  const elapsed = Date.now() - season.startTime;
  return Math.min(1, Math.max(0, elapsed / total));
};

export const isSeasonEndingSoon = (season: SeasonInfo): boolean => {
  const remaining = getSeasonRemainingTime(season);
  const warningMs = SEASON_SETTLEMENT_CONFIG.seasonEndWarningHours * 60 * 60 * 1000;
  return remaining > 0 && remaining <= warningMs;
};

export const getTierIndex = (tier: RankTier): number => {
  return RANK_TIER_ORDER.indexOf(tier);
};

const isHigherTier = (a: RankTier, b: RankTier): boolean => {
  return getTierIndex(a) > getTierIndex(b);
};

const isSameOrHigherTier = (a: RankTier, subA: RankSubTier, b: RankTier, subB: RankSubTier): boolean => {
  const idxA = getTierIndex(a);
  const idxB = getTierIndex(b);
  if (idxA > idxB) return true;
  if (idxA === idxB) return subA >= subB;
  return false;
};

export const calculateRankFromPoints = (points: number): { tier: RankTier; subTier: RankSubTier } => {
  let matchedTier: RankTier = 'bronze';
  let matchedSubTier: RankSubTier = 1;

  for (let i = RANK_TIER_CONFIGS.length - 1; i >= 0; i--) {
    const config = RANK_TIER_CONFIGS[i];
    if (points >= config.pointThreshold) {
      matchedTier = config.tier;
      const threshold = RANK_POINT_THRESHOLDS[config.tier];
      const pointsAbove = points - config.pointThreshold;
      const promotionGap = config.tier === 'grandmaster'
        ? Infinity
        : (RANK_TIER_CONFIGS[i + 1]?.pointThreshold ?? Infinity) - config.pointThreshold;

      if (config.subTiers === 1) {
        matchedSubTier = 1 as RankSubTier;
      } else {
        const tierGap = promotionGap;
        const perSubTier = tierGap / 3;
        if (perSubTier <= 0 || tierGap === Infinity) {
          matchedSubTier = 3 as RankSubTier;
        } else {
          const subTierIndex = Math.min(2, Math.floor(pointsAbove / perSubTier));
          matchedSubTier = (subTierIndex + 1) as RankSubTier;
        }
      }
      break;
    }
  }

  return { tier: matchedTier, subTier: matchedSubTier };
};

export const getProtectionState = (rank: RankInfo): RankProtectionState => {
  const config = RANK_PROTECTION_CONFIG[rank.tier] || RANK_PROTECTION_CONFIG.bronze;
  return {
    remainingCount: config.maxCount,
    maxCount: config.maxCount,
    isActive: config.maxCount > 0,
  };
};

export const calculateMatchmaking = (
  playerRank: RankInfo,
): MatchmakingResult => {
  const playerTierIdx = getTierIndex(playerRank.tier);
  const { tierRange, pointRange, challengeBonus, advantagePenalty, sameTierBonus } = MATCHMAKING_CONFIG;

  const opponentTierIdx = Math.min(
    RANK_TIER_ORDER.length - 1,
    Math.max(0, playerTierIdx + randomInt(-tierRange, tierRange))
  );
  const opponentTier = RANK_TIER_ORDER[opponentTierIdx];

  const subTierOptions: RankSubTier[] = [1, 2, 3];
  const opponentSubTier = pickRandom(subTierOptions);

  const opponentConfig = RANK_TIER_CONFIGS.find(c => c.tier === opponentTier)!;
  const basePoints = opponentConfig.pointThreshold;
  const pointsOffset = randomInt(-pointRange, pointRange);
  const opponentPoints = Math.max(basePoints, basePoints + Math.abs(pointsOffset));

  const tierDiff = opponentTierIdx - playerTierIdx;
  let matchQuality: MatchmakingResult['matchQuality'] = 'fair';
  let pointBonus = 1.0;

  if (tierDiff > 0) {
    matchQuality = 'challenge';
    pointBonus = challengeBonus;
  } else if (tierDiff < 0) {
    matchQuality = 'advantage';
    pointBonus = advantagePenalty;
  } else {
    pointBonus = sameTierBonus;
  }

  return {
    opponentTier,
    opponentSubTier,
    opponentPoints,
    matchQuality,
    pointBonus,
  };
};

export const getMatchmakingDifficultyModifier = (
  matchmaking: MatchmakingResult,
): { difficultyOffset: number; opponentDifficulty: 'easy' | 'normal' | 'hard' } => {
  const tierIdx = getTierIndex(matchmaking.opponentTier);
  let opponentDifficulty: 'easy' | 'normal' | 'hard';
  if (tierIdx <= 1) {
    opponentDifficulty = 'easy';
  } else if (tierIdx <= 3) {
    opponentDifficulty = 'normal';
  } else {
    opponentDifficulty = 'hard';
  }

  let difficultyOffset = 0;
  if (matchmaking.matchQuality === 'challenge') {
    difficultyOffset = 0.15 + (tierIdx - 3) * 0.05;
  } else if (matchmaking.matchQuality === 'advantage') {
    difficultyOffset = -0.1;
  }

  return { difficultyOffset, opponentDifficulty };
};

export const calculateRankChange = (
  currentRank: RankInfo,
  isWin: boolean,
  winStreak: number,
  difficultyTier: DynamicDifficultyTier,
  matchmaking?: MatchmakingResult,
): RankChangeResult => {
  let pointsChange: number;

  if (isWin) {
    let bonus = SEASON_POINT_WIN_BASE;
    bonus += Math.min(winStreak, 10) * SEASON_POINT_WIN_STREAK_BONUS;
    if (difficultyTier === 'hard' || difficultyTier === 'extreme' || difficultyTier === 'nightmare') {
      bonus += SEASON_POINT_WIN_DIFFICULTY_BONUS;
    }
    if (matchmaking) {
      bonus = Math.round(bonus * matchmaking.pointBonus);
      if (matchmaking.matchQuality === 'challenge') {
        bonus += 5;
      }
    }
    pointsChange = bonus;
  } else {
    let penalty = Math.abs(SEASON_POINT_LOSS_BASE);
    const lossStreakReduction = Math.min(winStreak === 0 ? 1 : 0, 1) * SEASON_POINT_LOSS_STREAK_REDUCTION;
    penalty = Math.max(5, penalty - lossStreakReduction);

    if (matchmaking && matchmaking.matchQuality === 'advantage') {
      penalty = Math.round(penalty * 1.2);
    } else if (matchmaking && matchmaking.matchQuality === 'challenge') {
      penalty = Math.round(penalty * 0.7);
    }

    if (currentRank.tier === 'bronze' && currentRank.subTier === 1 && currentRank.points <= 0) {
      pointsChange = 0;
    } else {
      pointsChange = -penalty;
    }
  }

  let newPoints = currentRank.points + pointsChange;

  const protectionConfig = RANK_PROTECTION_CONFIG[currentRank.tier];
  const demotionThreshold = RANK_DEMOTION_PROTECTION_THRESHOLD[currentRank.tier];
  let protectionUsed = false;

  if (!isWin && protectionConfig && currentRank.points <= demotionThreshold && pointsChange < 0) {
    const { tier: calcTier } = calculateRankFromPoints(newPoints);
    if (isHigherTier(currentRank.tier, calcTier)) {
      if (protectionConfig.maxCount > 0) {
        protectionUsed = true;
        newPoints = currentRank.points;
      }
    }
  }

  newPoints = Math.max(0, newPoints);
  const { tier: newTier, subTier: newSubTier } = calculateRankFromPoints(newPoints);

  const isPromotion = isHigherTier(newTier, currentRank.tier) ||
    (newTier === currentRank.tier && newSubTier > currentRank.subTier);
  const isDemotion = isHigherTier(currentRank.tier, newTier) ||
    (newTier === currentRank.tier && newSubTier < currentRank.subTier);

  return {
    pointsChange,
    newTier,
    newSubTier,
    newPoints,
    isPromotion,
    isDemotion,
    protectionUsed,
  };
};

export const updateRankAfterBattle = (
  currentRank: RankInfo,
  isWin: boolean,
  winStreak: number,
  difficultyTier: DynamicDifficultyTier,
  matchmaking?: MatchmakingResult,
): { rank: RankInfo; change: RankChangeResult } => {
  const change = calculateRankChange(currentRank, isWin, winStreak, difficultyTier, matchmaking);

  const newRank: RankInfo = {
    tier: change.newTier,
    subTier: change.newSubTier,
    points: change.newPoints,
    seasonWins: currentRank.seasonWins + (isWin ? 1 : 0),
    seasonLosses: currentRank.seasonLosses + (isWin ? 0 : 1),
    highestTier: currentRank.highestTier,
    highestSubTier: currentRank.highestSubTier,
  };

  if (isSameOrHigherTier(change.newTier, change.newSubTier, currentRank.highestTier, currentRank.highestSubTier)) {
    newRank.highestTier = change.newTier;
    newRank.highestSubTier = change.newSubTier;
  }

  return { rank: newRank, change };
};

export const getSeasonRewardsForTier = (tier: RankTier): SeasonReward[] => {
  const config = getRankTierConfig(tier);
  return config.rewards;
};

export const computeSeasonStats = (summaries: SeasonBattleSummary[]): SeasonStats => {
  if (summaries.length === 0) {
    return {
      totalBattles: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      avgPointsPerWin: 0,
      avgPointsPerLoss: 0,
      longestWinStreak: 0,
      promotionsCount: 0,
      demotionsCount: 0,
      timePlayed: 0,
    };
  }

  const wins = summaries.filter(s => s.isWin);
  const losses = summaries.filter(s => !s.isWin);
  let longestStreak = 0;
  let currentStreak = 0;
  for (const s of summaries) {
    if (s.isWin) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const totalWinPoints = wins.reduce((sum, s) => sum + s.rankChange.pointsChange, 0);
  const totalLossPoints = losses.reduce((sum, s) => sum + Math.abs(s.rankChange.pointsChange), 0);

  return {
    totalBattles: summaries.length,
    totalWins: wins.length,
    totalLosses: losses.length,
    winRate: Math.round((wins.length / summaries.length) * 100),
    avgPointsPerWin: wins.length > 0 ? Math.round(totalWinPoints / wins.length) : 0,
    avgPointsPerLoss: losses.length > 0 ? Math.round(totalLossPoints / losses.length) : 0,
    longestWinStreak: longestStreak,
    promotionsCount: summaries.filter(s => s.rankChange.isPromotion).length,
    demotionsCount: summaries.filter(s => s.rankChange.isDemotion).length,
    timePlayed: 0,
  };
};

export const archiveSeason = (
  seasonInfo: SeasonInfo,
  rankInfo: RankInfo,
  battleSummaries: SeasonBattleSummary[] = [],
): SeasonRecord => {
  const rewards = getSeasonRewardsForTier(rankInfo.tier);
  const stats = computeSeasonStats(battleSummaries);

  return {
    seasonId: seasonInfo.id,
    seasonName: `${seasonInfo.name} ${seasonInfo.subtitle}`,
    finalTier: rankInfo.tier,
    finalSubTier: rankInfo.subTier,
    highestTier: rankInfo.highestTier,
    highestSubTier: rankInfo.highestSubTier,
    totalWins: rankInfo.seasonWins,
    totalLosses: rankInfo.seasonLosses,
    finalPoints: rankInfo.points,
    rewards,
    timestamp: Date.now(),
    battleSummaries: battleSummaries.slice(-50),
    stats,
    rewardsClaimed: false,
  };
};

export const settleSeason = (
  seasonInfo: SeasonInfo,
  rankInfo: RankInfo,
  battleSummaries: SeasonBattleSummary[] = [],
): SeasonSettlementResult => {
  const rewards = getSeasonRewardsForTier(rankInfo.tier);
  const softResetPoints = Math.floor(rankInfo.points * SEASON_SETTLEMENT_CONFIG.softResetRatio);
  const placementRank = calculateRankFromPoints(Math.max(SEASON_SETTLEMENT_CONFIG.minResetPoints, softResetPoints));

  return {
    seasonId: seasonInfo.id,
    seasonName: `${seasonInfo.name} ${seasonInfo.subtitle}`,
    finalRank: rankInfo,
    rewards,
    archivedAt: Date.now(),
    nextSeasonId: generateId('season'),
    placementRank: {
      ...createDefaultRankInfo(),
      tier: placementRank.tier,
      subTier: placementRank.subTier,
      points: Math.max(SEASON_SETTLEMENT_CONFIG.minResetPoints, softResetPoints),
      highestTier: placementRank.tier,
      highestSubTier: placementRank.subTier,
    },
  };
};

export const calculatePlacementRank = (winsInPlacement: number): { tier: RankTier; subTier: RankSubTier; points: number } => {
  for (const placement of SEASON_PLACEMENT_TIERS) {
    if (winsInPlacement >= placement.minWins) {
      const points = SEASON_SETTLEMENT_CONFIG.placementBasePoints * winsInPlacement;
      return { tier: placement.tier, subTier: placement.subTier, points };
    }
  }
  return { tier: 'bronze', subTier: 1, points: 0 };
};

const FAKE_PLAYER_NAMES = [
  '暗夜猎手', '霓虹骑士', '赛博行者', '量子幽灵', '钢铁意志',
  '深渊守望', '电子幻影', '暗影刺客', '虚空行者', '烈焰战神',
  '冰霜领主', '雷霆使者', '自然之息', '黑暗贤者', '机械之心',
  '幻影舞者', '赤红猎鹰', '星辰旅者', '混沌魔导', '永恒守卫',
  '银翼天使', '钢铁洪流', '幽冥领主', '极光之翼', '暗潮涌动',
  '毒雾使者', '烈焰凤凰', '冰封王座', '雷电法王', '碧玉青龙',
  '紫电青霜', '金戈铁马', '风雨飘摇', '九天揽月', '五洋捉鳖',
  '苍穹之巅', '星辰大海', '逆光飞翔', '破晓之光', '暮色苍茫',
];

const FAKE_AVATARS = [
  '🥊', '🏴‍☠️', '👑', '⚔️', '💨',
  '☠️', '🏰', '👺', '🤖', '🦾',
  '🦊', '🐺', '🐍', '🦅', '🐉',
  '🎯', '💀', '🔥', '❄️', '⚡',
];

export const generateLeaderboard = (
  playerRank: RankInfo,
  playerSeasonWins: number,
  playerSeasonLosses: number,
  count: number = 50,
): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < count - 1; i++) {
    const baseRank = Math.max(0, Math.floor(i / 7));
    const tierIdx = Math.min(RANK_TIER_ORDER.length - 1, baseRank);
    const tier = RANK_TIER_ORDER[tierIdx];
    const subTier = (3 - Math.floor((i % 7) / 2.3)) as RankSubTier;
    const config = getRankTierConfig(tier);
    const threshold = RANK_POINT_THRESHOLDS[tier];
    const nextThreshold = RANK_TIER_CONFIGS.find(c => c.tier === RANK_TIER_ORDER[tierIdx + 1])?.pointThreshold ?? threshold.promotion + 300;
    const pointsRange = nextThreshold - config.pointThreshold;
    const points = config.pointThreshold + Math.floor(pointsRange * (0.3 + Math.random() * 0.7));

    const wins = Math.floor(30 + Math.random() * 70 + tierIdx * 15);
    const losses = Math.floor(10 + Math.random() * 30);
    const totalBattles = wins + losses;
    const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;

    const trendRoll = Math.random();
    const trend: LeaderboardEntry['trend'] = trendRoll < 0.3 ? 'up' : trendRoll < 0.5 ? 'down' : 'stable';

    entries.push({
      rank: i + 1,
      playerName: pickRandom(FAKE_PLAYER_NAMES),
      avatar: pickRandom(FAKE_AVATARS),
      tier,
      subTier: Math.max(1, Math.min(3, subTier)) as RankSubTier,
      points,
      wins,
      losses,
      isPlayer: false,
      winRate,
      trend,
    });
  }

  const playerTotalBattles = playerSeasonWins + playerSeasonLosses;
  const playerWinRate = playerTotalBattles > 0 ? Math.round((playerSeasonWins / playerTotalBattles) * 100) : 0;

  const playerEntry: LeaderboardEntry = {
    rank: 0,
    playerName: '你',
    avatar: '⚔️',
    tier: playerRank.tier,
    subTier: playerRank.subTier,
    points: playerRank.points,
    wins: playerSeasonWins,
    losses: playerSeasonLosses,
    isPlayer: true,
    winRate: playerWinRate,
    trend: 'stable',
  };

  entries.push(playerEntry);

  entries.sort((a, b) => b.points - a.points);

  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
};

export const formatRankDisplay = (tier: RankTier, subTier: RankSubTier): string => {
  const name = RANK_TIER_NAMES[tier];
  const config = getRankTierConfig(tier);
  if (config.subTiers === 1) return name;
  const subName = ['', 'III', 'II', 'I'][subTier] || 'III';
  return `${name} ${subName}`;
};

export const getRankEmoji = (tier: RankTier): string => {
  return RANK_TIER_EMOJIS[tier] || '🥉';
};

export const getRankColor = (tier: RankTier): string => {
  return RANK_TIER_COLORS[tier] || '#cd7f32';
};

export const getPointsToNextRank = (rank: RankInfo): { current: number; needed: number; progress: number } => {
  const tierIdx = getTierIndex(rank.tier);
  const currentConfig = RANK_TIER_CONFIGS[tierIdx];
  const nextConfig = RANK_TIER_CONFIGS[tierIdx + 1];

  if (!nextConfig) {
    return { current: rank.points - currentConfig.pointThreshold, needed: 0, progress: 1 };
  }

  const currentThreshold = currentConfig.pointThreshold;
  const nextThreshold = nextConfig.pointThreshold;
  const needed = nextThreshold - currentThreshold;
  const current = rank.points - currentThreshold;

  return {
    current: Math.max(0, current),
    needed,
    progress: Math.min(1, Math.max(0, current / needed)),
  };
};
