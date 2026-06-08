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
} from '@/types';
import { ANIMAL_TEMPLATES } from '@/data/animals';
import { PART_TEMPLATES } from '@/data/parts';
import { SKILL_TEMPLATES } from '@/data/skills';
import { generateAnimalId, generateBattleId, generateId } from '@/utils/id';
import { pickRandomWeighted, randomInt, pickRandom } from '@/utils/random';
import {
  loadFromLocalStorage,
  throttledSave,
  saveToLocalStorage,
  createNewSaveData,
  clearSave,
  hasExistingSave,
} from '@/utils/save';
import { GACHA_RATES, GACHA_COSTS, BATTLE_CONSTANTS, NEWBIE_GIFT } from '@/engine/constants';
import { simulateFullBattle } from '@/engine/battleEngine';
import { getAnimalTemplate } from '@/data/animals';
import { getPartTemplate } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';

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
  lineup: string[];
  battleHistory: BattleRecord[];
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

  equipPart: (animalId: string, partId: string, slot: PartSlot) => boolean;
  unequipPart: (animalId: string, slot: PartSlot) => void;

  equipSkill: (animalId: string, skillId: string) => boolean;
  unequipSkill: (animalId: string, index: number) => void;

  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;

  gachaAnimal: () => { animal: Animal; isNew: boolean };
  gachaPart: () => { part: Part; isNew: boolean };
  gachaSkill: () => { skill: Skill; isNew: boolean };

  startBattle: (betAmount: number) => {
    success: boolean;
    battleRecord?: BattleRecord;
    isWin?: boolean;
    reward?: number;
  };

  getAnimalById: (id: string) => Animal | undefined;
  getLineupAnimals: () => Animal[];
}

const rollRarity = (rates: Record<number, number>): Rarity => {
  const rarities = Object.keys(rates).map(Number) as Rarity[];
  const weights = rarities.map(r => rates[r]);
  return pickRandomWeighted(rarities, weights);
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
  lineup: [],
  battleHistory: [],
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
      lineup: initialAnimals.map(a => a.id),
      battleHistory: [],
      isLoading: false,
      isNewPlayer: true,
      isInitialized: true,
    });

    get().saveGame(true);
  },

  loadSave: (): boolean => {
    const data = loadFromLocalStorage();
    if (!data) return false;

    set({
      player: data.player,
      ownedAnimals: data.ownedAnimals,
      ownedParts: data.ownedParts,
      ownedSkills: data.ownedSkills,
      lineup: data.lineup,
      battleHistory: data.battleHistory,
      isLoading: false,
      isNewPlayer: false,
      isInitialized: true,
    });

    return true;
  },

  saveGame: (force: boolean = false) => {
    const state = get();
    const saveData: SaveData = {
      version: 1,
      timestamp: Date.now(),
      player: state.player,
      ownedAnimals: state.ownedAnimals,
      ownedParts: state.ownedParts,
      ownedSkills: state.ownedSkills,
      lineup: state.lineup,
      battleHistory: state.battleHistory,
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
      lineup: [],
      battleHistory: [],
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

    set(state => ({ lineup: [...state.lineup, animalId] }));
    get().saveGame();
    return true;
  },

  removeFromLineup: (animalId: string) => {
    set(state => ({ lineup: state.lineup.filter(id => id !== animalId) }));
    get().saveGame();
  },

  equipPart: (animalId: string, partId: string, slot: PartSlot): boolean => {
    const state = get();
    const part = state.ownedParts.find(p => p.id === partId);
    if (!part || part.slot !== slot) return false;

    const animal = state.ownedAnimals.find(a => a.id === animalId);
    if (!animal) return false;

    const existingIndex = animal.parts.findIndex(p => p.slot === slot);
    let newParts = [...animal.parts];
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
    if (animal.skills.length >= BATTLE_CONSTANTS.MAX_SKILLS_PER_ANIMAL) return false;
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

  gachaAnimal: () => {
    const state = get();
    if (state.player.coins < GACHA_COSTS.animal) {
      throw new Error('Not enough coins');
    }

    const rarity = rollRarity(GACHA_RATES.animal);
    const pool = ANIMAL_TEMPLATES.filter(t => t.rarity <= rarity);
    const template = pickRandom(pool);
    const animal = createAnimalFromTemplate(template.id, rarity);
    const isNew = !state.ownedAnimals.some(a => a.templateId === template.id);

    set(state => ({
      player: { ...state.player, coins: state.player.coins - GACHA_COSTS.animal },
      ownedAnimals: [...state.ownedAnimals, animal],
    }));
    get().saveGame();
    return { animal, isNew };
  },

  gachaPart: () => {
    const state = get();
    if (state.player.coins < GACHA_COSTS.part) {
      throw new Error('Not enough coins');
    }

    const rarity = rollRarity(GACHA_RATES.part);
    let pool = PART_TEMPLATES.filter(p => p.rarity === rarity);
    if (pool.length === 0) {
      pool = PART_TEMPLATES.filter(p => p.rarity <= rarity);
      if (pool.length === 0) {
        pool = PART_TEMPLATES;
      }
      const template = pickRandom(pool);
      const part: Part = { ...template, id: generateId('part'), templateId: template.id };
      set(state => ({
        player: { ...state.player, coins: state.player.coins - GACHA_COSTS.part },
        ownedParts: [...state.ownedParts, part],
      }));
      get().saveGame();
      return { part, isNew: true };
    }

    const template = pickRandom(pool);
    const part: Part = { ...template, id: generateId('part'), templateId: template.id };
    const isNew = !state.ownedParts.some(p => p.id === template.id);

    set(state => ({
      player: { ...state.player, coins: state.player.coins - GACHA_COSTS.part },
      ownedParts: [...state.ownedParts, part],
    }));
    get().saveGame();
    return { part, isNew };
  },

  gachaSkill: () => {
    const state = get();
    if (state.player.coins < GACHA_COSTS.skill) {
      throw new Error('Not enough coins');
    }

    const rarity = rollRarity(GACHA_RATES.skill);
    const pool = SKILL_TEMPLATES.filter(s => {
      if (s.type === 'special') return rarity >= 3;
      if (s.type === 'buff' || s.type === 'debuff') return rarity >= 2;
      return true;
    });
    if (pool.length === 0) {
      const template = pickRandom(SKILL_TEMPLATES);
      const skill: Skill = { ...template, id: generateId('skill'), templateId: template.id };
      set(state => ({
        player: { ...state.player, coins: state.player.coins - GACHA_COSTS.skill },
        ownedSkills: [...state.ownedSkills, skill],
      }));
      get().saveGame();
      return { skill, isNew: true };
    }

    const template = pickRandom(pool);
    const skill: Skill = { ...template, id: generateId('skill'), templateId: template.id };
    const isNew = !state.ownedSkills.some(s => s.id === template.id);

    set(state => ({
      player: { ...state.player, coins: state.player.coins - GACHA_COSTS.skill },
      ownedSkills: [...state.ownedSkills, skill],
    }));
    get().saveGame();
    return { skill, isNew };
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

    const result = simulateFullBattle(lineupAnimals, betAmount);

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
}));
