import type {
  OpponentTemplate,
  Animal,
  DynamicDifficultyTier,
  DynamicOpponentContext,
  DynamicEnemyTeamResult,
  StarLevel,
  BreakthroughTier,
} from '@/types';
import { getAnimalTemplate } from '@/data/animals';
import { getPartTemplate, QUALITY_MULTIPLIER } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import { getStarBonus, getBreakthroughBonus } from '@/data/ascendConfig';
import { RARITY_MULTIPLIER } from '@/engine/constants';
import { generateId } from '@/utils/id';
import { randomInt, pickRandom, chance } from '@/utils/random';

export const OPPONENT_TEMPLATES: OpponentTemplate[] = [
  {
    id: 'opp_street_brawler',
    name: '街头霸王',
    avatar: '🥊',
    description: '在街头摸爬滚打的老对手，擅长使用流浪动物进行战斗。',
    difficulty: 'easy',
    animalTemplates: ['cat_stray', 'rat_sewer', 'pigeon_city'],
    levelRange: [1, 3],
    betMultiplier: 1.2,
  },
  {
    id: 'opp_shadow_hunter',
    name: '暗影猎手',
    avatar: '🏴‍☠️',
    description: '在黑夜中行动的神秘训练师，专研敏捷型动物。',
    difficulty: 'easy',
    animalTemplates: ['cat_black', 'crow_urban', 'snake_alley'],
    levelRange: [2, 4],
    betMultiplier: 1.3,
  },
  {
    id: 'opp_scrap_king',
    name: '废品之王',
    avatar: '👑',
    description: '垃圾场的统治者，擅长使用防御型动物进行持久战。',
    difficulty: 'normal',
    animalTemplates: ['raccoon_trash', 'rat_sewer', 'turtle_sewer'],
    levelRange: [3, 5],
    betMultiplier: 1.5,
  },
  {
    id: 'opp_steel_legion',
    name: '钢铁军团',
    avatar: '⚔️',
    description: '前军事训练师，专研力量型动物的冲撞战术。',
    difficulty: 'normal',
    animalTemplates: ['dog_stray', 'goat_feral', 'boar_urban'],
    levelRange: [4, 6],
    betMultiplier: 1.6,
  },
  {
    id: 'opp_speed_demon',
    name: '速度恶魔',
    avatar: '💨',
    description: '追求极致速度的疯狂训练师，信奉先下手为强。',
    difficulty: 'normal',
    animalTemplates: ['fox_alley', 'pigeon_city', 'cat_black'],
    levelRange: [4, 7],
    betMultiplier: 1.7,
  },
  {
    id: 'opp_poison_lord',
    name: '毒雾领主',
    avatar: '☠️',
    description: '使用毒系动物的阴险训练师，让对手在痛苦中慢慢倒下。',
    difficulty: 'hard',
    animalTemplates: ['snake_alley', 'rat_sewer', 'crow_urban'],
    levelRange: [5, 8],
    betMultiplier: 2.0,
  },
  {
    id: 'opp_iron_fortress',
    name: '钢铁堡垒',
    avatar: '🏰',
    description: '防御大师，他的动物几乎坚不可摧。',
    difficulty: 'hard',
    animalTemplates: ['turtle_sewer', 'boar_urban', 'goat_feral'],
    levelRange: [6, 9],
    betMultiplier: 2.2,
  },
  {
    id: 'opp_neon_king',
    name: '霓虹王者',
    avatar: '👺',
    description: '斗兽场的传奇冠军，拥有最强的动物阵容。',
    difficulty: 'hard',
    animalTemplates: ['fox_alley', 'cat_black', 'boar_urban'],
    levelRange: [7, 10],
    betMultiplier: 2.5,
  },
];

export const DYNAMIC_DIFFICULTY_THRESHOLDS: { tier: DynamicDifficultyTier; minScore: number; diffMul: number; rewardMul: number }[] = [
  { tier: 'trivial', minScore: 0, diffMul: 0.7, rewardMul: 0.8 },
  { tier: 'easy', minScore: 15, diffMul: 0.85, rewardMul: 1.0 },
  { tier: 'normal', minScore: 30, diffMul: 1.0, rewardMul: 1.2 },
  { tier: 'hard', minScore: 50, diffMul: 1.2, rewardMul: 1.5 },
  { tier: 'extreme', minScore: 70, diffMul: 1.4, rewardMul: 1.8 },
  { tier: 'nightmare', minScore: 90, diffMul: 1.6, rewardMul: 2.2 },
];

