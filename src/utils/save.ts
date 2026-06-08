import type { SaveData } from '@/types';
import { SAVE_KEY, STORAGE_THROTTLE } from '@/engine/constants';

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
    return data;
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
    version: 1,
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
    return data;
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
