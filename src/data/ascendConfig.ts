import type { StarLevel, BreakthroughTier, Element } from '@/types';

export interface StarUpCost {
  coins: number;
  materials: { templateId: string; count: number }[];
  requiredLevel: number;
  requiredStarLevel: StarLevel;
}

export interface BreakthroughCost {
  coins: number;
  materials: { templateId: string; count: number }[];
  requiredLevel: number;
  requiredStarLevel: StarLevel;
  requiredBreakthroughTier: BreakthroughTier;
}

export interface StarBonus {
  hpMul: number;
  atkMul: number;
  defMul: number;
  spdBonus: number;
  skillSlots: number;
}

export interface BreakthroughBonus {
  hpFlat: number;
  atkFlat: number;
  defFlat: number;
  spdFlat: number;
  skillLevelCap: number;
  unlockCodexRank: number;
}

const STAR_UP_TABLE: Record<StarLevel, StarUpCost> = {
  1: {
    coins: 200,
    materials: [{ templateId: 'mat_star_shard_1', count: 3 }],
    requiredLevel: 5,
    requiredStarLevel: 1,
  },
  2: {
    coins: 500,
    materials: [{ templateId: 'mat_star_shard_2', count: 5 }],
    requiredLevel: 10,
    requiredStarLevel: 2,
  },
  3: {
    coins: 1200,
    materials: [{ templateId: 'mat_star_shard_3', count: 8 }],
    requiredLevel: 15,
    requiredStarLevel: 3,
  },
  4: {
    coins: 3000,
    materials: [{ templateId: 'mat_star_shard_4', count: 12 }],
    requiredLevel: 20,
    requiredStarLevel: 4,
  },
  5: {
    coins: 8000,
    materials: [{ templateId: 'mat_star_shard_5', count: 20 }],
    requiredLevel: 25,
    requiredStarLevel: 5,
  },
  6: {
    coins: 0,
    materials: [],
    requiredLevel: 99,
    requiredStarLevel: 6,
  },
};

export const getStarUpCost = (currentStarLevel: StarLevel): StarUpCost | null => {
  if (currentStarLevel >= 6) return null;
  return STAR_UP_TABLE[(currentStarLevel + 1) as StarLevel] || null;
};

const BREAKTHROUGH_TABLE: Record<BreakthroughTier, BreakthroughCost> = {
  0: {
    coins: 300,
    materials: [{ templateId: 'mat_bt_{element}_1', count: 3 }],
    requiredLevel: 8,
    requiredStarLevel: 2,
    requiredBreakthroughTier: 0,
  },
  1: {
    coins: 800,
    materials: [{ templateId: 'mat_bt_{element}_2', count: 5 }],
    requiredLevel: 14,
    requiredStarLevel: 3,
    requiredBreakthroughTier: 1,
  },
  2: {
    coins: 2000,
    materials: [{ templateId: 'mat_bt_{element}_3', count: 8 }],
    requiredLevel: 20,
    requiredStarLevel: 4,
    requiredBreakthroughTier: 2,
  },
  3: {
    coins: 5000,
    materials: [{ templateId: 'mat_bt_{element}_4', count: 10 }],
    requiredLevel: 26,
    requiredStarLevel: 5,
    requiredBreakthroughTier: 3,
  },
  4: {
    coins: 0,
    materials: [],
    requiredLevel: 99,
    requiredStarLevel: 6,
    requiredBreakthroughTier: 4,
  },
};

export const getBreakthroughCost = (currentTier: BreakthroughTier, element: Element): { coins: number; materials: { templateId: string; count: number }[]; requiredLevel: number; requiredStarLevel: StarLevel } | null => {
  if (currentTier >= 4) return null;
  const nextTier = (currentTier + 1) as BreakthroughTier;
  const template = BREAKTHROUGH_TABLE[nextTier];
  if (!template) return null;

  const resolvedMaterials = template.materials.map(m => ({
    templateId: m.templateId.replace('{element}', element),
    count: m.count,
  }));

  return {
    coins: template.coins,
    materials: resolvedMaterials,
    requiredLevel: template.requiredLevel,
    requiredStarLevel: template.requiredStarLevel,
  };
};