const WIN_STREAK_BONUS_PER_STREAK = 0.08;
const WIN_STREAK_CAP = 8;
const LINEUP_REUSE_PENALTY_PER_REPEAT = 0.06;
const LINEUP_REUSE_CAP = 5;

export const DYNAMIC_TIER_NAMES: Record<DynamicDifficultyTier, string> = {
  trivial: '入门',
  easy: '简单',
  normal: '普通',
  hard: '困难',
  extreme: '极难',
  nightmare: '噩梦',
};

export const DYNAMIC_TIER_EMOJIS: Record<DynamicDifficultyTier, string> = {
  trivial: '🟢',
  easy: '🔵',
  normal: '🟡',
  hard: '🟠',
  extreme: '🔴',
  nightmare: '💀',
};

export const DYNAMIC_TIER_COLORS: Record<DynamicDifficultyTier, string> = {
  trivial: '#44cc44',
  easy: '#4488ff',
  normal: '#ffcc00',
  hard: '#ff8800',
  extreme: '#ff2200',
  nightmare: '#cc00ff',
};

export const getOpponentTemplate = (id: string): OpponentTemplate | undefined => {
  return OPPONENT_TEMPLATES.find(o => o.id === id);
};

export const getOpponentsByDifficulty = (difficulty: OpponentTemplate['difficulty']): OpponentTemplate[] => {
  return OPPONENT_TEMPLATES.filter(o => o.difficulty === difficulty);
};

