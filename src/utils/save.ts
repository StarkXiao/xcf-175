import type { SaveData, Part, Skill, Animal, EquippedPart, EquippedSkill, PartSlot } from '@/types';
import { SAVE_KEY, STORAGE_THROTTLE } from '@/engine/constants';
import { PART_TEMPLATES, getPartTemplate } from '@/data/parts';
import { SKILL_TEMPLATES, getSkillTemplate } from '@/data/skills';

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
    version: 3,
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
    lineupConfig: { animals: [], actionPriority: 'speedFirst' },
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

const isTemplateId = (id: string, type: 'part' | 'skill'): boolean => {
  if (type === 'part') return PART_TEMPLATES.some(t => t.id === id);
  return SKILL_TEMPLATES.some(t => t.id === id);
};

const inferPartTemplateId = (instance: Partial<Part>): string | null => {
  if (instance.templateId) return instance.templateId;
  if ('slot' in instance && instance.name && instance.rarity !== undefined) {
    const match = PART_TEMPLATES.find(
      t => t.name === instance.name && t.slot === instance.slot && t.rarity === instance.rarity
    );
    if (match) return match.id;
  }
  return null;
};

const inferSkillTemplateId = (instance: Partial<Skill>): string | null => {
  if (instance.templateId) return instance.templateId;
  if (instance.name && instance.type && instance.rarity !== undefined) {
    const match = SKILL_TEMPLATES.find(
      t => t.name === instance.name && t.type === instance.type && t.rarity === instance.rarity
    );
    if (match) return match.id;
  }
  return null;
};

const INSTANCE_ID_RE = /^(?:part|skill)_[0-9a-z]+_[0-9a-z]+$/;

const resolvePartId = (
  id: string,
  instanceMap: Record<string, string>,
  slot: PartSlot
): string => {
  if (instanceMap[id]) return instanceMap[id];
  if (isTemplateId(id, 'part')) return id;
  if (INSTANCE_ID_RE.test(id)) {
    const fallback = PART_TEMPLATES.find(t => t.slot === slot && t.rarity <= 2);
    if (fallback) {
      console.warn(`[迁移] 孤儿部件ID ${id} 无法匹配，按槽位 ${slot} 降级为 ${fallback.id}`);
      return fallback.id;
    }
  }
  return id;
};

const resolveSkillId = (
  id: string,
  instanceMap: Record<string, string>
): string => {
  if (instanceMap[id]) return instanceMap[id];
  if (isTemplateId(id, 'skill')) return id;
  if (INSTANCE_ID_RE.test(id)) {
    const fallback = SKILL_TEMPLATES.find(t => t.type === 'attack' && t.rarity <= 2);
    if (fallback) {
      console.warn(`[迁移] 孤儿技能ID ${id} 无法匹配，降级为 ${fallback.id}`);
      return fallback.id;
    }
  }
  return id;
};

export const migrateSaveData = (data: SaveData): SaveData => {
  if (data.version >= 3) return data;

  let migrated = { ...data };

  if (migrated.version < 2) {
    const partInstanceToTemplate: Record<string, string> = {};
    const skillInstanceToTemplate: Record<string, string> = {};

    const migratedParts = migrated.ownedParts.map(part => {
      const templateId = inferPartTemplateId(part);
      if (templateId) partInstanceToTemplate[part.id] = templateId;
      return templateId ? { ...part, templateId } : part;
    });

    const migratedSkills = migrated.ownedSkills.map(skill => {
      const templateId = inferSkillTemplateId(skill);
      if (templateId) skillInstanceToTemplate[skill.id] = templateId;
      return templateId ? { ...skill, templateId } : skill;
    });

    const migrateAnimal = (animal: Animal): Animal => {
      const migratedParts: EquippedPart[] = animal.parts.map(ep => ({
        ...ep,
        partId: resolvePartId(ep.partId, partInstanceToTemplate, ep.slot),
      }));

      const migratedSkills: EquippedSkill[] = animal.skills.map(es => ({
        ...es,
        skillId: resolveSkillId(es.skillId, skillInstanceToTemplate),
      }));

      return { ...animal, parts: migratedParts, skills: migratedSkills };
    };

    const migratedAnimals = migrated.ownedAnimals.map(migrateAnimal);

    const migratedBattleHistory = migrated.battleHistory.map(record => {
      const migrateUnitSkills = <T extends { skills: { skillId: string }[] }>(unit: T): T => {
        return {
          ...unit,
          skills: unit.skills.map(s => ({
            ...s,
            skillId: resolveSkillId(s.skillId, skillInstanceToTemplate),
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

    migrated = {
      ...migrated,
      version: 2,
      ownedParts: migratedParts,
      ownedSkills: migratedSkills,
      ownedAnimals: migratedAnimals,
      battleHistory: migratedBattleHistory,
    };
  }

  if (!migrated.lineupConfig) {
    migrated = {
      ...migrated,
      version: 3,
      lineupConfig: {
        animals: migrated.lineup.map((id, i) => ({
          animalId: id,
          position: i === 0 ? 'front' : i === 1 ? 'mid' : 'back',
          targetStrategy: 'lowestHp',
        })),
        actionPriority: 'speedFirst',
      },
    };
  } else {
    migrated = { ...migrated, version: 3 };
  }

  const migrateBattleUnit = (unit: unknown): unknown => {
    const u = unit as Record<string, unknown>;
    if (!u.formationPosition) {
      return { ...u, formationPosition: 'mid', targetStrategy: 'lowestHp' };
    }
    return unit;
  };

  const migratedBattleHistory = migrated.battleHistory.map(record => ({
    ...record,
    playerUnits: record.playerUnits.map(migrateBattleUnit) as typeof record.playerUnits,
    enemyUnits: record.enemyUnits.map(migrateBattleUnit) as typeof record.enemyUnits,
    initialPlayerUnits: record.initialPlayerUnits?.map(migrateBattleUnit) as typeof record.initialPlayerUnits || record.initialPlayerUnits,
    initialEnemyUnits: record.initialEnemyUnits?.map(migrateBattleUnit) as typeof record.initialEnemyUnits || record.initialEnemyUnits,
  }));

  return {
    ...migrated,
    battleHistory: migratedBattleHistory,
  } as SaveData;
};
