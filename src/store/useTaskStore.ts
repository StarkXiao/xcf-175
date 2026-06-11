import { create } from 'zustand';
import type { TaskSaveData, TaskProgress, TaskTemplate, TaskReward, TaskCategory } from '@/types';
import { TASK_TEMPLATES, getTaskTemplate, getDailyTasks } from '@/data/tasks';
import { useGameStore } from '@/store/useGameStore';
import { loadFromLocalStorage, saveToLocalStorage, throttledSave } from '@/utils/save';
import { STORAGE_THROTTLE } from '@/engine/constants';

const TASK_SAVE_KEY = 'neon_colosseum_tasks_v1';

let taskSaveTimeout: NodeJS.Timeout | null = null;

const throttledSaveTaskData = (data: TaskSaveData): void => {
  if (taskSaveTimeout) {
    clearTimeout(taskSaveTimeout);
  }
  taskSaveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(TASK_SAVE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save task data:', error);
    }
  }, STORAGE_THROTTLE);
};

interface TaskState {
  progress: Record<string, TaskProgress>;
  lastDailyReset: number;
  completedAchievements: string[];
  isInitialized: boolean;

  initTasks: () => void;
  loadTaskData: () => boolean;
  saveTaskData: (force?: boolean) => void;

  checkDailyReset: () => void;
  resetDailyTasks: () => void;
  resetTasks: () => void;

  getTaskProgress: (taskId: string) => TaskProgress | undefined;
  getTasksByCategory: (category: TaskCategory) => TaskTemplate[];
  getTaskListWithProgress: (category: TaskCategory) => { template: TaskTemplate; progress: TaskProgress }[];

  updateTaskProgress: (taskId: string, value: number, increment?: boolean) => void;
  incrementTaskProgress: (taskId: string, amount?: number) => void;
  completeTask: (taskId: string) => void;

  claimReward: (taskId: string) => { success: boolean; rewards?: TaskReward[] };
  claimAllAvailable: () => { success: boolean; totalRewards: TaskReward[] };

  hasUnclaimedRewards: () => boolean;
  getUnclaimedCount: () => number;

  refreshDerivedTasks: () => void;
}

const isSameDay = (timestamp1: number, timestamp2: number): boolean => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const createInitialProgress = (template: TaskTemplate): TaskProgress => ({
  taskId: template.id,
  currentValue: 0,
  targetValue: template.targetValue,
  isCompleted: false,
  isClaimed: false,
});

const initializeAllProgress = (): Record<string, TaskProgress> => {
  const progress: Record<string, TaskProgress> = {};
  TASK_TEMPLATES.forEach(template => {
    progress[template.id] = createInitialProgress(template);
  });
  return progress;
};

const applyRewards = (rewards: TaskReward[]) => {
  const gameStore = useGameStore.getState();
  rewards.forEach(reward => {
    switch (reward.type) {
      case 'coins':
        gameStore.addCoins(reward.amount);
        break;
      case 'gems':
        gameStore.addGems(reward.amount);
        break;
      case 'material':
        if (reward.templateId) {
          gameStore.addMaterials([{ templateId: reward.templateId, count: reward.amount }]);
        }
        break;
    }
  });
};

