import { create } from 'zustand';
import type {
  Animal,
  Part,
  Skill,
  BattleRecord,
  SaveData,
  EquippedPart,
  EquippedSkill,
  Rarity,
  PartSlot,
  PartQuality,
  LineupConfig,
  FormationPosition,
  TargetStrategy,
  ActionPriority,
  Material,
  MaterialType,
  CodexEntry,
  PityState,
  GachaRecord,
  LimitedPoolConfig,
  GachaPoolType,
  GachaMultiResult,
  StarLevel,
  BreakthroughTier,
  DynamicDifficultyTier,
  StorySaveData,
  LabSaveData,
  LabLogEntry,
  PartSynthesisRecipe,
  SkillModificationRecipe,
  ProbabilityExperiment,
  LabMaterial,
} from '@/types';
import { ANIMAL_TEMPLATES } from '@/data/animals';
import { PART_TEMPLATES } from '@/data/parts';
import { SKILL_TEMPLATES } from '@/data/skills';
import { generateAnimalId, generateBattleId, generateId } from '@/utils/id';
import { pickRandomWeighted, pickRandom } from '@/utils/random';
import {
  loadFromLocalStorage,
  throttledSave,
  saveToLocalStorage,
  clearSave,
  hasExistingSave,
} from '@/utils/save';
import { GACHA_RATES, GACHA_COSTS, BATTLE_CONSTANTS, NEWBIE_GIFT, PITY_CONFIG, LIMITED_POOL } from '@/engine/constants';
import { simulateFullBattle } from '@/engine/battleEngine';
import { getAnimalTemplate } from '@/data/animals';
import { getPartTemplate, rollPartQuality, QUALITY_REFINE_COST } from '@/data/parts';
import { getMatchmakingDifficultyModifier } from '@/data/seasons';
import { getSkillTemplate } from '@/data/skills';
import { MATERIAL_TEMPLATES, getMaterialTemplate } from '@/data/materials';
import { getStarUpCost, getBreakthroughCost, getSkillSlotsForStar, getSkillLevelCapForBreakthrough, BATTLE_MATERIAL_DROPS } from '@/data/ascendConfig';
import {
  LAB_MATERIAL_TEMPLATES,
  getLabMaterialTemplate,
  PART_SYNTHESIS_RECIPES,
  SKILL_MODIFICATION_RECIPES,
  PROBABILITY_EXPERIMENTS,
  getPartSynthesisRecipe,
  getSkillModificationRecipe,
  getProbabilityExperiment,
  isLabMaterial,
} from '@/data/lab';
import { computePlayerStrengthScore, computeLineupSignature, calculateDynamicDifficulty } from '@/data/opponents';
import { useSeasonStore } from '@/store/useSeasonStore';

interface GameState {
  player: {
    id: string;
    coins: number;
    gems: number;
    totalWins: number;
    totalLosses: number;
    highestWinStreak: number;
    currentWinStreak: number;
    totalBetAmount: number;
    totalRewardAmount: number;
  };
  ownedAnimals: Animal[];
  ownedParts: Part[];
  ownedSkills: Skill[];
  ownedMaterials: Material[];
  codex: CodexEntry[];
  lineup: string[];
  lineupConfig: LineupConfig;
  battleHistory: BattleRecord[];
  pityState: PityState;
  gachaRecords: GachaRecord[];
  limitedPool: LimitedPoolConfig;
  storyData: StorySaveData | null;
  isLoading: boolean;
  isNewPlayer: boolean;
  isInitialized: boolean;

  initialize: () => void;
  loadSave: () => boolean;
  saveGame: (force?: boolean) => void;
  resetGame: () => void;

  addAnimal: (animal: Animal) => void;
  addPart: (part: Part) => void;
  addSkill: (skill: Skill) => void;
  removeAnimal: (id: string) => void;
  removePart: (id: string) => void;
  removeSkill: (id: string) => void;
  levelUpAnimal: (id: string) => boolean;

  addToLineup: (animalId: string) => boolean;
  removeFromLineup: (animalId: string) => void;

  setFormationPosition: (animalId: string, position: FormationPosition) => void;
  setTargetStrategy: (animalId: string, strategy: TargetStrategy) => void;
  setActionPriority: (priority: ActionPriority) => void;
  getLineupConfig: () => LineupConfig;

  equipPart: (animalId: string, partId: string, slot: PartSlot) => boolean;
  unequipPart: (animalId: string, slot: PartSlot) => void;
  refinePart: (partId: string) => boolean;

  equipSkill: (animalId: string, skillId: string) => boolean;
  unequipSkill: (animalId: string, index: number) => void;
  upgradeSkill: (animalId: string, skillIndex: number) => boolean;
  chooseBranch: (animalId: string, skillIndex: number, branchId: string) => boolean;

  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;

  gachaAnimal: () => { animal: Animal; isNew: boolean; isPity: boolean };
  gachaPart: () => { part: Part; isNew: boolean; isPity: boolean };
  gachaSkill: () => { skill: Skill; isNew: boolean; isPity: boolean };
  gachaLimited: () => { item: Animal | Part | Skill; itemType: 'animal' | 'part' | 'skill'; isNew: boolean; isPity: boolean; isFeatured: boolean };
  gachaMulti: (poolType: GachaPoolType, count: number) => { results: GachaMultiResult[]; totalCost: number };

  startBattle: (betAmount: number) => {
    success: boolean;
    battleRecord?: BattleRecord;
    isWin?: boolean;
    reward?: number;
    effectiveDifficulty?: DynamicDifficultyTier;
    rewardMultiplier?: number;
    rankChange?: import('@/types').RankChangeResult;
  };

  getAnimalById: (id: string) => Animal | undefined;
  getLineupAnimals: () => Animal[];

  starUpAnimal: (id: string) => boolean;
  breakthroughAnimal: (id: string) => boolean;
  addMaterials: (materials: { templateId: string; count: number }[]) => void;
  getMaterialCount: (templateId: string) => number;
  updateCodex: (templateId: string) => void;
  canStarUp: (id: string) => boolean;
  canBreakthrough: (id: string) => boolean;

  labData: LabSaveData;

  synthesizePart: (recipeId: string) => {
    success: boolean;
    part?: Part;
    returnedMaterials?: { templateId: string; count: number }[];
  };
  canSynthesize: (recipeId: string) => boolean;

  modifySkill: (recipeId: string, skillTemplateId?: string) => {
    success: boolean;
    skill?: Skill;
    effects?: {
      damageBonus?: number;
      cooldownReduction?: number;
      statusEffectChanceBonus?: number;
    };
  };
  canModifySkill: (recipeId: string, skillTemplateId?: string) => boolean;

  runExperiment: (experimentId: string) => {
    rewards: {
      type: string;
      name: string;
      emoji: string;
      rarity?: Rarity;
      amount?: number;
      item?: Part | Skill | Material;
    }[];
  };
  canRunExperiment: (experimentId: string) => boolean;

  addLabLog: (log: Omit<LabLogEntry, 'id' | 'timestamp'>) => void;
  clearLabLogs: () => void;
}

const DEFAULT_PITY_STATE: PityState = {
  animal: { pullsSinceR4: 0, pullsSinceR5: 0 },
  part: { pullsSinceR4: 0, pullsSinceR5: 0 },
  skill: { pullsSinceR4: 0, pullsSinceR5: 0 },
  limited: { pullsSinceR4: 0, pullsSinceR5: 0, guaranteedFeatured: false },
};

const createAnimalFromTemplate = (templateId: string, rarity: Rarity): Animal => {
  const template = getAnimalTemplate(templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);

  return {
    id: generateAnimalId(),
    templateId,
    name: template.name,
    rarity,
    level: 1,
    starLevel: 1 as StarLevel,
    breakthroughTier: 0 as BreakthroughTier,
    parts: [],
    skills: [],
    exp: 0,
    expToNext: 100,
  };
};

const createInitialAnimals = (): Animal[] => {
  const initialTemplates = ['cat_stray', 'dog_stray', 'rat_sewer'];
  return initialTemplates.map(templateId =>
    createAnimalFromTemplate(templateId, 2 as Rarity)
  );
};

const createInitialParts = (): Part[] => {
  const parts: Part[] = [];
  const basicParts = PART_TEMPLATES.filter(p => p.rarity <= 2).slice(0, 3);
  basicParts.forEach(p => {
    parts.push({ ...p, id: generateId('part'), templateId: p.id, quality: 1 as PartQuality, setId: p.setId });
  });
  return parts;
};

const createInitialSkills = (): Skill[] => {
  const skills: Skill[] = [];
  const basicSkills = SKILL_TEMPLATES.filter(s => s.type === 'attack' || s.type === 'heal').slice(0, 3);
  basicSkills.forEach(s => {
    skills.push({ ...s, id: generateId('skill'), templateId: s.id });
  });
  return skills;
};

const rollRarityWithPity = (
  rates: Record<number, number>,
  pullsSinceR4: number,
  pullsSinceR5: number,
  isLimited: boolean = false,
): Rarity => {
  const hardPityR5 = isLimited ? PITY_CONFIG.limitedHardPityR5 : PITY_CONFIG.hardPityR5;
  const hardPityR4 = isLimited ? PITY_CONFIG.limitedHardPityR4 : PITY_CONFIG.hardPityR4;
  const softPityStart = isLimited ? PITY_CONFIG.limitedSoftPityR5Start : PITY_CONFIG.softPityR5Start;
  const softPityBonus = isLimited ? PITY_CONFIG.limitedSoftPityR5Bonus : PITY_CONFIG.softPityR5Bonus;

  if (pullsSinceR5 >= hardPityR5 - 1) {
    return 5;
  }

  if (pullsSinceR4 >= hardPityR4 - 1) {
    return 4;
  }

  const rarities = Object.keys(rates).map(Number) as Rarity[];
  const adjustedRates = { ...rates };

  if (pullsSinceR5 >= softPityStart - 1) {
    const overflow = pullsSinceR5 - (softPityStart - 1);
    const bonus = overflow * softPityBonus;
    adjustedRates[5] = (adjustedRates[5] || 0) + bonus;
    adjustedRates[1] = Math.max(0, (adjustedRates[1] || 0) - bonus);
  }

  const weights = rarities.map(r => adjustedRates[r]);
  return pickRandomWeighted(rarities, weights);
};

