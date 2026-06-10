import { create } from 'zustand';
import type {
  StorySaveData,
  ChapterProgress,
  StageProgress,
  StageTemplate,
  ChapterTemplate,
  StageEnemy,
  Animal,
  FormationPosition,
  TargetStrategy,
  ActionPriority,
  StageBattleResult,
} from '@/types';
import {
  CHAPTER_TEMPLATES,
  STORY_CONSTANTS,
  getChapterTemplate,
  getStageTemplate,
  getAllStageTemplates,
} from '@/data/story';
import { getAnimalTemplate } from '@/data/animals';
import { getPartTemplate, rollPartQuality } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import { generateId, generateAnimalId, generateBattleId } from '@/utils/id';
import { simulateFullBattleWithCustomEnemies } from '@/engine/battleEngine';
import { useGameStore } from '@/store/useGameStore';
import { useBattleStore } from '@/store/useBattleStore';

interface StoryState {
  storyData: StorySaveData | null;
  isInitialized: boolean;
  selectedChapterId: string;
  selectedStageId: string | null;
  showStageDetail: boolean;
  battleResult: StageBattleResult | null;
  showBattleResult: boolean;

  initStory: () => void;
  loadStoryData: () => void;
  saveStoryData: () => void;

  setSelectedChapter: (chapterId: string) => void;
  setSelectedStage: (stageId: string | null) => void;
  setShowStageDetail: (show: boolean) => void;
  setShowBattleResult: (show: boolean) => void;

  isChapterUnlocked: (chapterId: string) => boolean;
  isStageUnlocked: (stageId: string) => boolean;
  isStageCompleted: (stageId: string) => boolean;
  isStageFirstCleared: (stageId: string) => boolean;

  getChapterProgress: (chapterId: string) => ChapterProgress | undefined;
  getStageProgress: (stageId: string) => StageProgress | undefined;
  getTotalCompletedStages: () => number;
  getTotalCompletedStagesInChapter: (chapterId: string) => number;

  getCurrentStamina: () => number;
  regenerateStamina: () => void;
  spendStamina: (amount: number) => boolean;

  createEnemyAnimal: (enemy: StageEnemy) => Animal;
  createEnemyLineup: (stage: StageTemplate) => {
    animals: Animal[];
    lineupConfig: {
      animals: { animalId: string; position: FormationPosition; targetStrategy: TargetStrategy }[];
      actionPriority: ActionPriority;
    };
  };

  startStageBattle: (stageId: string) => { success: boolean; message?: string };
  processBattleResult: (stageId: string, isWin: boolean) => StageBattleResult;
  claimRewards: (rewards: StageBattleResult['rewards']) => void;

  resetStoryProgress: () => void;
}

const createInitialStoryData = (): StorySaveData => {
  const chapters: Record<string, ChapterProgress> = {};

  CHAPTER_TEMPLATES.forEach((chapter, index) => {
    const stages: Record<string, StageProgress> = {};
    chapter.stages.forEach(stage => {
      stages[stage.id] = {
        stageId: stage.id,
        completed: false,
        firstCleared: false,
        attempts: 0,
        totalClears: 0,
      };
    });

    chapters[chapter.id] = {
      chapterId: chapter.id,
      unlocked: index === 0,
      stages,
      totalStars: 0,
      unlockedAt: index === 0 ? Date.now() : undefined,
    };
  });

  return {
    currentChapterId: CHAPTER_TEMPLATES[0].id,
    chapters,
    totalStamina: STORY_CONSTANTS.MAX_STAMINA,
    maxStamina: STORY_CONSTANTS.MAX_STAMINA,
    lastStaminaRegenTime: Date.now(),
    storyNarrativeProgress: {},
  };
};