export const useTaskStore = create<TaskState>((set, get) => ({
  progress: {},
  lastDailyReset: 0,
  completedAchievements: [],
  isInitialized: false,

  initTasks: () => {
    const loaded = get().loadTaskData();
    if (!loaded) {
      set({
        progress: initializeAllProgress(),
        lastDailyReset: Date.now(),
        completedAchievements: [],
        isInitialized: true,
      });
      get().saveTaskData(true);
    } else {
      get().checkDailyReset();
      get().refreshDerivedTasks();
      set({ isInitialized: true });
    }
  },

  loadTaskData: (): boolean => {
    try {
      const raw = localStorage.getItem(TASK_SAVE_KEY);
      if (!raw) return false;
      const taskData = JSON.parse(raw) as TaskSaveData;
      const progress = { ...initializeAllProgress() };

      Object.keys(taskData.progress).forEach(taskId => {
        if (progress[taskId]) {
          progress[taskId] = { ...progress[taskId], ...taskData.progress[taskId] };
        }
      });

      set({
        progress,
        lastDailyReset: taskData.lastDailyReset || 0,
        completedAchievements: taskData.completedAchievements || [],
      });

      return true;
    } catch (error) {
      console.error('Failed to load task data:', error);
      return false;
    }
  },

  saveTaskData: (force: boolean = false) => {
    const state = get();
    const taskData: TaskSaveData = {
      progress: state.progress,
      lastDailyReset: state.lastDailyReset,
      completedAchievements: state.completedAchievements,
    };

    try {
      if (force) {
        localStorage.setItem(TASK_SAVE_KEY, JSON.stringify(taskData));
      } else {
        throttledSaveTaskData(taskData);
      }
    } catch (error) {
      console.error('Failed to save task data:', error);
    }
  },

  checkDailyReset: () => {
    const state = get();
    const now = Date.now();
    if (!isSameDay(state.lastDailyReset, now)) {
      get().resetDailyTasks();
    }
  },

  resetDailyTasks: () => {
    set(state => {
      const newProgress = { ...state.progress };
      const dailyTasks = getDailyTasks();
      dailyTasks.forEach(template => {
        newProgress[template.id] = createInitialProgress(template);
      });
      return {
        progress: newProgress,
        lastDailyReset: Date.now(),
      };
    });
    get().saveTaskData();
  },

  resetTasks: () => {
    try {
      localStorage.removeItem(TASK_SAVE_KEY);
    } catch (error) {
      console.error('Failed to reset task data:', error);
    }
    set({
      progress: initializeAllProgress(),
      lastDailyReset: Date.now(),
      completedAchievements: [],
      isInitialized: true,
    });
  },

  getTaskProgress: (taskId: string) => {
    return get().progress[taskId];
  },

  getTasksByCategory: (category: TaskCategory) => {
    return TASK_TEMPLATES.filter(t => t.category === category);
  },

  getTaskListWithProgress: (category: TaskCategory) => {
    const state = get();
    const templates = TASK_TEMPLATES.filter(t => t.category === category);
    return templates.map(template => ({
      template,
      progress: state.progress[template.id] || createInitialProgress(template),
    }));
  },

  updateTaskProgress: (taskId: string, value: number, increment: boolean = false) => {
    const template = getTaskTemplate(taskId);
    if (!template) return;

    set(state => {
      const currentProgress = state.progress[taskId] || createInitialProgress(template);
      let newValue = increment ? currentProgress.currentValue + value : value;
      newValue = Math.min(newValue, template.targetValue);
      const isCompleted = newValue >= template.targetValue;

      const newProgress = {
        ...currentProgress,
        currentValue: newValue,
        isCompleted,
        completedAt: isCompleted && !currentProgress.isCompleted ? Date.now() : currentProgress.completedAt,
      };

      let newCompletedAchievements = state.completedAchievements;
      if (template.isAchievement && isCompleted && !state.completedAchievements.includes(taskId)) {
        newCompletedAchievements = [...state.completedAchievements, taskId];
      }

      return {
        progress: { ...state.progress, [taskId]: newProgress },
        completedAchievements: newCompletedAchievements,
      };
    });

    get().saveTaskData();
  },

  incrementTaskProgress: (taskId: string, amount: number = 1) => {
    get().updateTaskProgress(taskId, amount, true);
  },

  completeTask: (taskId: string) => {
    const template = getTaskTemplate(taskId);
    if (!template) return;
    get().updateTaskProgress(taskId, template.targetValue);
  },

  claimReward: (taskId: string) => {
    const state = get();
    const progress = state.progress[taskId];
    const template = getTaskTemplate(taskId);

    if (!progress || !template || !progress.isCompleted || progress.isClaimed) {
      return { success: false };
    }

    applyRewards(template.rewards);

    set(s => ({
      progress: {
        ...s.progress,
        [taskId]: { ...s.progress[taskId], isClaimed: true },
      },
    }));

    get().saveTaskData();
    return { success: true, rewards: template.rewards };
  },

  claimAllAvailable: () => {
    const state = get();
    const totalRewards: TaskReward[] = [];
    const claimableTasks: string[] = [];

    Object.keys(state.progress).forEach(taskId => {
      const progress = state.progress[taskId];
      const template = getTaskTemplate(taskId);
      if (progress && template && progress.isCompleted && !progress.isClaimed) {
        claimableTasks.push(taskId);
        totalRewards.push(...template.rewards);
      }
    });

    if (claimableTasks.length === 0) {
      return { success: false, totalRewards: [] };
    }

    const mergedRewards: TaskReward[] = [];
    totalRewards.forEach(reward => {
      const existing = mergedRewards.find(
        r => r.type === reward.type && r.templateId === reward.templateId
      );
      if (existing) {
        existing.amount += reward.amount;
      } else {
        mergedRewards.push({ ...reward });
      }
    });

    applyRewards(mergedRewards);

    set(s => {
      const newProgress = { ...s.progress };
      claimableTasks.forEach(taskId => {
        newProgress[taskId] = { ...newProgress[taskId], isClaimed: true };
      });
      return { progress: newProgress };
    });

    get().saveTaskData();
    return { success: true, totalRewards: mergedRewards };
  },

  hasUnclaimedRewards: () => {
    const state = get();
    return Object.values(state.progress).some(p => p.isCompleted && !p.isClaimed);
  },

  getUnclaimedCount: () => {
    const state = get();
    return Object.values(state.progress).filter(p => p.isCompleted && !p.isClaimed).length;
  },

  refreshDerivedTasks: () => {
    const gameState = useGameStore.getState();

    const totalBattles = gameState.battleHistory.length;
    const totalWins = gameState.battleHistory.filter(b => b.isWin).length;
    const currentWinStreak = gameState.player.currentWinStreak;
    const totalGacha = gameState.gachaRecords.length;
    const ownedAnimalTemplates = new Set(gameState.ownedAnimals.map(a => a.templateId));
    const uniqueAnimals = ownedAnimalTemplates.size;

    const highestLevel = Math.max(...gameState.ownedAnimals.map(a => a.level), 0);
    const highestStar = Math.max(...gameState.ownedAnimals.map(a => a.starLevel), 0) as number;
    const highestBreakthrough = Math.max(...gameState.ownedAnimals.map(a => a.breakthroughTier), 0) as number;

    const lineupSize = gameState.lineup.length;
    const lineupAnimals = gameState.lineup
      .map(id => gameState.ownedAnimals.find(a => a.id === id))
      .filter(Boolean);
    const lineupWithSkills = lineupAnimals.filter(a => a && a.skills.length > 0).length;
    const maxPartsOnLineupAnimal = Math.max(
      ...lineupAnimals.map(a => a ? a.parts.length : 0),
      0
    );
    const lineupAllRarity3 = lineupAnimals.every(a => a && a.rarity >= 3) ? lineupSize : 0;

    const totalCoins = gameState.player.totalRewardAmount + 1000;
    const totalGems = 10 + Math.floor(totalBattles / 10) * 5;

    const activeBonds = gameState.codexData?.bonds?.filter(b => b.isActivated).length || 0;

    const updates: { id: string; value: number }[] = [
      { id: 'battle_total_10', value: totalBattles },
      { id: 'battle_total_50', value: totalBattles },
      { id: 'battle_total_100', value: totalBattles },
      { id: 'battle_win_10', value: totalWins },
      { id: 'battle_win_50', value: totalWins },
      { id: 'battle_streak_3', value: currentWinStreak },
      { id: 'battle_streak_5', value: currentWinStreak },
      { id: 'battle_streak_10', value: currentWinStreak },
      { id: 'gacha_total_10', value: totalGacha },
      { id: 'gacha_total_50', value: totalGacha },
      { id: 'gacha_total_100', value: totalGacha },
      { id: 'gacha_animal_5', value: uniqueAnimals },
      { id: 'gacha_animal_all', value: uniqueAnimals },
      { id: 'ascend_level_10', value: highestLevel },
      { id: 'ascend_level_30', value: highestLevel },
      { id: 'ascend_level_50', value: highestLevel },
      { id: 'ascend_star_3', value: highestStar },
      { id: 'ascend_star_5', value: highestStar },
      { id: 'ascend_star_6', value: highestStar },
      { id: 'ascend_break_2', value: highestBreakthrough },
      { id: 'ascend_break_4', value: highestBreakthrough },
      { id: 'lineup_first', value: lineupSize > 0 ? 1 : 0 },
      { id: 'lineup_full', value: lineupSize },
      { id: 'lineup_skill_5', value: lineupWithSkills },
      { id: 'lineup_part_4', value: maxPartsOnLineupAnimal },
      { id: 'lineup_all_rarity_3', value: lineupAllRarity3 },
      { id: 'achievement_first_battle', value: totalBattles > 0 ? 1 : 0 },
      { id: 'achievement_first_win', value: totalWins > 0 ? 1 : 0 },
      { id: 'achievement_first_gacha', value: totalGacha > 0 ? 1 : 0 },
      { id: 'achievement_first_animal', value: gameState.ownedAnimals.length > 0 ? 1 : 0 },
      { id: 'achievement_coins_10000', value: totalCoins },
      { id: 'achievement_coins_100000', value: totalCoins },
      { id: 'achievement_gems_100', value: totalGems },
      { id: 'achievement_bond_master', value: activeBonds },
    ];

    updates.forEach(({ id, value }) => {
      const template = getTaskTemplate(id);
      if (template) {
        const progress = get().progress[id];
        if (!progress || !progress.isCompleted) {
          get().updateTaskProgress(id, Math.min(value, template.targetValue));
        }
      }
    });
  },
}));

