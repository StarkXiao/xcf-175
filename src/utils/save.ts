import type { SaveData, Part, Skill, Animal } from '@/types';
import { SAVE_KEY, STORAGE_THROTTLE } from '@/engine/constants';
import { PART_TEMPLATES } from '@/data/parts';
import { SKILL_TEMPLATES } from '@/data/skills';

let saveTimeout: NodeJS.Timeout | null = null;

export const saveToLocalStorage = (data: SaveData): void => {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(SAVE_KEY, json);
  } catch (error) {
    console.error('Failed to save game:', error);
  }
};

export const throttledSave = (data: SaveData): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveToLocalStorage(data);
  }, STORAGE_THROTTLE);
};

export const loadFromLocalStorage = (): SaveData | null => {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    const data = JSON.parse(json) as SaveData;
    return migrateSaveData(data);
  } catch (error) {
    console.error('Failed to load save:', error);
    return null;
  }
};

export const clearSave = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    console.error('Failed to clear save:', error);
  }
};

export const hasExistingSave = (): boolean => {
  return localStorage.getItem(SAVE_KEY) !== null;
};

export const createNewSaveData = (): SaveData => {
  return {
    version: 2,
    timestamp: Date.now(),
    player: {
      id: 'new_player',
      coins: 1500,
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
  };
};

export const exportSave = (data: SaveData): string => {
  return btoa(JSON.stringify(data));
};

export const importSave = (encoded: string): SaveData | null => {
  try {
    const json = atob(encoded);
    const data = JSON.parse(json) as SaveData;
    return migrateSaveData(data);
  } catch (error) {
    console.error('Failed to import save:', error);
    return null;
  }
};

export const getSaveSize = (): number => {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    return json ? new Blob([json]).size : 0;
  } catch {
    return 0;
  }
};

export const validateSaveData = (data: unknown): data is SaveData => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.version === 'number' &&
    typeof d.timestamp === 'number' &&
    typeof d.player === 'object' &&
    Array.isArray(d.ownedAnimals) &&
    Array.isArray(d.ownedParts) &&
    Array.isArray(d.ownedSkills) &&
    Array.isArray(d.lineup) &&
    Array.isArray(d.battleHistory)
  );
};

const inferTemplateId = (instance: Partial<Part | Skill>): string | null => {
  if ('slot' in instance) {
    const part = instance as Partial<Part>;
    const match = PART_TEMPLATES.find(
      t => t.name === part.name && t.slot === part.slot && t.rarity === part.rarity
    );
    return match?.id || null;
  } else {
    const skill = instance as Partial<Skill>;
    const match = SKILL_TEMPLATES.find(
      t => t.name === skill.name && t.type === skill.type && t.rarity === skill.rarity
    );
    return match?.id || null;
  }
};

export const migrateSaveData = (data: SaveData): SaveData => {
  if (data.version >= 2) return data;

  const partInstanceToTemplate: Record<string, string> = {};
  const skillInstanceToTemplate: Record<string, string> = {};

  const migratedParts = data.ownedParts.map(part => {
    if (!part.templateId) {
      const templateId = inferTemplateId(part);
      if (templateId) {
        partInstanceToTemplate[part.id] = templateId;
        return { ...part, templateId };
      }
    } else {
      partInstanceToTemplate[part.id] = part.templateId;
    }
    return part;
  });

  const migratedSkills = data.ownedSkills.map(skill => {
    if (!skill.templateId) {
      const templateId = inferTemplateId(skill);
      if (templateId) {
        skillInstanceToTemplate[skill.id] = templateId;
        return { ...skill, templateId };
      }
    } else {
      skillInstanceToTemplate[skill.id] = skill.templateId;
    }
    return skill;
  });

  const migrateAnimal = (animal: Animal): Animal => {
    const migratedParts = animal.parts.map(ep => {
      const templateId = partInstanceToTemplate[ep.partId] || ep.partId;
      return { ...ep, partId: templateId };
    });

    const migratedSkills = animal.skills.map(es => {
      const templateId = skillInstanceToTemplate[es.skillId] || es.skillId;
      return { ...es, skillId: templateId };
    });

    return { ...animal, parts: migratedParts, skills: migratedSkills };
  };

  const migratedAnimals = data.ownedAnimals.map(migrateAnimal);

  const migratedBattleHistory = data.battleHistory.map(record => {
    const migrateUnitSkills = <T extends { skills: { skillId: string }[] }>(unit: T): T => {
      return {
        ...unit,
        skills: unit.skills.map(s => ({
          ...s,
          skillId: skillInstanceToTemplate[s.skillId] || s.skillId,
        })),
      } as T;
    };

    return {
      ...record,
      playerUnits: record.playerUnits.map(migrateUnitSkills),
      enemyUnits: record.enemyUnits.map(migrateUnitSkills),
      initialPlayerUnits: record.initialPlayerUnits?.map(migrateUnitSkills) || record.initialPlayerUnits,
      initialEnemyUnits: record.initialEnemyUnits?.map(migrateUnitSkills) || record.initialEnemyUnits,
    };
  });

  return {
    ...data,
    version: 2,
    ownedParts: migratedParts,
    ownedSkills: migratedSkills,
    ownedAnimals: migratedAnimals,
    battleHistory: migratedBattleHistory,
  };
};
