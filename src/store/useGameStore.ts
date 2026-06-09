import { create } from 'zustand';
import type {
  Animal,
  Part,
  Skill,
  BattleRecord,
  SaveData,
  EquippedPart,
  Rarity,
  PartSlot,
  LineupConfig,
  FormationPosition,
  TargetStrategy,
  ActionPriority,
  PityState,
  GachaRecord,
  GachaPoolType,
  LimitedPoolConfig,
  GachaMultiResult,
  Material,
  StarLevel,
  BreakthroughTier,
  CodexEntry,
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
import { getPartTemplate } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import { MATERIAL_TEMPLATES, getMaterialTemplate } from '@/data/materials';
import { getStarUpCost, getBreakthroughCost, getSkillSlotsForStar, getSkillLevelCapForBreakthrough, BATTLE_MATERIAL_DROPS } from '@/data/ascendConfig';

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
  isLoading: boolean;
  isNewPlayer: boolean;
  isInitialized: boolean;

  initialize: () => void;
  loadSave: () => boolean;
  saveGame: (force?: boolean) => void;
  resetGame: () => void;

  addAnimal: (animal: Animal) => void;
  removeAnimal: (id: string) => void;
  levelUpAnimal: (id: string) => boolean;

  addToLineup: (animalId: string) => boolean;
  removeFromLineup: (animalId: string) => void;

  setFormationPosition: (animalId: string, position: FormationPosition) => void;
  setTargetStrategy: (animalId: string, strategy: TargetStrategy) => void;
  setActionPriority: (priority: ActionPriority) => void;
  getLineupConfig: () => LineupConfig;

  equipPart: (animalId: string, partId: string, slot: PartSlot) => boolean;
  unequipPart: (animalId: string, slot: PartSlot) => void;

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
    parts.push({ ...p, id: generateId('part'), templateId: p.id });
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
      ownedMaterials: [],
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
            return { ...ep, partId: match.id };
          }
        }
        return ep;
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

    const pityState: PityState = data.pityState || { ...DEFAULT_PITY_STATE };
    if (!pityState.limited) {
      pityState.limited = { pullsSinceR4: 0, pullsSinceR5: 0, guaranteedFeatured: false };
    }

    set({
      player: data.player,
      ownedAnimals: repairedAnimals,
      ownedParts: data.ownedParts,
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
      version: 6,
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

    if (existingIndex >= 0) {
      removedPart = newParts[existingIndex];
      newParts[existingIndex] = { partId: part.templateId, slot };
    } else {
      newParts.push({ partId: part.templateId, slot });
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
        set(state => ({
          ownedParts: [...state.ownedParts, { ...origPart, id: generateId('part'), templateId: origPart.id }],
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

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? { ...a, parts: a.parts.filter(p => p.slot !== slot) }
          : a
      ),
    }));

    if (origPart) {
      set(state => ({
        ownedParts: [...state.ownedParts, { ...origPart, id: generateId('part'), templateId: origPart.id }],
      }));
    }

    get().saveGame();
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

    set(state => ({
      ownedAnimals: state.ownedAnimals.map(a =>
        a.id === animalId
          ? { ...a, skills: [...a.skills, { skillId: skill.templateId, level: 1 }] }
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
      set(state => ({
        ownedSkills: [...state.ownedSkills, { ...origSkill, id: generateId('skill'), templateId: origSkill.id }],
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
    const part: Part = { ...template, id: generateId('part'), templateId: template.id };
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
          item = { ...template, id: generateId('part'), templateId: template.id };
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
          item = { ...template, id: generateId('part'), templateId: template.id };
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
        item = { ...template, id: generateId('part'), templateId: template.id };
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
          const part: Part = { ...template, id: generateId('part'), templateId: template.id };
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
                item = { ...template, id: generateId('part'), templateId: template.id };
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
                item = { ...template, id: generateId('part'), templateId: template.id };
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
              item = { ...template, id: generateId('part'), templateId: template.id };
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

    const result = simulateFullBattle(lineupAnimals, betAmount, state.lineupConfig);

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
      const count = Math.floor(Math.random() * (dropConfig.btMaterialCount.max - dropConfig.btMaterialCount.min + 1)) + dropConfig.btMaterialCount.min;
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

    get().saveGame(true);

    return {
      success: true,
      battleRecord,
      isWin: result.isWin,
      reward: result.reward,
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
}));