export const getRandomOpponent = (difficulty?: OpponentTemplate['difficulty']): OpponentTemplate => {
  const pool = difficulty ? getOpponentsByDifficulty(difficulty) : OPPONENT_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const computePlayerStrengthScore = (animals: Animal[]): number => {
  if (animals.length === 0) return 0;

  let totalScore = 0;

  for (const animal of animals) {
    const template = getAnimalTemplate(animal.templateId);
    if (!template) continue;

    const levelMul = 1 + (animal.level - 1) * 0.1;
    const rarityMul = RARITY_MULTIPLIER[animal.rarity];
    const starBonus = getStarBonus(animal.starLevel);
    const btBonus = getBreakthroughBonus(animal.breakthroughTier);

    const hp = template.baseHp * levelMul * rarityMul * starBonus.hpMul + btBonus.hpFlat;
    const atk = template.baseAtk * levelMul * rarityMul * starBonus.atkMul + btBonus.atkFlat;
    const def = template.baseDef * levelMul * rarityMul * starBonus.defMul + btBonus.defFlat;
    const spd = template.baseSpd * levelMul * rarityMul + starBonus.spdBonus + btBonus.spdFlat;

    let partScore = 0;
    for (const ep of animal.parts) {
      const part = getPartTemplate(ep.partId);
      if (part) {
        const qMul = QUALITY_MULTIPLIER[ep.quality || 1];
        partScore += ((part.stats.hp || 0) + (part.stats.atk || 0) * 2 + (part.stats.def || 0) * 1.5 + (part.stats.spd || 0)) * qMul;
      }
    }

    let skillScore = 0;
    for (const es of animal.skills) {
      const skill = getSkillTemplate(es.skillId);
      if (skill) {
        skillScore += skill.damage * (1 + (es.level - 1) * 0.15) * RARITY_MULTIPLIER[skill.rarity];
      }
    }

    const baseScore = (hp / 10 + atk * 2 + def * 1.5 + spd) + partScore / 20 + skillScore / 15;
    const starTierBonus = (animal.starLevel - 1) * 3;
    const btTierBonus = animal.breakthroughTier * 4;

    totalScore += baseScore + starTierBonus + btTierBonus;
  }

  return Math.round(totalScore / animals.length);
};

export const computeLineupSignature = (lineupAnimalIds: string[]): string => {
  return [...lineupAnimalIds].sort().join('|');
};

export const countLineupRepeats = (currentSignature: string, recentSignatures: string[]): number => {
  return recentSignatures.filter(sig => sig === currentSignature).length;
};

export const calculateDynamicDifficulty = (
  playerStrengthScore: number,
  playerAvgLevel: number,
  currentWinStreak: number,
  recentLineupSignatures: string[],
): DynamicOpponentContext => {
  let baseTier: DynamicDifficultyTier = 'trivial';
  let diffMul = 0.7;
  let rewardMul = 0.8;

  for (let i = DYNAMIC_DIFFICULTY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (playerStrengthScore >= DYNAMIC_DIFFICULTY_THRESHOLDS[i].minScore) {
      baseTier = DYNAMIC_DIFFICULTY_THRESHOLDS[i].tier;
      diffMul = DYNAMIC_DIFFICULTY_THRESHOLDS[i].diffMul;
      rewardMul = DYNAMIC_DIFFICULTY_THRESHOLDS[i].rewardMul;
      break;
    }
  }

  const streakBonus = Math.min(currentWinStreak, WIN_STREAK_CAP) * WIN_STREAK_BONUS_PER_STREAK;
  diffMul += streakBonus;
  rewardMul += streakBonus * 0.5;

  const currentSig = recentLineupSignatures.length > 0 ? recentLineupSignatures[0] : '';
  const repeatCount = countLineupRepeats(currentSig, recentLineupSignatures.slice(1));
  const reusePenalty = Math.min(repeatCount, LINEUP_REUSE_CAP) * LINEUP_REUSE_PENALTY_PER_REPEAT;
  diffMul += reusePenalty;

  if (diffMul >= 1.5) {
    baseTier = 'nightmare';
  } else if (diffMul >= 1.3) {
    baseTier = 'extreme';
  } else if (diffMul >= 1.1) {
    baseTier = 'hard';
  }

  return {
    playerStrengthScore,
    playerAvgLevel,
    currentWinStreak,
    recentLineupSignatures,
    difficultyMultiplier: Math.round(diffMul * 100) / 100,
    rewardMultiplier: Math.round(rewardMul * 100) / 100,
    difficultyTier: baseTier,
  };
};

export const generateDynamicEnemyTeam = (
  context: DynamicOpponentContext,
  opponentDifficultyOverride?: 'easy' | 'normal' | 'hard',
): DynamicEnemyTeamResult => {
  const { playerAvgLevel, difficultyMultiplier, difficultyTier } = context;

  let opponentBaseDifficulty: OpponentTemplate['difficulty'];
  if (opponentDifficultyOverride) {
    opponentBaseDifficulty = opponentDifficultyOverride;
  } else if (difficultyTier === 'trivial' || difficultyTier === 'easy') {
    opponentBaseDifficulty = 'easy';
  } else if (difficultyTier === 'normal') {
    opponentBaseDifficulty = 'normal';
  } else {
    opponentBaseDifficulty = 'hard';
  }

  const opponent = getRandomOpponent(opponentBaseDifficulty);

  const rawMinLevel = Math.max(1, playerAvgLevel + opponent.levelRange[0] - 3);
  const rawMaxLevel = Math.max(rawMinLevel + 1, playerAvgLevel + opponent.levelRange[1] - 3);

  const levelBoost = Math.floor((difficultyMultiplier - 1) * 3);
  const minLevel = Math.max(1, rawMinLevel + levelBoost);
  const maxLevel = Math.max(minLevel + 1, rawMaxLevel + levelBoost);

  const enemyAnimals = opponent.animalTemplates.map(templateId => {
    const level = randomInt(minLevel, maxLevel);
    const rarityChance = 20 + Math.floor(difficultyMultiplier * 15);
    const rarity = chance(rarityChance) ? 3 : chance(rarityChance / 2) ? 2 : 1;
    return createEnemyAnimalDynamic(templateId, level, rarity as 1 | 2 | 3, difficultyMultiplier);
  });

  const rewardMul = context.rewardMultiplier;
  const effectiveRewardMultiplier = opponent.betMultiplier * rewardMul;

  return {
    opponent,
    animals: enemyAnimals,
    effectiveDifficulty: difficultyTier,
    difficultyMultiplier,
    rewardMultiplier: effectiveRewardMultiplier,
  };
};

const createEnemyAnimalDynamic = (templateId: string, level: number, rarity: 1 | 2 | 3, diffMul: number): Animal => {
  const template = getAnimalTemplate(templateId);
  if (!template) {
    throw new Error(`Animal template not found: ${templateId}`);
  }

  const skillPool = ['skill_bite', 'skill_claw', 'skill_fireball', 'skill_ice_shard', 'skill_thunder_bolt', 'skill_poison_fang'];
  const skillCount = diffMul >= 1.4 ? 3 : diffMul >= 1.1 ? 2 : 1;
  const skills = skillPool.slice(0, skillCount).map(sid => ({ skillId: sid, level: Math.min(5, Math.ceil(level / 2)) }));

  return {
    id: generateId('enemy'),
    templateId,
    name: template.name,
    level,
    starLevel: (diffMul >= 1.3 ? 2 : 1) as StarLevel,
    breakthroughTier: (diffMul >= 1.5 ? 1 : 0) as BreakthroughTier,
    exp: 0,
    expToNext: 100 * level,
    rarity: rarity as 1 | 2 | 3,
    parts: [],
    skills,
  };
};