const pickSkillTemplate = (targetRarity: Rarity): { template: typeof SKILL_TEMPLATES[number]; actualRarity: Rarity } => {
  let pool = SKILL_TEMPLATES.filter(s => s.rarity === targetRarity);
  if (pool.length === 0) {
    pool = SKILL_TEMPLATES.filter(s => s.rarity <= targetRarity);
  }
  if (pool.length === 0) {
    pool = SKILL_TEMPLATES;
  }
  const template = pickRandom(pool);
  return { template, actualRarity: template.rarity };
};

const pickAnimalTemplate = (targetRarity: Rarity): { template: typeof ANIMAL_TEMPLATES[number]; actualRarity: Rarity } => {
  let pool = ANIMAL_TEMPLATES.filter(t => t.rarity === targetRarity);
  if (pool.length === 0) {
    pool = ANIMAL_TEMPLATES.filter(t => t.rarity <= targetRarity);
  }
  if (pool.length === 0) {
    pool = ANIMAL_TEMPLATES;
  }
  const template = pickRandom(pool);
  return { template, actualRarity: template.rarity };
};

const pickPartTemplate = (targetRarity: Rarity): { template: typeof PART_TEMPLATES[number]; actualRarity: Rarity } => {
  let pool = PART_TEMPLATES.filter(p => p.rarity === targetRarity);
  if (pool.length === 0) {
    pool = PART_TEMPLATES.filter(p => p.rarity <= targetRarity);
  }
  if (pool.length === 0) {
    pool = PART_TEMPLATES;
  }
  const template = pickRandom(pool);
  return { template, actualRarity: template.rarity };
};

const recordGacha = (
  poolType: GachaPoolType,
  itemType: 'animal' | 'part' | 'skill',
  templateId: string,
  itemName: string,
  itemEmoji: string,
  rarity: Rarity,
  isNew: boolean,
): GachaRecord => ({
  id: generateId('gacha'),
  poolType,
  itemType,
  itemTemplateId: templateId,
  itemName,
  itemEmoji,
  rarity,
  isNew,
  timestamp: Date.now(),
});