export const useStoryStore = create<StoryState>((set, get) => ({
  storyData: null,
  isInitialized: false,
  selectedChapterId: CHAPTER_TEMPLATES[0].id,
  selectedStageId: null,
  showStageDetail: false,
  battleResult: null,
  showBattleResult: false,

  initStory: () => {
    if (get().isInitialized) return;

    const gameStore = useGameStore.getState();
    const saveData = gameStore.storyData;

    if (saveData) {
      set({ storyData: saveData, isInitialized: true });
    } else {
      const initialData = createInitialStoryData();
      set({ storyData: initialData, isInitialized: true });
      get().saveStoryData();
    }

    get().regenerateStamina();
  },

  loadStoryData: () => {
    const gameStore = useGameStore.getState();
    const saveData = gameStore.storyData;
    if (saveData) {
      set({ storyData: saveData });
    }
  },

  saveStoryData: () => {
    const { storyData } = get();
    if (!storyData) return;

    const gameStore = useGameStore.getState();
    (gameStore as unknown as { storyData: StorySaveData | null }).storyData = storyData;
    gameStore.saveGame();
  },

  setSelectedChapter: (chapterId: string) => {
    set({ selectedChapterId: chapterId });
  },

  setSelectedStage: (stageId: string | null) => {
    set({ selectedStageId: stageId });
  },

  setShowStageDetail: (show: boolean) => {
    set({ showStageDetail: show });
  },

  setShowBattleResult: (show: boolean) => {
    set({ showBattleResult: show });
  },

  isChapterUnlocked: (chapterId: string): boolean => {
    const { storyData } = get();
    if (!storyData) return false;
    return storyData.chapters[chapterId]?.unlocked ?? false;
  },

  isStageUnlocked: (stageId: string): boolean => {
    const { storyData } = get();
    if (!storyData) return false;

    const stage = getStageTemplate(stageId);
    if (!stage) return false;

    const chapterProgress = storyData.chapters[stage.chapterId];
    if (!chapterProgress?.unlocked) return false;

    if (!stage.requiredStageId) return true;

    const requiredStageProgress = chapterProgress.stages[stage.requiredStageId];
    return requiredStageProgress?.completed ?? false;
  },

  isStageCompleted: (stageId: string): boolean => {
    const { storyData } = get();
    if (!storyData) return false;

    const stage = getStageTemplate(stageId);
    if (!stage) return false;

    const chapterProgress = storyData.chapters[stage.chapterId];
    return chapterProgress?.stages[stageId]?.completed ?? false;
  },

  isStageFirstCleared: (stageId: string): boolean => {
    const { storyData } = get();
    if (!storyData) return false;

    const stage = getStageTemplate(stageId);
    if (!stage) return false;

    const chapterProgress = storyData.chapters[stage.chapterId];
    return chapterProgress?.stages[stageId]?.firstCleared ?? false;
  },

  getChapterProgress: (chapterId: string) => {
    return get().storyData?.chapters[chapterId];
  },

  getStageProgress: (stageId: string) => {
    const stage = getStageTemplate(stageId);
    if (!stage) return undefined;
    return get().storyData?.chapters[stage.chapterId]?.stages[stageId];
  },

  getTotalCompletedStages: (): number => {
    const { storyData } = get();
    if (!storyData) return 0;

    let count = 0;
    Object.values(storyData.chapters).forEach(chapter => {
      Object.values(chapter.stages).forEach(stage => {
        if (stage.completed) count++;
      });
    });
    return count;
  },

  getTotalCompletedStagesInChapter: (chapterId: string): number => {
    const { storyData } = get();
    if (!storyData) return 0;

    const chapterProgress = storyData.chapters[chapterId];
    if (!chapterProgress) return 0;

    return Object.values(chapterProgress.stages).filter(s => s.completed).length;
  },

  getCurrentStamina: (): number => {
    get().regenerateStamina();
    return get().storyData?.totalStamina ?? 0;
  },

  regenerateStamina: () => {
    const { storyData } = get();
    if (!storyData) return;

    const now = Date.now();
    const timeSinceLastRegen = now - storyData.lastStaminaRegenTime;

    if (timeSinceLastRegen >= STORY_CONSTANTS.STAMINA_REGEN_INTERVAL_MS) {
      const regenAmount = Math.floor(
        timeSinceLastRegen / STORY_CONSTANTS.STAMINA_REGEN_INTERVAL_MS
      ) * STORY_CONSTANTS.STAMINA_REGEN_RATE;

      const newStamina = Math.min(
        storyData.totalStamina + regenAmount,
        storyData.maxStamina
      );

      if (newStamina > storyData.totalStamina) {
        const regenIntervalsPassed = Math.floor(
          timeSinceLastRegen / STORY_CONSTANTS.STAMINA_REGEN_INTERVAL_MS
        );
        const newLastRegenTime = storyData.lastStaminaRegenTime +
          regenIntervalsPassed * STORY_CONSTANTS.STAMINA_REGEN_INTERVAL_MS;

        set({
          storyData: {
            ...storyData,
            totalStamina: newStamina,
            lastStaminaRegenTime: newLastRegenTime,
          },
        });
        get().saveStoryData();
      }
    }
  },

  spendStamina: (amount: number): boolean => {
    const { storyData } = get();
    if (!storyData || storyData.totalStamina < amount) return false;

    set({
      storyData: {
        ...storyData,
        totalStamina: storyData.totalStamina - amount,
      },
    });
    get().saveStoryData();
    return true;
  },

  createEnemyAnimal: (enemy: StageEnemy): Animal => {
    const template = getAnimalTemplate(enemy.animalTemplateId);
    if (!template) {
      throw new Error(`Animal template not found: ${enemy.animalTemplateId}`);
    }

    const skills = enemy.skills.map(skillId => ({
      skillId,
      level: Math.min(5, Math.ceil(enemy.level / 2)),
    }));

    const parts: { partId: string; instanceId: string; slot: import('@/types').PartSlot; quality: import('@/types').PartQuality }[] = [];
    if (enemy.parts) {
      enemy.parts.forEach(partId => {
        const partTemplate = getPartTemplate(partId);
        if (partTemplate) {
          parts.push({
            partId,
            instanceId: generateId('part'),
            slot: partTemplate.slot,
            quality: rollPartQuality(enemy.starLevel as unknown as import('@/types').Rarity),
          });
        }
      });
    }

    return {
      id: generateAnimalId(),
      templateId: enemy.animalTemplateId,
      name: template.name,
      rarity: template.rarity,
      level: enemy.level,
      starLevel: enemy.starLevel,
      breakthroughTier: enemy.breakthroughTier,
      parts,
      skills,
      exp: 0,
      expToNext: 100 * enemy.level,
    };
  },

  createEnemyLineup: (stage: StageTemplate) => {
    const animals = stage.enemies.map(enemy => get().createEnemyAnimal(enemy));

    const lineupConfig = {
      animals: animals.map((animal, index) => ({
        animalId: animal.id,
        position: stage.formationPosition[index] || 'mid',
        targetStrategy: 'lowestHp' as TargetStrategy,
      })),
      actionPriority: 'speedFirst' as ActionPriority,
    };

    return { animals, lineupConfig };
  },

  startStageBattle: (stageId: string) => {
    const { storyData, createEnemyLineup } = get();
    if (!storyData) return { success: false, message: '剧情数据未初始化' };

    const stage = getStageTemplate(stageId);
    if (!stage) return { success: false, message: '关卡不存在' };

    if (!get().isStageUnlocked(stageId)) {
      return { success: false, message: '关卡未解锁' };
    }

    if (!get().spendStamina(stage.staminaCost)) {
      return { success: false, message: '体力不足' };
    }

    const gameStore = useGameStore.getState();
    const playerLineupAnimals = gameStore.getLineupAnimals();

    if (playerLineupAnimals.length === 0) {
      return { success: false, message: '请先配置出战阵容' };
    }

    const { animals: enemyAnimals, lineupConfig: enemyLineupConfig } = createEnemyLineup(stage);

    const allOwnedTemplateIds = new Set(gameStore.ownedAnimals.map(a => a.templateId));
    const result = simulateFullBattleWithCustomEnemies(
      playerLineupAnimals,
      0,
      gameStore.lineupConfig,
      { enemyAnimals, enemyLineupConfig },
      allOwnedTemplateIds
    );

    const battleRecord = {
      id: generateBattleId(),
      timestamp: Date.now(),
      opponentName: stage.name,
      opponentAvatar: stage.emoji,
      isWin: result.isWin,
      betAmount: 0,
      reward: 0,
      playerLineup: playerLineupAnimals.map(a => a.id),
      enemyLineup: enemyAnimals.map(a => a.id),
      battleLog: result.battleLog,
      playerUnits: result.playerUnits,
      enemyUnits: result.enemyUnits,
      initialPlayerUnits: result.initialPlayerUnits,
      initialEnemyUnits: result.initialEnemyUnits,
    };

    const battleStore = useBattleStore.getState();
    battleStore.initBattle(battleRecord);

    gameStore.battleHistory.unshift(battleRecord);
    gameStore.saveGame();

    const battleResult = get().processBattleResult(stageId, result.isWin);
    set({ battleResult, showBattleResult: true });

    if (result.isWin) {
      get().claimRewards(battleResult.rewards);
    }

    return { success: true };
  },

  processBattleResult: (stageId: string, isWin: boolean): StageBattleResult => {
    const { storyData } = get();
    if (!storyData) {
      return { isWin: false, rewards: [] };
    }

    const stage = getStageTemplate(stageId);
    if (!stage) {
      return { isWin: false, rewards: [] };
    }

    const chapterProgress = storyData.chapters[stage.chapterId];
    const stageProgress = chapterProgress?.stages[stageId];

    if (!stageProgress) {
      return { isWin: false, rewards: [] };
    }

    const isFirstClear = !stageProgress.firstCleared && isWin;

    const newStageProgress: StageProgress = {
      ...stageProgress,
      completed: stageProgress.completed || isWin,
      firstCleared: stageProgress.firstCleared || isWin,
      attempts: stageProgress.attempts + 1,
      totalClears: stageProgress.totalClears + (isWin ? 1 : 0),
      clearedAt: isWin ? Date.now() : stageProgress.clearedAt,
    };

    const newChapterProgress: ChapterProgress = {
      ...chapterProgress,
      stages: {
        ...chapterProgress.stages,
        [stageId]: newStageProgress,
      },
    };

    let newChapters = {
      ...storyData.chapters,
      [stage.chapterId]: newChapterProgress,
    };

    if (isWin) {
      const totalCompleted = get().getTotalCompletedStages() + 1;
      CHAPTER_TEMPLATES.forEach(chapter => {
        if (!newChapters[chapter.id].unlocked && chapter.requiredCompletedStages) {
          if (totalCompleted >= chapter.requiredCompletedStages) {
            newChapters = {
              ...newChapters,
              [chapter.id]: {
                ...newChapters[chapter.id],
                unlocked: true,
                unlockedAt: Date.now(),
              },
            };
          }
        }
      });
    }

    const newStoryData: StorySaveData = {
      ...storyData,
      chapters: newChapters,
    };

    set({ storyData: newStoryData });
    get().saveStoryData();

    const rewards: StageBattleResult['rewards'] = [];

    if (isWin) {
      stage.drops.forEach(drop => {
        if (Math.random() * 100 < drop.dropRate) {
          rewards.push({
            type: drop.type,
            templateId: drop.templateId,
            amount: drop.amount,
            isFirstClear: false,
          });
        }
      });

      if (isFirstClear) {
        stage.firstClearRewards.forEach(reward => {
          rewards.push({
            type: reward.type,
            templateId: reward.templateId,
            amount: reward.amount,
            isFirstClear: true,
          });
        });
      }
    }

    return { isWin, rewards };
  },

  claimRewards: (rewards: StageBattleResult['rewards']) => {
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
        case 'animal':
          if (reward.templateId) {
            const template = getAnimalTemplate(reward.templateId);
            if (template) {
              const animal: Animal = {
                id: generateAnimalId(),
                templateId: reward.templateId,
                name: template.name,
                rarity: template.rarity,
                level: 1,
                starLevel: 1,
                breakthroughTier: 0,
                parts: [],
                skills: [],
                exp: 0,
                expToNext: 100,
              };
              gameStore.addAnimal(animal);
            }
          }
          break;
        case 'part':
          if (reward.templateId) {
            const template = getPartTemplate(reward.templateId);
            if (template) {
              const part = {
                ...template,
                id: generateId('part'),
                templateId: reward.templateId,
                quality: rollPartQuality(template.rarity),
                setId: template.setId,
              };
              gameStore.addPart(part);
            }
          }
          break;
        case 'skill':
          if (reward.templateId) {
            const template = getSkillTemplate(reward.templateId);
            if (template) {
              const skill = {
                ...template,
                id: generateId('skill'),
                templateId: reward.templateId,
              };
              gameStore.addSkill(skill);
            }
          }
          break;
      }
    });
  },

  resetStoryProgress: () => {
    const initialData = createInitialStoryData();
    set({ storyData: initialData, selectedChapterId: CHAPTER_TEMPLATES[0].id, selectedStageId: null });
    get().saveStoryData();
  },
}));