const STAR_BONUS_TABLE: Record<StarLevel, StarBonus> = {
  1: { hpMul: 1.0, atkMul: 1.0, defMul: 1.0, spdBonus: 0, skillSlots: 1 },
  2: { hpMul: 1.15, atkMul: 1.15, defMul: 1.15, spdBonus: 2, skillSlots: 1 },
  3: { hpMul: 1.35, atkMul: 1.35, defMul: 1.35, spdBonus: 5, skillSlots: 2 },
  4: { hpMul: 1.6, atkMul: 1.6, defMul: 1.6, spdBonus: 8, skillSlots: 2 },
  5: { hpMul: 1.9, atkMul: 1.9, defMul: 1.9, spdBonus: 12, skillSlots: 3 },
  6: { hpMul: 2.3, atkMul: 2.3, defMul: 2.3, spdBonus: 18, skillSlots: 3 },
};

export const getStarBonus = (starLevel: StarLevel): StarBonus => {
  return STAR_BONUS_TABLE[starLevel];
};

const BREAKTHROUGH_BONUS_TABLE: Record<BreakthroughTier, BreakthroughBonus> = {
  0: { hpFlat: 0, atkFlat: 0, defFlat: 0, spdFlat: 0, skillLevelCap: 1, unlockCodexRank: 0 },
  1: { hpFlat: 30, atkFlat: 8, defFlat: 5, spdFlat: 3, skillLevelCap: 3, unlockCodexRank: 1 },
  2: { hpFlat: 80, atkFlat: 18, defFlat: 12, spdFlat: 6, skillLevelCap: 5, unlockCodexRank: 2 },
  3: { hpFlat: 160, atkFlat: 35, defFlat: 25, spdFlat: 10, skillLevelCap: 8, unlockCodexRank: 3 },
  4: { hpFlat: 300, atkFlat: 60, defFlat: 45, spdFlat: 16, skillLevelCap: 10, unlockCodexRank: 4 },
};

export const getBreakthroughBonus = (tier: BreakthroughTier): BreakthroughBonus => {
  return BREAKTHROUGH_BONUS_TABLE[tier];
};

export const getSkillSlotsForStar = (starLevel: StarLevel): number => {
  return STAR_BONUS_TABLE[starLevel].skillSlots;
};

export const getSkillLevelCapForBreakthrough = (tier: BreakthroughTier): number => {
  return BREAKTHROUGH_BONUS_TABLE[tier].skillLevelCap;
};

export const CODEX_UNLOCK_CONDITIONS: Record<number, { starLevel: StarLevel; breakthroughTier: BreakthroughTier }> = {
  1: { starLevel: 2, breakthroughTier: 0 },
  2: { starLevel: 3, breakthroughTier: 1 },
  3: { starLevel: 4, breakthroughTier: 2 },
  4: { starLevel: 5, breakthroughTier: 3 },
};

export const isCodexRankUnlocked = (
  rank: number,
  starLevel: StarLevel,
  breakthroughTier: BreakthroughTier,
): boolean => {
  const condition = CODEX_UNLOCK_CONDITIONS[rank];
  if (!condition) return false;
  return starLevel >= condition.starLevel && breakthroughTier >= condition.breakthroughTier;
};

export const MAX_SKILL_LEVEL = 10;

export const BATTLE_MATERIAL_DROPS = {
  win: {
    starMaterialChance: 30,
    btMaterialChance: 20,
    starMaterialCount: { min: 1, max: 3 },
    btMaterialCount: { min: 1, max: 2 },
  },
  lose: {
    starMaterialChance: 15,
    btMaterialChance: 10,
    starMaterialCount: { min: 1, max: 2 },
    btMaterialCount: { min: 1, max: 1 },
  },
};