export const useGameStore = create<GameState>((set, get) => ({
  player: {
    id: '',
    coins: 0,
    gems: 0,
    totalWins: 0,
    totalLosses: 0,
    highestWinStreak: 0,
    currentWinStreak: 0,
    totalBetAmount: 0,
    totalRewardAmount: 0,
  },
  ownedAnimals: [],
  ownedParts: [],
  ownedSkills: [],
  ownedMaterials: [],
  codex: [],
  lineup: [],
  lineupConfig: { animals: [], actionPriority: 'speedFirst' },
  battleHistory: [],
  pityState: { ...DEFAULT_PITY_STATE },
  gachaRecords: [],
  limitedPool: { ...LIMITED_POOL },
  storyData: null,
  labData: {
    synthesisCount: 0,
    modificationCount: 0,
    experimentCount: 0,
    successCount: 0,
    failureCount: 0,
    recentLogs: [],
    unlockedRecipes: [],
    unlockedExperiments: [],
  },
  isLoading: true,
  isNewPlayer: false,
  isInitialized: false,

  initialize: () => {
    const hasSave = hasExistingSave();
    if (hasSave) {
      const loaded = get().loadSave();
      if (loaded) {
        set({ isLoading: false, isNewPlayer: false, isInitialized: true });
        return;
      }
    }

    const initialAnimals = createInitialAnimals();
    const initialParts = createInitialParts();
    const initialSkills = createInitialSkills();

    initialAnimals[0].skills = [{ skillId: 'skill_bite', level: 1 }];
    initialAnimals[1].skills = [{ skillId: 'skill_claw', level: 1 }];

    const initialMaterials: Material[] = [];
    const starterMaterials = [
      { templateId: 'lab_synthesis_dust', count: 10 },
      { templateId: 'lab_synthesis_crystal', count: 5 },
      { templateId: 'lab_synthesis_core', count: 2 },
      { templateId: 'lab_modify_chip', count: 8 },
      { templateId: 'lab_modify_processor', count: 4 },
      { templateId: 'lab_modify_ai', count: 2 },
      { templateId: 'lab_experiment_flask', count: 6 },
      { templateId: 'lab_experiment_catalyst', count: 3 },
      { templateId: 'mat_bt_fire_2', count: 3 },
      { templateId: 'mat_bt_ice_2', count: 3 },
      { templateId: 'mat_bt_thunder_3', count: 2 },
      { templateId: 'mat_bt_nature_2', count: 4 },
    ];
    starterMaterials.forEach(sm => {
      const labTemplate = getLabMaterialTemplate(sm.templateId);
      const stdTemplate = getMaterialTemplate(sm.templateId);
      const template = labTemplate || stdTemplate;
      if (template) {
        for (let i = 0; i < sm.count; i++) {
          initialMaterials.push({
            id: generateId('mat'),
            templateId: template.id,
            name: template.name,
            description: template.description,
            emoji: template.emoji,
            rarity: template.rarity,
            type: template.type as MaterialType,
            element: 'element' in template ? (template as { element?: string }).element as any : undefined,
          });
        }
      }
    });

    set({
      player: {
        id: generateId('player'),
        coins: NEWBIE_GIFT.coins + 1000,
        gems: 10,
        totalWins: 0,
        totalLosses: 0,
        highestWinStreak: 0,
        currentWinStreak: 0,
        totalBetAmount: 0,
        totalRewardAmount: 0,
      },
      ownedAnimals: initialAnimals,
      ownedParts: initialParts,
      ownedSkills: initialSkills,
      ownedMaterials: initialMaterials,
      codex: [],
      lineup: initialAnimals.map(a => a.id),
      lineupConfig: {
        animals: initialAnimals.map((a, i) => ({
          animalId: a.id,
          position: (i === 0 ? 'front' : i === 1 ? 'mid' : 'back') as FormationPosition,
          targetStrategy: 'lowestHp' as TargetStrategy,
        })),
        actionPriority: 'speedFirst' as ActionPriority,
      },
      battleHistory: [],
      pityState: { ...DEFAULT_PITY_STATE },
      gachaRecords: [],
      limitedPool: { ...LIMITED_POOL },
      storyData: null,
      labData: {
        synthesisCount: 0,
        modificationCount: 0,
        experimentCount: 0,
        successCount: 0,
        failureCount: 0,
        recentLogs: [],
        unlockedRecipes: PART_SYNTHESIS_RECIPES.filter(r => r.targetRarity <= 3).map(r => r.id),
        unlockedExperiments: PROBABILITY_EXPERIMENTS.slice(0, 3).map(e => e.id),
      },
      isLoading: false,
      isNewPlayer: true,
      isInitialized: true,
    });

    get().saveGame(true);
  },

  loadSave: (): boolean => {
    const data = loadFromLocalStorage();
    if (!data) return false;

    const repairedAnimals = data.ownedAnimals.map(animal => {
      const parts = animal.parts.map(ep => {
        if (!getPartTemplate(ep.partId)) {
          const match = PART_TEMPLATES.find(t => t.slot === ep.slot && t.rarity <= 2);
          if (match) {
            console.warn(`[运行时修复] 动物 ${animal.name} 部件 ${ep.partId} 模板未找到，降级为 ${match.id}`);
            return { ...ep, partId: match.id, instanceId: ep.instanceId || generateId('part') };
          }
        }
        const template = getPartTemplate(ep.partId);
        return {
          ...ep,
          instanceId: ep.instanceId || generateId('part'),
          quality: ep.quality || 1 as PartQuality,
          setId: ep.setId || template?.setId,
        };
      });
      const skills = animal.skills.map(es => {
        if (!getSkillTemplate(es.skillId)) {
          const match = SKILL_TEMPLATES.find(t => t.type === 'attack' && t.rarity <= 2);
          if (match) {
            console.warn(`[运行时修复] 动物 ${animal.name} 技能 ${es.skillId} 模板未找到，降级为 ${match.id}`);
            return { ...es, skillId: match.id };
          }
        }
        return es;
      });
      let patched = { ...animal, parts, skills };
      if (patched.starLevel === undefined) {
        patched = { ...patched, starLevel: 1 as StarLevel };
      }
      if (patched.breakthroughTier === undefined) {
        patched = { ...patched, breakthroughTier: 0 as BreakthroughTier };
      }
      return patched;
    });

    const repairedParts = data.ownedParts.map(p => {
      const template = getPartTemplate(p.templateId);
      return {
        ...p,
        quality: p.quality || 1 as PartQuality,
        setId: p.setId || template?.setId,
      };
    });

    const pityState: PityState = data.pityState || { ...DEFAULT_PITY_STATE };
    if (!pityState.limited) {
      pityState.limited = { pullsSinceR4: 0, pullsSinceR5: 0, guaranteedFeatured: false };
    }

    set({
      player: data.player,
      ownedAnimals: repairedAnimals,
      ownedParts: repairedParts,
      ownedSkills: data.ownedSkills,
      ownedMaterials: data.ownedMaterials || [],
      codex: data.codex || [],
      lineup: data.lineup,
      lineupConfig: data.lineupConfig || {
        animals: data.lineup.map((id, i) => ({
          animalId: id,
          position: (i === 0 ? 'front' : i === 1 ? 'mid' : 'back') as FormationPosition,
          targetStrategy: 'lowestHp' as TargetStrategy,
        })),
        actionPriority: 'speedFirst' as ActionPriority,
      },
      battleHistory: data.battleHistory,
      pityState,
      gachaRecords: data.gachaRecords || [],
      limitedPool: data.limitedPool || { ...LIMITED_POOL },
      storyData: data.storyData || null,
      labData: data.labData || {
        synthesisCount: 0,
        modificationCount: 0,
        experimentCount: 0,
        successCount: 0,
        failureCount: 0,
        recentLogs: [],
        unlockedRecipes: PART_SYNTHESIS_RECIPES.filter(r => r.targetRarity <= 3).map(r => r.id),
        unlockedExperiments: PROBABILITY_EXPERIMENTS.slice(0, 3).map(e => e.id),
      },
      isLoading: false,
      isNewPlayer: false,
      isInitialized: true,
    });

    get().saveGame(true);
    return true;
  },

  saveGame: (force: boolean = false) => {
    const state = get();
    const saveData: SaveData = {
      version: 8,
      timestamp: Date.now(),
      player: state.player,
      ownedAnimals: state.ownedAnimals,
      ownedParts: state.ownedParts,
      ownedSkills: state.ownedSkills,
      ownedMaterials: state.ownedMaterials,
      codex: state.codex,
      lineup: state.lineup,
      lineupConfig: state.lineupConfig,
      battleHistory: state.battleHistory,
      pityState: state.pityState,
      gachaRecords: state.gachaRecords.slice(-200),
      limitedPool: state.limitedPool,
      storyData: state.storyData || undefined,
      labData: state.labData,
    };

    if (force) {
      saveToLocalStorage(saveData);
    } else {
      throttledSave(saveData);
    }
  },

  resetGame: () => {
    clearSave();
    set({
      player: {
        id: '',
        coins: 0,
        gems: 0,
        totalWins: 0,
        totalLosses: 0,
        highestWinStreak: 0,
        currentWinStreak: 0,
        totalBetAmount: 0,
        totalRewardAmount: 0,
      },
      ownedAnimals: [],
      ownedParts: [],
      ownedSkills: [],
      ownedMaterials: [],
      codex: [],
      lineup: [],
      lineupConfig: { animals: [], actionPriority: 'speedFirst' },
      battleHistory: [],
      pityState: { ...DEFAULT_PITY_STATE },
      gachaRecords: [],
      limitedPool: { ...LIMITED_POOL },
      storyData: null,
      labData: {
        synthesisCount: 0,
        modificationCount: 0,
        experimentCount: 0,
        successCount: 0,
        failureCount: 0,
        recentLogs: [],
        unlockedRecipes: [],
        unlockedExperiments: [],
      },
      isLoading: true,
      isNewPlayer: false,
      isInitialized: false,
    });
    get().initialize();
  },

  addAnimal: (animal: Animal) => {
    set(state => ({ ownedAnimals: [...state.ownedAnimals, animal] }));
    get().saveGame();
  },

  addPart: (part: Part) => {
    set(state => ({ ownedParts: [...state.ownedParts, part] }));
    get().saveGame();
  },

  addSkill: (skill: Skill) => {
    set(state => ({ ownedSkills: [...state.ownedSkills, skill] }));
    get().saveGame();
  },

  removePart: (id: string) => {
    set(state => ({ ownedParts: state.ownedParts.filter(p => p.id !== id) }));
    get().saveGame();
  },

  removeSkill: (id: string) => {
    set(state => ({ ownedSkills: state.ownedSkills.filter(s => s.id !== id) }));
    get().saveGame();
  },

  removeAnimal: (id: string) => {
    set(state => ({
      ownedAnimals: state.ownedAnimals.filter(a => a.id !== id),
      lineup: state.lineup.filter(lid => lid !== id),
    }));
    get().saveGame();
  },

  levelUpAnimal: (id: string): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === id);
    if (!animal) return false;

    const cost = animal.level * 100;
    if (state.player.coins < cost) return false;

    set(state => ({
      player: { ...state.player, coins: state.player.coins - cost },
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === id
          ? { ...a, level: a.level + 1, exp: 0, expToNext: (a.level + 1) * 100 }
          : a
      ),
    }));
    get().saveGame();
    return true;
  },

  addToLineup: (animalId: string): boolean => {
    const state = get();
    if (state.lineup.includes(animalId)) return false;
    if (state.lineup.length >= BATTLE_CONSTANTS.MAX_TEAM_SIZE) return false;
    if (!state.ownedAnimals.some(a => a.id === animalId)) return false;

    const positions: FormationPosition[] = ['front', 'mid', 'back'];
    const usedPositions = new Set(state.lineupConfig.animals.map(a => a.position));
    const nextPosition = positions.find(p => !usedPositions.has(p)) || 'back';

    set(state => ({
      lineup: [...state.lineup, animalId],
      lineupConfig: {
        ...state.lineupConfig,
        animals: [...state.lineupConfig.animals, {
          animalId,
          position: nextPosition,
          targetStrategy: 'lowestHp' as TargetStrategy,
        }],
      },
    }));
    get().saveGame();
    return true;
  },

  removeFromLineup: (animalId: string) => {
    set(state => ({
      lineup: state.lineup.filter(id => id !== animalId),
      lineupConfig: {
        ...state.lineupConfig,
        animals: state.lineupConfig.animals.filter(a => a.animalId !== animalId),
      },
    }));
    get().saveGame();
  },

  setFormationPosition: (animalId: string, position: FormationPosition) => {
    set(state => ({
      lineupConfig: {
        ...state.lineupConfig,
        animals: state.lineupConfig.animals.map(a =>
          a.animalId === animalId ? { ...a, position } : a
        ),
      },
    }));
    get().saveGame();
  },

  setTargetStrategy: (animalId: string, strategy: TargetStrategy) => {
    set(state => ({
      lineupConfig: {
        ...state.lineupConfig,
        animals: state.lineupConfig.animals.map(a =>
          a.animalId === animalId ? { ...a, targetStrategy: strategy } : a
        ),
      },
    }));
    get().saveGame();
  },

  setActionPriority: (priority: ActionPriority) => {
    set(state => ({
      lineupConfig: { ...state.lineupConfig, actionPriority: priority },
    }));
    get().saveGame();
  },

  getLineupConfig: () => {
    return get().lineupConfig;
  },

  equipPart: (animalId: string, partId: string, slot: PartSlot): boolean => {
    const state = get();
    const part = state.ownedParts.find(p => p.id === partId);
    if (!part || part.slot !== slot) return false;

    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal) return false;

    const existingIndex = animal.parts.findIndex(p => p.slot === slot);
    const newParts = [...animal.parts];
    let removedPart: EquippedPart | null = null;

    const equippedData: EquippedPart = {
      partId: part.templateId,
      instanceId: part.id,
      slot,
      quality: part.quality,
      setId: part.setId,
    };

    if (existingIndex >= 0) {
      removedPart = newParts[existingIndex];
      newParts[existingIndex] = equippedData;
    } else {
      newParts.push(equippedData);
    }

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId ? { ...a, parts: newParts } : a
      ),
      ownedParts: state.ownedParts.filter(p => p.id !== partId),
    }));

    if (removedPart) {
      const origPart = getPartTemplate(removedPart.partId);
      if (origPart) {
        const removedQuality = removedPart.quality || 1;
        set(state => ({
          ownedParts: [...state.ownedParts, { ...origPart, id: generateId('part'), templateId: origPart.id, quality: removedQuality, setId: origPart.setId || removedPart.setId }],
        }));
      }
    }

    get().saveGame();
    return true;
  },

  unequipPart: (animalId: string, slot: PartSlot) => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal) return;

    const equipped = animal.parts.find(p => p.slot === slot);
    if (!equipped) return;

    const origPart = getPartTemplate(equipped.partId);
    const equippedQuality = equipped.quality || 1;
    const equippedSetId = equipped.setId || origPart?.setId;

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? { ...a, parts: a.parts.filter(p => p.slot !== slot) }
          : a
      ),
    }));

    if (origPart) {
      set(state => ({
        ownedParts: [...state.ownedParts, { ...origPart, id: generateId('part'), templateId: origPart.id, quality: equippedQuality, setId: equippedSetId }],
      }));
    }

    get().saveGame();
  },

  refinePart: (partId: string): boolean => {
    const state = get();
    const part = state.ownedParts.find(p => p.id === partId);
    if (!part) return false;

    const currentQuality = part.quality;
    if (currentQuality >= 5) return false;

    const nextQuality = (currentQuality + 1) as PartQuality;
    const cost = QUALITY_REFINE_COST[nextQuality];
    if (!cost || cost <= 0) return false;
    if (state.player.coins < cost) return false;

    set(state => ({
      player: { ...state.player, coins: state.player.coins - cost },
      ownedParts: state.ownedParts.map(p =>
        p.id === partId ? { ...p, quality: nextQuality } : p
      ),
    }));

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a => ({
        ...a,
        parts: a.parts.map(ep =>
          ep.instanceId === partId
            ? { ...ep, quality: nextQuality }
            : ep
        ),
      })),
    }));

    get().saveGame();
    return true;
  },

  equipSkill: (animalId: string, skillId: string): boolean => {
    const state = get();
    const skill = state.ownedSkills.find(s => s.id === skillId);
    if (!skill) return false;

    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal) return false;
    const maxSkillSlots = getSkillSlotsForStar(animal.starLevel);
    if (animal.skills.length >= maxSkillSlots) return false;
    if (animal.skills.some(s => s.skillId === skill.templateId)) return false;

    const origTemplate = getSkillTemplate(skill.templateId);
    const modifications: EquippedSkill['modifications'] = {};
    let hasMod = false;
    if (origTemplate && skill.damage !== origTemplate.damage) {
      modifications.damageBonus = Math.round((skill.damage / origTemplate.damage - 1) * 100);
      hasMod = true;
    }
    if (origTemplate && skill.cooldown !== origTemplate.cooldown) {
      modifications.cooldownReduction = origTemplate.cooldown - skill.cooldown;
      hasMod = true;
    }
    if (skill.statusEffect && origTemplate && (!origTemplate.statusEffect || origTemplate.statusEffect.type !== skill.statusEffect.type)) {
      modifications.addStatusEffect = { ...skill.statusEffect };
      hasMod = true;
    } else if (skill.statusEffect && origTemplate?.statusEffect && skill.statusEffect.chance > origTemplate.statusEffect.chance) {
      modifications.statusEffectChanceBonus = skill.statusEffect.chance - origTemplate.statusEffect.chance;
      hasMod = true;
    }

    const equipped: EquippedSkill = {
      skillId: skill.templateId,
      level: 1,
      modifications: hasMod ? modifications : undefined,
    };

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? { ...a, skills: [...a.skills, equipped] }
          : a
      ),
      ownedSkills: state.ownedSkills.filter(s => s.id !== skillId),
    }));

    get().saveGame();
    return true;
  },

  unequipSkill: (animalId: string, index: number) => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal || !animal.skills[index]) return;

    const equipped = animal.skills[index];
    const origSkill = getSkillTemplate(equipped.skillId);

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? { ...a, skills: a.skills.filter((_, i) => i !== index) }
          : a
      ),
    }));

    if (origSkill) {
      const restored: Skill = {
        ...origSkill,
        id: generateId('skill'),
        templateId: origSkill.id,
      };
      if (equipped.modifications) {
        const mod = equipped.modifications;
        if (mod.damageBonus) {
          restored.damage = Math.floor(origSkill.damage * (1 + mod.damageBonus / 100));
        }
        if (mod.cooldownReduction) {
          restored.cooldown = Math.max(1, origSkill.cooldown - mod.cooldownReduction);
        }
        if (mod.addStatusEffect) {
          restored.statusEffect = { ...mod.addStatusEffect };
        } else if (mod.statusEffectChanceBonus && restored.statusEffect) {
          restored.statusEffect = {
            ...restored.statusEffect,
            chance: Math.min(100, restored.statusEffect.chance + mod.statusEffectChanceBonus),
          };
        }
      }
      set(state => ({
        ownedSkills: [...state.ownedSkills, restored],
      }));
    }

    get().saveGame();
  },

  upgradeSkill: (animalId: string, skillIndex: number): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal) return false;
    if (skillIndex < 0 || skillIndex >= animal.skills.length) return false;

    const equipped = animal.skills[skillIndex];
    const skillLevelCap = getSkillLevelCapForBreakthrough(animal.breakthroughTier);
    if (equipped.level >= skillLevelCap) return false;

    const cost = equipped.level * 50;
    if (state.player.coins < cost) return false;

    set(state => ({
      player: { ...state.player, coins: state.player.coins - cost },
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? {
              ...a,
              skills: a.skills.map((s, i) =>
                i === skillIndex ? { ...s, level: s.level + 1 } : s
              ),
            }
          : a
      ),
    }));
    get().saveGame();
    return true;
  },

  chooseBranch: (animalId: string, skillIndex: number, branchId: string): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal) return false;
    if (skillIndex < 0 || skillIndex >= animal.skills.length) return false;

    const equipped = animal.skills[skillIndex];
    const template = getSkillTemplate(equipped.skillId);
    if (!template || !template.branches) return false;

    const branch = template.branches.find(b => b.id === branchId);
    if (!branch) return false;

    if (equipped.level < branch.requiredLevel) return false;

    const cost = branch.requiredLevel * 100;
    if (state.player.coins < cost) return false;

    set(state => ({
      player: { ...state.player, coins: state.player.coins - cost },
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? {
              ...a,
              skills: a.skills.map((s, i) =>
                i === skillIndex ? { ...s, branchId } : s
              ),
            }
          : a
      ),
    }));
    get().saveGame();
    return true;
  },

  addCoins: (amount: number) => {
    set(state => ({
      player: { ...state.player, coins: state.player.coins + amount },
    }));
    get().saveGame();
  },

  spendCoins: (amount: number): boolean => {
    const state = get();
    if (state.player.coins < amount) return false;

    set(state => ({
      player: { ...state.player, coins: state.player.coins - amount },
    }));
    get().saveGame();
    return true;
  },

  addGems: (amount: number) => {
    set(state => ({
      player: { ...state.player, gems: state.player.gems + amount },
    }));
    get().saveGame();
  },

  spendGems: (amount: number): boolean => {
    const state = get();
    if (state.player.gems < amount) return false;

    set(state => ({
      player: { ...state.player, gems: state.player.gems - amount },
    }));
    get().saveGame();
    return true;
  },

  gachaAnimal: () => {
    const state = get();
    if (state.player.coins < GACHA_COSTS.animal) {
      throw new Error('Not enough coins');
    }

    const pity = state.pityState.animal;
    const rolledRarity = rollRarityWithPity(GACHA_RATES.animal, pity.pullsSinceR4, pity.pullsSinceR5);
    const { template, actualRarity } = pickAnimalTemplate(rolledRarity);
    const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.hardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.hardPityR5 - 1);
    const animal = createAnimalFromTemplate(template.id, actualRarity);
    const isNew = !state.ownedAnimals.some(a => a.templateId === template.id);

    const gachaRecord = recordGacha('animal', 'animal', template.id, template.name, template.emoji, actualRarity, isNew);

    const newPity = {
      pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
      pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
    };

    set(state => ({
      player: { ...state.player, coins: state.player.coins - GACHA_COSTS.animal },
      ownedAnimals: [...state.ownedAnimals, animal],
      pityState: { ...state.pityState, animal: newPity },
      gachaRecords: [...state.gachaRecords, gachaRecord],
    }));
    get().saveGame();
    return { animal, isNew, isPity };
  },

  gachaPart: () => {
    const state = get();
    if (state.player.coins < GACHA_COSTS.part) {
      throw new Error('Not enough coins');
    }

    const pity = state.pityState.part;
    const rolledRarity = rollRarityWithPity(GACHA_RATES.part, pity.pullsSinceR4, pity.pullsSinceR5);
    const { template, actualRarity } = pickPartTemplate(rolledRarity);
    const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.hardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.hardPityR5 - 1);
    const part: Part = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
    const isNew = !state.ownedParts.some(p => p.templateId === template.id);

    const gachaRecord = recordGacha('part', 'part', template.id, template.name, template.emoji, actualRarity, isNew);

    const newPity = {
      pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
      pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
    };

    set(state => ({
      player: { ...state.player, coins: state.player.coins - GACHA_COSTS.part },
      ownedParts: [...state.ownedParts, part],
      pityState: { ...state.pityState, part: newPity },
      gachaRecords: [...state.gachaRecords, gachaRecord],
    }));
    get().saveGame();
    return { part, isNew, isPity };
  },

  gachaSkill: () => {
    const state = get();
    if (state.player.coins < GACHA_COSTS.skill) {
      throw new Error('Not enough coins');
    }

    const pity = state.pityState.skill;
    const rolledRarity = rollRarityWithPity(GACHA_RATES.skill, pity.pullsSinceR4, pity.pullsSinceR5);
    const { template, actualRarity } = pickSkillTemplate(rolledRarity);
    const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.hardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.hardPityR5 - 1);
    const skill: Skill = { ...template, id: generateId('skill'), templateId: template.id };
    const isNew = !state.ownedSkills.some(s => s.templateId === template.id);

    const gachaRecord = recordGacha('skill', 'skill', template.id, template.name, template.emoji, actualRarity, isNew);

    const newPity = {
      pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
      pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
    };

    set(state => ({
      player: { ...state.player, coins: state.player.coins - GACHA_COSTS.skill },
      ownedSkills: [...state.ownedSkills, skill],
      pityState: { ...state.pityState, skill: newPity },
      gachaRecords: [...state.gachaRecords, gachaRecord],
    }));
    get().saveGame();
    return { skill, isNew, isPity };
  },

  gachaLimited: () => {
    const state = get();
    if (state.player.gems < GACHA_COSTS.limited) {
      throw new Error('Not enough gems');
    }

    if (state.limitedPool.endsAt && Date.now() > state.limitedPool.endsAt) {
      throw new Error('Limited pool has ended');
    }

    const pity = state.pityState.limited;
    const rolledRarity = rollRarityWithPity(GACHA_RATES.limited, pity.pullsSinceR4, pity.pullsSinceR5, true);

    const lp = state.limitedPool;
    const isFeaturedR5 = rolledRarity === 5 && (pity.guaranteedFeatured || Math.random() * 100 < PITY_CONFIG.featuredR5Rate);
    const isFeaturedR4 = rolledRarity === 4 && Math.random() * 100 < PITY_CONFIG.featuredR4Rate;
    const isFeatured = isFeaturedR5 || isFeaturedR4;

    let itemType: 'animal' | 'part' | 'skill';
    let item: Animal | Part | Skill;
    let templateId: string;
    let itemName: string;
    let itemEmoji: string;
    let actualRarity: Rarity;

    if (isFeaturedR5 || isFeaturedR4) {
      const allFeatured = [
        ...lp.featuredAnimalTemplateIds.map(id => ({ type: 'animal' as const, id })),
        ...lp.featuredPartTemplateIds.map(id => ({ type: 'part' as const, id })),
        ...lp.featuredSkillTemplateIds.map(id => ({ type: 'skill' as const, id })),
      ].filter(fi => {
        if (fi.type === 'animal') { const t = getAnimalTemplate(fi.id); return t && t.rarity <= rolledRarity; }
        if (fi.type === 'part') { const t = getPartTemplate(fi.id); return t && t.rarity <= rolledRarity; }
        const t = getSkillTemplate(fi.id); return t && t.rarity <= rolledRarity;
      });

      if (allFeatured.length > 0) {
        const chosen = pickRandom(allFeatured);
        itemType = chosen.type;
        templateId = chosen.id;

        if (itemType === 'animal') {
          const template = getAnimalTemplate(templateId)!;
          actualRarity = template.rarity;
          item = createAnimalFromTemplate(templateId, actualRarity);
          itemName = template.name;
          itemEmoji = template.emoji;
        } else if (itemType === 'part') {
          const template = getPartTemplate(templateId)!;
          actualRarity = template.rarity;
          item = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
          itemName = template.name;
          itemEmoji = template.emoji;
        } else {
          const template = getSkillTemplate(templateId)!;
          actualRarity = template.rarity;
          item = { ...template, id: generateId('skill'), templateId: template.id };
          itemName = template.name;
          itemEmoji = template.emoji;
        }
      } else {
        const roll = Math.random();
        if (roll < 0.34) {
          itemType = 'animal';
          const { template, actualRarity: aR } = pickAnimalTemplate(rolledRarity);
          actualRarity = aR;
          templateId = template.id;
          item = createAnimalFromTemplate(templateId, actualRarity);
          itemName = template.name;
          itemEmoji = template.emoji;
        } else if (roll < 0.67) {
          itemType = 'part';
          const { template, actualRarity: aR } = pickPartTemplate(rolledRarity);
          actualRarity = aR;
          templateId = template.id;
          item = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
          itemName = template.name;
          itemEmoji = template.emoji;
        } else {
          itemType = 'skill';
          const { template, actualRarity: aR } = pickSkillTemplate(rolledRarity);
          actualRarity = aR;
          templateId = template.id;
          item = { ...template, id: generateId('skill'), templateId: template.id };
          itemName = template.name;
          itemEmoji = template.emoji;
        }
      }
    } else {
      const roll = Math.random();
      if (roll < 0.34) {
        itemType = 'animal';
        const { template, actualRarity: aR } = pickAnimalTemplate(rolledRarity);
        actualRarity = aR;
        templateId = template.id;
        item = createAnimalFromTemplate(templateId, actualRarity);
        itemName = template.name;
        itemEmoji = template.emoji;
      } else if (roll < 0.67) {
        itemType = 'part';
        const { template, actualRarity: aR } = pickPartTemplate(rolledRarity);
        actualRarity = aR;
        templateId = template.id;
        item = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
        itemName = template.name;
        itemEmoji = template.emoji;
      } else {
        itemType = 'skill';
        const { template, actualRarity: aR } = pickSkillTemplate(rolledRarity);
        actualRarity = aR;
        templateId = template.id;
        item = { ...template, id: generateId('skill'), templateId: template.id };
        itemName = template.name;
        itemEmoji = template.emoji;
      }
    }

    const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.limitedHardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.limitedHardPityR5 - 1);
    const isNew = itemType === 'animal'
      ? !state.ownedAnimals.some(a => a.templateId === templateId)
      : itemType === 'part'
        ? !state.ownedParts.some(p => p.templateId === templateId)
        : !state.ownedSkills.some(s => s.templateId === templateId);

    const gachaRecord = recordGacha('limited', itemType, templateId, itemName, itemEmoji, actualRarity, isNew);

    let newGuaranteedFeatured = pity.guaranteedFeatured;
    if (rolledRarity === 5) {
      newGuaranteedFeatured = !isFeaturedR5;
    }

    const newLimitedPity = {
      pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
      pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
      guaranteedFeatured: newGuaranteedFeatured,
    };

    const stateUpdates: Record<string, unknown> = {
      player: { ...state.player, gems: state.player.gems - GACHA_COSTS.limited },
      pityState: { ...state.pityState, limited: newLimitedPity },
      gachaRecords: [...state.gachaRecords, gachaRecord],
    };

    if (itemType === 'animal') {
      stateUpdates.ownedAnimals = [...state.ownedAnimals, item as Animal];
    } else if (itemType === 'part') {
      stateUpdates.ownedParts = [...state.ownedParts, item as Part];
    } else {
      stateUpdates.ownedSkills = [...state.ownedSkills, item as Skill];
    }

    set(stateUpdates as Partial<GameState>);
    get().saveGame();
    return { item, itemType, isNew, isPity, isFeatured };
  },

  gachaMulti: (poolType: GachaPoolType, count: number) => {
    const state = get();
    if (poolType === 'limited' && state.limitedPool.endsAt && Date.now() > state.limitedPool.endsAt) {
      return { results: [] as GachaMultiResult[], totalCost: 0 };
    }
    const costPer = poolType === 'limited' ? GACHA_COSTS.limited : GACHA_COSTS[poolType];
    const currency = poolType === 'limited' ? 'gems' as const : 'coins' as const;
    const totalCost = costPer * count;

    if (state.player[currency] < totalCost) {
      return { results: [] as GachaMultiResult[], totalCost: 0 };
    }

    set(s => ({
      player: { ...s.player, [currency]: s.player[currency] - totalCost },
    }));

    const results: GachaMultiResult[] = [];
    const newAnimals: Animal[] = [];
    const newParts: Part[] = [];
    const newSkills: Skill[] = [];
    const newRecords: GachaRecord[] = [];
    let pityState = { ...get().pityState };

    for (let i = 0; i < count; i++) {
      const currentState = get();
      let result: GachaMultiResult;

      switch (poolType) {
        case 'animal': {
          const pity = pityState.animal;
          const rolledRarity = rollRarityWithPity(GACHA_RATES.animal, pity.pullsSinceR4, pity.pullsSinceR5);
          const { template, actualRarity } = pickAnimalTemplate(rolledRarity);
          const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.hardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.hardPityR5 - 1);
          const animal = createAnimalFromTemplate(template.id, actualRarity);
          const isNew = !currentState.ownedAnimals.some(a => a.templateId === template.id) && !newAnimals.some(a => a.templateId === template.id);
          newAnimals.push(animal);
          newRecords.push(recordGacha('animal', 'animal', template.id, template.name, template.emoji, actualRarity, isNew));
          pityState = {
            ...pityState,
            animal: {
              pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
              pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
            },
          };
          result = { item: animal, itemType: 'animal', isNew, isPity, isFeatured: false };
          break;
        }
        case 'part': {
          const pity = pityState.part;
          const rolledRarity = rollRarityWithPity(GACHA_RATES.part, pity.pullsSinceR4, pity.pullsSinceR5);
          const { template, actualRarity } = pickPartTemplate(rolledRarity);
          const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.hardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.hardPityR5 - 1);
          const part: Part = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
          const isNew = !currentState.ownedParts.some(p => p.templateId === template.id) && !newParts.some(p => p.templateId === template.id);
          newParts.push(part);
          newRecords.push(recordGacha('part', 'part', template.id, template.name, template.emoji, actualRarity, isNew));
          pityState = {
            ...pityState,
            part: {
              pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
              pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
            },
          };
          result = { item: part, itemType: 'part', isNew, isPity, isFeatured: false };
          break;
        }
        case 'skill': {
          const pity = pityState.skill;
          const rolledRarity = rollRarityWithPity(GACHA_RATES.skill, pity.pullsSinceR4, pity.pullsSinceR5);
          const { template, actualRarity } = pickSkillTemplate(rolledRarity);
          const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.hardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.hardPityR5 - 1);
          const skill: Skill = { ...template, id: generateId('skill'), templateId: template.id };
          const isNew = !currentState.ownedSkills.some(s => s.templateId === template.id) && !newSkills.some(s => s.templateId === template.id);
          newSkills.push(skill);
          newRecords.push(recordGacha('skill', 'skill', template.id, template.name, template.emoji, actualRarity, isNew));
          pityState = {
            ...pityState,
            skill: {
              pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
              pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
            },
          };
          result = { item: skill, itemType: 'skill', isNew, isPity, isFeatured: false };
          break;
        }
        case 'limited': {
          const pity = pityState.limited;
          const rolledRarity = rollRarityWithPity(GACHA_RATES.limited, pity.pullsSinceR4, pity.pullsSinceR5, true);

          const lp = currentState.limitedPool;
          const isFeaturedR5 = rolledRarity === 5 && (pity.guaranteedFeatured || Math.random() * 100 < PITY_CONFIG.featuredR5Rate);
          const isFeaturedR4 = rolledRarity === 4 && Math.random() * 100 < PITY_CONFIG.featuredR4Rate;
          const isFeatured = isFeaturedR5 || isFeaturedR4;

          let itemType: 'animal' | 'part' | 'skill';
          let item: Animal | Part | Skill;
          let templateId: string;
          let itemName: string;
          let itemEmoji: string;
          let actualRarity: Rarity;

          if (isFeaturedR5 || isFeaturedR4) {
            const allFeatured = [
              ...lp.featuredAnimalTemplateIds.map(id => ({ type: 'animal' as const, id })),
              ...lp.featuredPartTemplateIds.map(id => ({ type: 'part' as const, id })),
              ...lp.featuredSkillTemplateIds.map(id => ({ type: 'skill' as const, id })),
            ].filter(fi => {
              if (fi.type === 'animal') { const t = getAnimalTemplate(fi.id); return t && t.rarity <= rolledRarity; }
              if (fi.type === 'part') { const t = getPartTemplate(fi.id); return t && t.rarity <= rolledRarity; }
              const t = getSkillTemplate(fi.id); return t && t.rarity <= rolledRarity;
            });
            if (allFeatured.length > 0) {
              const chosen = pickRandom(allFeatured);
              itemType = chosen.type;
              templateId = chosen.id;
              if (itemType === 'animal') {
                const template = getAnimalTemplate(templateId)!;
                actualRarity = template.rarity;
                item = createAnimalFromTemplate(templateId, actualRarity);
                itemName = template.name; itemEmoji = template.emoji;
              } else if (itemType === 'part') {
                const template = getPartTemplate(templateId)!;
                actualRarity = template.rarity;
                item = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
                itemName = template.name; itemEmoji = template.emoji;
              } else {
                const template = getSkillTemplate(templateId)!;
                actualRarity = template.rarity;
                item = { ...template, id: generateId('skill'), templateId: template.id };
                itemName = template.name; itemEmoji = template.emoji;
              }
            } else {
              const roll = Math.random();
              if (roll < 0.34) {
                itemType = 'animal';
                const { template, actualRarity: aR } = pickAnimalTemplate(rolledRarity);
                actualRarity = aR; templateId = template.id;
                item = createAnimalFromTemplate(templateId, actualRarity);
                itemName = template.name; itemEmoji = template.emoji;
              } else if (roll < 0.67) {
                itemType = 'part';
                const { template, actualRarity: aR } = pickPartTemplate(rolledRarity);
                actualRarity = aR; templateId = template.id;
                item = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
                itemName = template.name; itemEmoji = template.emoji;
              } else {
                itemType = 'skill';
                const { template, actualRarity: aR } = pickSkillTemplate(rolledRarity);
                actualRarity = aR; templateId = template.id;
                item = { ...template, id: generateId('skill'), templateId: template.id };
                itemName = template.name; itemEmoji = template.emoji;
              }
            }
          } else {
            const roll = Math.random();
            if (roll < 0.34) {
              itemType = 'animal';
              const { template, actualRarity: aR } = pickAnimalTemplate(rolledRarity);
              actualRarity = aR; templateId = template.id;
              item = createAnimalFromTemplate(templateId, actualRarity);
              itemName = template.name; itemEmoji = template.emoji;
            } else if (roll < 0.67) {
              itemType = 'part';
              const { template, actualRarity: aR } = pickPartTemplate(rolledRarity);
              actualRarity = aR; templateId = template.id;
              item = { ...template, id: generateId('part'), templateId: template.id, quality: rollPartQuality(actualRarity), setId: template.setId };
              itemName = template.name; itemEmoji = template.emoji;
            } else {
              itemType = 'skill';
              const { template, actualRarity: aR } = pickSkillTemplate(rolledRarity);
              actualRarity = aR; templateId = template.id;
              item = { ...template, id: generateId('skill'), templateId: template.id };
              itemName = template.name; itemEmoji = template.emoji;
            }
          }

          const isPity = actualRarity >= 4 && (pity.pullsSinceR4 >= PITY_CONFIG.limitedHardPityR4 - 1 || pity.pullsSinceR5 >= PITY_CONFIG.limitedHardPityR5 - 1);
          const isNew = itemType === 'animal'
            ? !currentState.ownedAnimals.some(a => a.templateId === templateId) && !newAnimals.some(a => a.templateId === templateId)
            : itemType === 'part'
              ? !currentState.ownedParts.some(p => p.templateId === templateId) && !newParts.some(p => p.templateId === templateId)
              : !currentState.ownedSkills.some(s => s.templateId === templateId) && !newSkills.some(s => s.templateId === templateId);

          if (itemType === 'animal') newAnimals.push(item as Animal);
          else if (itemType === 'part') newParts.push(item as Part);
          else newSkills.push(item as Skill);

          newRecords.push(recordGacha('limited', itemType, templateId, itemName, itemEmoji, actualRarity, isNew));

          let newGuaranteedFeatured = pity.guaranteedFeatured;
          if (rolledRarity === 5) {
            newGuaranteedFeatured = !isFeaturedR5;
          }
          pityState = {
            ...pityState,
            limited: {
              pullsSinceR4: rolledRarity >= 4 ? 0 : pity.pullsSinceR4 + 1,
              pullsSinceR5: rolledRarity >= 5 ? 0 : pity.pullsSinceR5 + 1,
              guaranteedFeatured: newGuaranteedFeatured,
            },
          };
          result = { item, itemType, isNew, isPity, isFeatured };
          break;
        }
        default:
          continue;
      }

      results.push(result);
    }

    set(s => ({
      ownedAnimals: [...s.ownedAnimals, ...newAnimals],
      ownedParts: [...s.ownedParts, ...newParts],
      ownedSkills: [...s.ownedSkills, ...newSkills],
      pityState,
      gachaRecords: [...s.gachaRecords, ...newRecords],
    }));

    get().saveGame(true);
    return { results, totalCost };
  },

  startBattle: (betAmount: number) => {
    const state = get();
    const lineupAnimals = state.lineup
      .map(id => state.ownedAnimals.find(a => a.id === id))
      .filter(Boolean) as Animal[];

    if (lineupAnimals.length === 0) return { success: false };
    if (lineupAnimals.length > BATTLE_CONSTANTS.MAX_TEAM_SIZE) return { success: false };
    if (state.player.coins < betAmount) return { success: false };

    set(prev => ({
      player: {
        ...prev.player,
        coins: prev.player.coins - betAmount,
        totalBetAmount: prev.player.totalBetAmount + betAmount,
      },
    }));

    const strengthScore = computePlayerStrengthScore(lineupAnimals);
    const avgLevel = Math.floor(lineupAnimals.reduce((s, a) => s + a.level, 0) / lineupAnimals.length);

    const currentSig = computeLineupSignature(state.lineup);
    const recentSigs = [
      currentSig,
      ...state.battleHistory.slice(0, 9).map(r => computeLineupSignature(r.playerLineup)),
    ];

    const dynamicContext = calculateDynamicDifficulty(
      strengthScore,
      avgLevel,
      state.player.currentWinStreak,
      recentSigs,
    );

    const seasonStore = useSeasonStore.getState();
    if (!seasonStore.lastMatchmaking) {
      seasonStore.startMatchmaking();
    }
    const matchmaking = seasonStore.lastMatchmaking!;

    const { difficultyOffset, opponentDifficulty } = getMatchmakingDifficultyModifier(matchmaking);
    dynamicContext.difficultyMultiplier = Math.round((dynamicContext.difficultyMultiplier + difficultyOffset) * 100) / 100;
    dynamicContext.rewardMultiplier = Math.round((dynamicContext.rewardMultiplier + difficultyOffset * 0.5) * 100) / 100;

    if (dynamicContext.difficultyMultiplier >= 1.5) {
      dynamicContext.difficultyTier = 'nightmare';
    } else if (dynamicContext.difficultyMultiplier >= 1.3) {
      dynamicContext.difficultyTier = 'extreme';
    } else if (dynamicContext.difficultyMultiplier >= 1.1) {
      dynamicContext.difficultyTier = 'hard';
    }

    const result = simulateFullBattle(lineupAnimals, betAmount, state.lineupConfig, dynamicContext, opponentDifficulty);

    const battleRecord: BattleRecord = {
      id: generateBattleId(),
      timestamp: Date.now(),
      isWin: result.isWin,
      betAmount,
      reward: result.reward,
      opponentName: result.opponentName,
      opponentAvatar: result.opponentAvatar,
      playerLineup: state.lineup,
      enemyLineup: result.enemyUnits.map(u => u.animalId),
      battleLog: result.battleLog,
      playerUnits: result.playerUnits,
      enemyUnits: result.enemyUnits,
      initialPlayerUnits: result.initialPlayerUnits,
      initialEnemyUnits: result.initialEnemyUnits,
      matchmaking,
    };

    set(prev => ({
      player: {
        ...prev.player,
        coins: prev.player.coins + result.reward,
        totalWins: prev.player.totalWins + (result.isWin ? 1 : 0),
        totalLosses: prev.player.totalLosses + (result.isWin ? 0 : 1),
        currentWinStreak: result.isWin ? prev.player.currentWinStreak + 1 : 0,
        highestWinStreak: result.isWin
          ? Math.max(prev.player.highestWinStreak, prev.player.currentWinStreak + 1)
          : prev.player.highestWinStreak,
        totalRewardAmount: prev.player.totalRewardAmount + result.reward,
      },
      battleHistory: [battleRecord, ...prev.battleHistory].slice(0, 50),
    }));

    const dropConfig = result.isWin ? BATTLE_MATERIAL_DROPS.win : BATTLE_MATERIAL_DROPS.lose;
    const droppedMaterials: { templateId: string; count: number }[] = [];

    if (Math.random() * 100 < dropConfig.starMaterialChance) {
      const count = Math.floor(Math.random() * (dropConfig.starMaterialCount.max - dropConfig.starMaterialCount.min + 1)) + dropConfig.starMaterialCount.min;
      const starMats = MATERIAL_TEMPLATES.filter(m => m.type === 'star' && m.rarity <= 3);
      if (starMats.length > 0) {
        const chosen = starMats[Math.floor(Math.random() * starMats.length)];
        droppedMaterials.push({ templateId: chosen.id, count });
      }
    }

    if (Math.random() * 100 < dropConfig.btMaterialChance && lineupAnimals.length > 0) {
      const count = Math.floor(Math.random() * (dropConfig.btMaterialCount.max - dropConfig.btMaterialCount.min + 1)) + dropConfig.starMaterialCount.min;
      const elements = lineupAnimals.map(a => {
        const t = getAnimalTemplate(a.templateId);
        return t?.element;
      }).filter(Boolean);
      if (elements.length > 0) {
        const chosenElement = elements[Math.floor(Math.random() * elements.length)]!;
        const btMats = MATERIAL_TEMPLATES.filter(m => m.type === 'breakthrough' && m.element === chosenElement && m.rarity <= 2);
        if (btMats.length > 0) {
          const chosen = btMats[Math.floor(Math.random() * btMats.length)];
          droppedMaterials.push({ templateId: chosen.id, count });
        }
      }
    }

    if (droppedMaterials.length > 0) {
      get().addMaterials(droppedMaterials);
    }

    const newWinStreak = result.isWin ? state.player.currentWinStreak + 1 : 0;
    seasonStore.processBattleResult(result.isWin, newWinStreak, dynamicContext.difficultyTier, result.opponentName, result.opponentAvatar);
    seasonStore.checkSeasonReset();

    const rankChange = seasonStore.lastRankChange;

    get().saveGame(true);

    return {
      success: true,
      battleRecord,
      isWin: result.isWin,
      reward: result.reward,
      effectiveDifficulty: result.effectiveDifficulty,
      rewardMultiplier: result.rewardMultiplier,
      rankChange,
    };
  },

  getAnimalById: (id: string) => {
    return get().ownedAnimals.find(a => a.id === id);
  },

  getLineupAnimals: () => {
    const state = get();
    return state.lineup
      .map(id => state.ownedAnimals.find(a => a.id === id))
      .filter(Boolean) as Animal[];
  },

  canStarUp: (id: string): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === id);
    if (!animal) return false;

    const cost = getStarUpCost(animal.starLevel);
    if (!cost) return false;
    if (animal.level < cost.requiredLevel) return false;
    if (state.player.coins < cost.coins) return false;

    for (const mat of cost.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    return true;
  },

  canBreakthrough: (id: string): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === id);
    if (!animal) return false;

    const template = getAnimalTemplate(animal.templateId);
    if (!template) return false;

    const cost = getBreakthroughCost(animal.breakthroughTier, template.element);
    if (!cost) return false;
    if (animal.level < cost.requiredLevel) return false;
    if (animal.starLevel < cost.requiredStarLevel) return false;
    if (state.player.coins < cost.coins) return false;

    for (const mat of cost.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    return true;
  },

  starUpAnimal: (id: string): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === id);
    if (!animal) return false;

    const cost = getStarUpCost(animal.starLevel);
    if (!cost) return false;
    if (animal.level < cost.requiredLevel) return false;
    if (state.player.coins < cost.coins) return false;

    for (const mat of cost.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    const newStarLevel = (animal.starLevel + 1) as StarLevel;
    const newSkillSlots = getSkillSlotsForStar(newStarLevel);

    let materialsToRemove: string[] = [];
    for (const mat of cost.materials) {
      const matching = state.ownedMaterials
        .filter(m => m.templateId === mat.templateId)
        .slice(0, mat.count);
      materialsToRemove = materialsToRemove.concat(matching.map(m => m.id));
    }

    set(state => ({
      player: { ...state.player, coins: state.player.coins - cost.coins },
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === id
          ? { ...a, starLevel: newStarLevel, skills: a.skills.slice(0, newSkillSlots) }
          : a
      ),
      ownedMaterials: state.ownedMaterials.filter(m => !materialsToRemove.includes(m.id)),
    }));

    get().updateCodex(animal.templateId);
    get().saveGame();
    return true;
  },

  breakthroughAnimal: (id: string): boolean => {
    const state = get();
    const animal = state.ownedAnimals.find(a => a.id === id);
    if (!animal) return false;

    const template = getAnimalTemplate(animal.templateId);
    if (!template) return false;

    const cost = getBreakthroughCost(animal.breakthroughTier, template.element);
    if (!cost) return false;
    if (animal.level < cost.requiredLevel) return false;
    if (animal.starLevel < cost.requiredStarLevel) return false;
    if (state.player.coins < cost.coins) return false;

    for (const mat of cost.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    const newTier = (animal.breakthroughTier + 1) as BreakthroughTier;
    const newSkillLevelCap = getSkillLevelCapForBreakthrough(newTier);

    let materialsToRemove: string[] = [];
    for (const mat of cost.materials) {
      const matching = state.ownedMaterials
        .filter(m => m.templateId === mat.templateId)
        .slice(0, mat.count);
      materialsToRemove = materialsToRemove.concat(matching.map(m => m.id));
    }

    set(state => ({
      player: { ...state.player, coins: state.player.coins - cost.coins },
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === id
          ? {
              ...a,
              breakthroughTier: newTier,
              skills: a.skills.map(s => ({
                ...s,
                level: Math.min(s.level, newSkillLevelCap),
              })),
            }
          : a
      ),
      ownedMaterials: state.ownedMaterials.filter(m => !materialsToRemove.includes(m.id)),
    }));

    get().updateCodex(animal.templateId);
    get().saveGame();
    return true;
  },

  addMaterials: (materials: { templateId: string; count: number }[]) => {
    const newMaterials: Material[] = [];
    for (const mat of materials) {
      const template = getMaterialTemplate(mat.templateId);
      if (!template) continue;
      for (let i = 0; i < mat.count; i++) {
        newMaterials.push({
          id: generateId('mat'),
          templateId: template.id,
          name: template.name,
          description: template.description,
          emoji: template.emoji,
          rarity: template.rarity,
          type: template.type,
          element: template.element,
        });
      }
    }

    set(state => ({
      ownedMaterials: [...state.ownedMaterials, ...newMaterials],
    }));
    get().saveGame();
  },

  getMaterialCount: (templateId: string): number => {
    return get().ownedMaterials.filter(m => m.templateId === templateId).length;
  },

  updateCodex: (templateId: string) => {
    const state = get();
    const animals = state.ownedAnimals.filter(a => a.templateId === templateId);
    if (animals.length === 0) return;

    const highestStar = animals.reduce((max, a) => Math.max(max, a.starLevel), 1) as StarLevel;
    const highestBt = animals.reduce((max, a) => Math.max(max, a.breakthroughTier), 0) as BreakthroughTier;

    set(state => {
      const existing = state.codex.find(c => c.templateId === templateId);
      if (existing) {
        if (highestStar <= existing.highestStarLevel && highestBt <= existing.highestBreakthroughTier) {
          return {};
        }
        return {
          codex: state.codex.map(c =>
            c.templateId === templateId
              ? {
                  ...c,
                  highestStarLevel: Math.max(c.highestStarLevel, highestStar) as StarLevel,
                  highestBreakthroughTier: Math.max(c.highestBreakthroughTier, highestBt) as BreakthroughTier,
                  isUnlocked: true,
                }
              : c
          ),
        };
      }
      return {
        codex: [
          ...state.codex,
          {
            templateId,
            highestStarLevel: highestStar,
            highestBreakthroughTier: highestBt,
            isUnlocked: true,
          },
        ],
      };
    });
    get().saveGame();
  },

  canSynthesize: (recipeId: string): boolean => {
    const state = get();
    const recipe = getPartSynthesisRecipe(recipeId);
    if (!recipe) return false;

    if (state.player.coins < recipe.coinCost) return false;

    for (const mat of recipe.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    return true;
  },

  synthesizePart: (recipeId: string) => {
    const state = get();
    const recipe = getPartSynthesisRecipe(recipeId);
    if (!recipe) return { success: false };
    if (!state.canSynthesize(recipeId)) return { success: false };

    const template = getPartTemplate(recipe.targetPartTemplateId);
    if (!template) return { success: false };

    let materialsToRemove: string[] = [];
    for (const mat of recipe.materials) {
      const matching = state.ownedMaterials
        .filter(m => m.templateId === mat.templateId)
        .slice(0, mat.count);
      materialsToRemove = materialsToRemove.concat(matching.map(m => m.id));
    }

    const success = Math.random() * 100 < recipe.successRate;

    let returnedMaterials: { templateId: string; count: number }[] = [];
    if (!success && recipe.failureReturnRate > 0) {
      for (const mat of recipe.materials) {
        const returnCount = Math.floor(mat.count * recipe.failureReturnRate / 100);
        if (returnCount > 0) {
          returnedMaterials.push({ templateId: mat.templateId, count: returnCount });
        }
      }
    }

    let newPart: Part | undefined;
    if (success) {
      newPart = {
        ...template,
        id: generateId('part'),
        templateId: template.id,
        quality: rollPartQuality(recipe.targetRarity),
        setId: template.setId,
      };
    }

    const newMaterials: Material[] = [];
    for (const rm of returnedMaterials) {
      const matTemplate = getMaterialTemplate(rm.templateId);
      if (matTemplate) {
        for (let i = 0; i < rm.count; i++) {
          newMaterials.push({
            id: generateId('mat'),
            templateId: matTemplate.id,
            name: matTemplate.name,
            description: matTemplate.description,
            emoji: matTemplate.emoji,
            rarity: matTemplate.rarity,
            type: matTemplate.type,
            element: matTemplate.element,
          });
        }
      }
    }

    const logEntry: LabLogEntry = {
      id: generateId('log'),
      timestamp: Date.now(),
      type: 'synthesis',
      success,
      description: success
        ? `成功合成 ${template.name}`
        : `合成 ${template.name} 失败，返还部分材料`,
      rewards: success
        ? [{ type: 'part', name: template.name, emoji: template.emoji, rarity: recipe.targetRarity }]
        : undefined,
    };

    set(state => ({
      player: { ...state.player, coins: state.player.coins - recipe.coinCost },
      ownedMaterials: [
        ...state.ownedMaterials.filter(m => !materialsToRemove.includes(m.id)),
        ...newMaterials,
      ],
      ownedParts: success && newPart ? [...state.ownedParts, newPart] : state.ownedParts,
      labData: {
        ...state.labData,
        synthesisCount: state.labData.synthesisCount + 1,
        successCount: state.labData.successCount + (success ? 1 : 0),
        failureCount: state.labData.failureCount + (success ? 0 : 1),
        recentLogs: [
          logEntry,
          ...state.labData.recentLogs,
        ].slice(0, 50),
      },
    }));

    get().saveGame();

    return {
      success,
      part: newPart,
      returnedMaterials: returnedMaterials.length > 0 ? returnedMaterials : undefined,
    };
  },

  canModifySkill: (recipeId: string, skillTemplateId?: string): boolean => {
    const state = get();
    const recipe = getSkillModificationRecipe(recipeId);
    if (!recipe) return false;

    const targetTemplateId = skillTemplateId || recipe.targetSkillTemplateId;

    const inInventory = state.ownedSkills.some(s => s.templateId === targetTemplateId);
    const equipped = state.ownedAnimals.some(a => a.skills.some(es => es.skillId === targetTemplateId));
    if (!inInventory && !equipped) return false;

    if (state.player.coins < recipe.coinCost) return false;

    for (const mat of recipe.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    return true;
  },

  modifySkill: (recipeId: string, skillTemplateId?: string) => {
    const state = get();
    const recipe = getSkillModificationRecipe(recipeId);
    if (!recipe) return { success: false };
    const targetTemplateId = skillTemplateId || recipe.targetSkillTemplateId;
    if (!state.canModifySkill(recipeId, targetTemplateId)) return { success: false };

    const origTemplate = getSkillTemplate(targetTemplateId);
    if (!origTemplate) return { success: false };

    let materialsToRemove: string[] = [];
    for (const mat of recipe.materials) {
      const matching = state.ownedMaterials
        .filter(m => m.templateId === mat.templateId)
        .slice(0, mat.count);
      materialsToRemove = materialsToRemove.concat(matching.map(m => m.id));
    }

    const success = Math.random() * 100 < recipe.successRate;

    let modifiedSkill: Skill | undefined;
    let effects: {
      damageBonus?: number;
      cooldownReduction?: number;
      statusEffectChanceBonus?: number;
    } = {};

    const inventorySkill = state.ownedSkills.find(s => s.templateId === targetTemplateId);

    if (success) {
      effects = {
        damageBonus: recipe.effects.damageBonus,
        cooldownReduction: recipe.effects.cooldownReduction,
        statusEffectChanceBonus: recipe.effects.statusEffectChanceBonus,
      };

      const baseSkill = inventorySkill || { ...origTemplate, id: generateId('skill'), templateId: origTemplate.id };
      modifiedSkill = {
        ...baseSkill,
        damage: recipe.effects.damageBonus
          ? Math.floor(baseSkill.damage * (1 + recipe.effects.damageBonus / 100))
          : baseSkill.damage,
        cooldown: recipe.effects.cooldownReduction
          ? Math.max(1, baseSkill.cooldown - recipe.effects.cooldownReduction)
          : baseSkill.cooldown,
      };

      if (recipe.effects.addStatusEffect && !modifiedSkill.statusEffect) {
        modifiedSkill.statusEffect = recipe.effects.addStatusEffect;
      } else if (recipe.effects.addStatusEffect && modifiedSkill.statusEffect) {
        modifiedSkill.statusEffect = {
          ...modifiedSkill.statusEffect,
          chance: Math.min(100, modifiedSkill.statusEffect.chance + (recipe.effects.statusEffectChanceBonus || 0)),
        };
      }
    }

    const skillName = inventorySkill?.name || origTemplate.name;
    const skillEmoji = inventorySkill?.emoji || origTemplate.emoji;
    const skillRarity = inventorySkill?.rarity || origTemplate.rarity;

    const logEntry: LabLogEntry = {
      id: generateId('log'),
      timestamp: Date.now(),
      type: 'modification',
      success,
      description: success
        ? `成功改造 ${skillName}`
        : `改造 ${skillName} 失败`,
      rewards: success
        ? [{ type: 'skill', name: skillName, emoji: skillEmoji, rarity: skillRarity }]
        : undefined,
    };

    const updateAnimalsWithModifiedSkill = (animals: Animal[]): Animal[] => {
      return animals.map(a => ({
        ...a,
        skills: a.skills.map(es => {
          if (es.skillId !== targetTemplateId) return es;
          if (!modifiedSkill) return es;

          const newMod: EquippedSkill['modifications'] = { ...(es.modifications || {}) };
          if (modifiedSkill.damage !== origTemplate.damage) {
            newMod.damageBonus = Math.round((modifiedSkill.damage / origTemplate.damage - 1) * 100);
          } else {
            delete newMod.damageBonus;
          }
          if (modifiedSkill.cooldown !== origTemplate.cooldown) {
            newMod.cooldownReduction = origTemplate.cooldown - modifiedSkill.cooldown;
          } else {
            delete newMod.cooldownReduction;
          }
          if (modifiedSkill.statusEffect && (!origTemplate.statusEffect || origTemplate.statusEffect.type !== modifiedSkill.statusEffect.type)) {
            newMod.addStatusEffect = { ...modifiedSkill.statusEffect };
            delete newMod.statusEffectChanceBonus;
          } else if (modifiedSkill.statusEffect && origTemplate.statusEffect && modifiedSkill.statusEffect.chance > origTemplate.statusEffect.chance) {
            newMod.statusEffectChanceBonus = modifiedSkill.statusEffect.chance - origTemplate.statusEffect.chance;
            delete newMod.addStatusEffect;
          }
          return { ...es, modifications: newMod };
        }),
      }));
    };

    set(state => {
      const update: Partial<GameState> = {
        player: { ...state.player, coins: state.player.coins - recipe.coinCost },
        ownedMaterials: state.ownedMaterials.filter(m => !materialsToRemove.includes(m.id)),
        labData: {
          ...state.labData,
          modificationCount: state.labData.modificationCount + 1,
          successCount: state.labData.successCount + (success ? 1 : 0),
          failureCount: state.labData.failureCount + (success ? 0 : 1),
          recentLogs: [
            logEntry,
            ...state.labData.recentLogs,
          ].slice(0, 50),
        },
      };

      if (success && modifiedSkill) {
        if (inventorySkill) {
          update.ownedSkills = state.ownedSkills.map(s =>
            s.id === inventorySkill.id ? modifiedSkill : s
          );
        }
        update.ownedAnimals = updateAnimalsWithModifiedSkill(state.ownedAnimals);
      }

      return update;
    });

    get().saveGame();

    return {
      success,
      skill: modifiedSkill,
      effects: success ? effects : undefined,
    };
  },

  canRunExperiment: (experimentId: string): boolean => {
    const state = get();
    const experiment = getProbabilityExperiment(experimentId);
    if (!experiment) return false;

    if (state.player.coins < experiment.coinCost) return false;

    for (const mat of experiment.materials) {
      const owned = state.ownedMaterials.filter(m => m.templateId === mat.templateId).length;
      if (owned < mat.count) return false;
    }

    return true;
  },

  runExperiment: (experimentId: string) => {
    const state = get();
    const experiment = getProbabilityExperiment(experimentId);
    if (!experiment) return { rewards: [] };
    if (!state.canRunExperiment(experimentId)) return { rewards: [] };

    let materialsToRemove: string[] = [];
    for (const mat of experiment.materials) {
      const matching = state.ownedMaterials
        .filter(m => m.templateId === mat.templateId)
        .slice(0, mat.count);
      materialsToRemove = materialsToRemove.concat(matching.map(m => m.id));
    }

    const totalWeight = experiment.rewards.reduce((sum, r) => sum + r.weight, 0);
    const roll = Math.random() * totalWeight;

    let accumulated = 0;
    let selectedReward = experiment.rewards[0];
    for (const reward of experiment.rewards) {
      accumulated += reward.weight;
      if (roll <= accumulated) {
        selectedReward = reward;
        break;
      }
    }

    const guaranteedRarity = experiment.guaranteedRarity;

    let guaranteeReward: typeof selectedReward | null = null;
    if (guaranteedRarity && guaranteedRarity >= 2) {
      const isLowRarityItem = (selectedReward.type === 'part' || selectedReward.type === 'skill')
        && (selectedReward.rarity || 1) < guaranteedRarity;
      const isNonItemReward = selectedReward.type === 'coins' || selectedReward.type === 'gems'
        || selectedReward.type === 'material';

      if (isLowRarityItem || isNonItemReward) {
        const guaranteedPool = experiment.rewards.filter(
          r => (r.type === 'part' || r.type === 'skill') && (r.rarity || 1) >= guaranteedRarity
        );
        if (guaranteedPool.length > 0) {
          guaranteeReward = pickRandom(guaranteedPool);
        }
      }
    }

    const rewards: {
      type: string;
      name: string;
      emoji: string;
      rarity?: Rarity;
      amount?: number;
      item?: Part | Skill | Material;
    }[] = [];

    let newParts: Part[] = [];
    let newSkills: Skill[] = [];
    let newMaterials: Material[] = [];
    let coinReward = 0;
    let gemReward = 0;

    switch (selectedReward.type) {
      case 'coins':
        coinReward = selectedReward.amount || 0;
        rewards.push({
          type: 'coins',
          name: '金币',
          emoji: '💰',
          amount: coinReward,
        });
        break;

      case 'gems':
        gemReward = selectedReward.amount || 0;
        rewards.push({
          type: 'gems',
          name: '宝石',
          emoji: '💎',
          amount: gemReward,
        });
        break;

      case 'part': {
        const rarity = selectedReward.rarity || 2;
        const pool = PART_TEMPLATES.filter(p => p.rarity === rarity);
        if (pool.length > 0) {
          const template = pickRandom(pool);
          const part: Part = {
            ...template,
            id: generateId('part'),
            templateId: template.id,
            quality: rollPartQuality(rarity),
            setId: template.setId,
          };
          newParts.push(part);
          rewards.push({
            type: 'part',
            name: template.name,
            emoji: template.emoji,
            rarity,
            item: part,
          });
        }
        break;
      }

      case 'skill': {
        const rarity = selectedReward.rarity || 2;
        let pool = SKILL_TEMPLATES.filter(s => s.rarity === rarity);
        if (pool.length === 0) {
          pool = SKILL_TEMPLATES.filter(s => s.rarity <= rarity);
        }
        if (pool.length > 0) {
          const template = pickRandom(pool);
          const skill: Skill = {
            ...template,
            id: generateId('skill'),
            templateId: template.id,
          };
          newSkills.push(skill);
          rewards.push({
            type: 'skill',
            name: template.name,
            emoji: template.emoji,
            rarity,
            item: skill,
          });
        }
        break;
      }

      case 'material': {
        const templateId = selectedReward.templateId;
        const amount = selectedReward.amount || 1;
        const matTemplate = getLabMaterialTemplate(templateId) || getMaterialTemplate(templateId);
        if (matTemplate) {
          for (let i = 0; i < amount; i++) {
            const material: Material = {
              id: generateId('mat'),
              templateId: matTemplate.id,
              name: matTemplate.name,
              description: matTemplate.description,
              emoji: matTemplate.emoji,
              rarity: matTemplate.rarity,
              type: matTemplate.type as MaterialType,
              element: 'element' in matTemplate ? matTemplate.element : undefined,
            };
            newMaterials.push(material);
          }
          rewards.push({
            type: 'material',
            name: matTemplate.name,
            emoji: matTemplate.emoji,
            rarity: matTemplate.rarity,
            amount,
          });
        }
        break;
      }
    }

    if (guaranteeReward) {
      const guaranteeRarity = guaranteeReward.rarity || guaranteedRarity!;

      if (guaranteeReward.type === 'part') {
        const pool = PART_TEMPLATES.filter(p => p.rarity === guaranteeRarity);
        if (pool.length > 0) {
          const template = pickRandom(pool);
          const part: Part = {
            ...template,
            id: generateId('part'),
            templateId: template.id,
            quality: rollPartQuality(guaranteeRarity),
            setId: template.setId,
          };
          newParts.push(part);
          rewards.push({
            type: 'part',
            name: template.name,
            emoji: template.emoji,
            rarity: guaranteeRarity as Rarity,
            item: part,
          });
        }
      } else if (guaranteeReward.type === 'skill') {
        let pool = SKILL_TEMPLATES.filter(s => s.rarity === guaranteeRarity);
        if (pool.length === 0) {
          pool = SKILL_TEMPLATES.filter(s => s.rarity <= guaranteeRarity);
        }
        if (pool.length > 0) {
          const template = pickRandom(pool);
          const skill: Skill = {
            ...template,
            id: generateId('skill'),
            templateId: template.id,
          };
          newSkills.push(skill);
          rewards.push({
            type: 'skill',
            name: template.name,
            emoji: template.emoji,
            rarity: guaranteeRarity as Rarity,
            item: skill,
          });
        }
      }
    }

    const logEntry: LabLogEntry = {
      id: generateId('log'),
      timestamp: Date.now(),
      type: 'experiment',
      success: true,
      description: `完成 ${experiment.name}，获得 ${rewards.map(r => r.name).join(', ')}`,
      rewards: rewards.map(r => ({
        type: r.type,
        name: r.name,
        emoji: r.emoji,
        rarity: r.rarity,
        amount: r.amount,
      })),
    };

    set(state => ({
      player: {
        ...state.player,
        coins: state.player.coins - experiment.coinCost + coinReward,
        gems: state.player.gems + gemReward,
      },
      ownedMaterials: [
        ...state.ownedMaterials.filter(m => !materialsToRemove.includes(m.id)),
        ...newMaterials,
      ],
      ownedParts: [...state.ownedParts, ...newParts],
      ownedSkills: [...state.ownedSkills, ...newSkills],
      labData: {
        ...state.labData,
        experimentCount: state.labData.experimentCount + 1,
        successCount: state.labData.successCount + 1,
        recentLogs: [
          logEntry,
          ...state.labData.recentLogs,
        ].slice(0, 50),
      },
    }));

    get().saveGame();

    return { rewards };
  },

  addLabLog: (log: Omit<LabLogEntry, 'id' | 'timestamp'>) => {
    set(state => ({
      labData: {
        ...state.labData,
        recentLogs: [
          {
            ...log,
            id: generateId('log'),
            timestamp: Date.now(),
          },
          ...state.labData.recentLogs,
        ].slice(0, 50),
      },
    }));
    get().saveGame();
  },

  clearLabLogs: () => {
    set(state => ({
      labData: {
        ...state.labData,
        recentLogs: [],
      },
    }));
    get().saveGame();
  },
}));