export const trackBattle = (isWin: boolean) => {
  const store = useTaskStore.getState();
  store.incrementTaskProgress('daily_battle_3');
  store.incrementTaskProgress('achievement_first_battle', 1);

  if (isWin) {
    store.incrementTaskProgress('daily_battle_win_1');
    store.incrementTaskProgress('achievement_first_win', 1);
  }

  store.refreshDerivedTasks();
};

export const trackGacha = (rarity: number) => {
  const store = useTaskStore.getState();
  store.incrementTaskProgress('daily_gacha_1');
  store.incrementTaskProgress('achievement_first_gacha', 1);

  if (rarity >= 4) {
    store.completeTask('gacha_rarity_4');
  }
  if (rarity >= 5) {
    store.completeTask('gacha_rarity_5');
  }

  store.refreshDerivedTasks();
};

export const trackLevelUp = () => {
  const store = useTaskStore.getState();
  store.incrementTaskProgress('daily_levelup_1');
  store.refreshDerivedTasks();
};

export const trackLineupEdit = () => {
  const store = useTaskStore.getState();
  store.incrementTaskProgress('daily_lineup_edit');
  store.refreshDerivedTasks();
};

export const trackAscend = () => {
  const store = useTaskStore.getState();
  store.refreshDerivedTasks();
};

export const trackBreakthrough = () => {
  const store = useTaskStore.getState();
  store.refreshDerivedTasks();
};
