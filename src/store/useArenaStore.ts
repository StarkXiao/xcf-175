import { create } from 'zustand';
import type {
  ArenaSaveData,
  ArenaRankInfo,
  ArenaOpponent,
  ArenaChallengeRecord,
  ArenaDefenseConfig,
  ArenaDailyReward,
  ArenaAttackResult,
  LineupConfig,
  Animal,
  BattleRecord,
} from '@/types';
import {
  createDefaultArenaRankInfo,
  calculateArenaTierFromPoints,
  calculateArenaRankFromPoints,
  calculatePointsChange,
  generateArenaOpponents,
  createOpponentAnimals,
  calculateDailyReward,
  getDailyRewardCooldown,
  getOpponentRefreshCooldown,
  isSameDay,
  createArenaDefenseConfig,
  getArenaTierConfig,
} from '@/data/arena';
import { ARENA_CONSTANTS } from '@/engine/constants';
import { simulateFullBattle } from '@/engine/battleEngine';
import { generateId, generateBattleId } from '@/utils/id';
import { useGameStore } from '@/store/useGameStore';

const ARENA_SAVE_KEY = 'neon_colosseum_arena_v1';

interface ArenaState {
  isInitialized: boolean;
  isLoading: boolean;
  defenseConfig: ArenaDefenseConfig | null;
  rankInfo: ArenaRankInfo;
  challengeHistory: ArenaChallengeRecord[];
  dailyRewards: ArenaDailyReward[];
  lastDailyRewardDate: string;
  lastAttackTime: number;
  lastDefenseTime: number;
  attackCountToday: number;
  defenseCountToday: number;
  maxDailyAttacks: number;
  maxDailyDefenses: number;
  opponents: ArenaOpponent[];
  opponentsRefreshTime: number;
  selectedOpponent: ArenaOpponent | null;
  isBattling: boolean;
  lastAttackResult: ArenaAttackResult | null;
  showDailyRewardModal: boolean;
  pendingDailyReward: ArenaDailyReward | null;

  initArena: () => void;
  saveArena: () => void;
  loadArena: () => boolean;
  resetArena: () => void;

  setDefenseConfig: (animalIds: string[], lineupConfig: LineupConfig) => void;
  clearDefenseConfig: () => void;

  refreshOpponents: () => { success: boolean; cooldown: number };
  selectOpponent: (opponent: ArenaOpponent | null) => void;

  attackOpponent: (opponent: ArenaOpponent) => Promise<ArenaAttackResult>;
  simulateDefense: () => ArenaChallengeRecord | null;

  claimDailyReward: () => { success: boolean; reward: ArenaDailyReward | null };
  checkDailyReward: () => ArenaDailyReward | null;

  getAttackCooldown: () => number;
  getRefreshCooldown: () => number;
  canAttack: () => boolean;
  canRefreshOpponents: () => boolean;

  updateDailyCounters: () => void;
}

const createInitialArenaState = (): Omit<ArenaState, 'initArena' | 'saveArena' | 'loadArena' | 'resetArena' |
  'setDefenseConfig' | 'clearDefenseConfig' | 'refreshOpponents' | 'selectOpponent' |
  'attackOpponent' | 'simulateDefense' | 'claimDailyReward' | 'checkDailyReward' |
  'getAttackCooldown' | 'getRefreshCooldown' | 'canAttack' | 'canRefreshOpponents' |
  'updateDailyCounters'> => ({
  isInitialized: false,
  isLoading: true,
  defenseConfig: null,
  rankInfo: createDefaultArenaRankInfo(),
  challengeHistory: [],
  dailyRewards: [],
  lastDailyRewardDate: '',
  lastAttackTime: 0,
  lastDefenseTime: 0,
  attackCountToday: 0,
  defenseCountToday: 0,
  maxDailyAttacks: ARENA_CONSTANTS.MAX_DAILY_ATTACKS,
  maxDailyDefenses: ARENA_CONSTANTS.MAX_DAILY_DEFENSES,
  opponents: [],
  opponentsRefreshTime: 0,
  selectedOpponent: null,
  isBattling: false,
  lastAttackResult: null,
  showDailyRewardModal: false,
  pendingDailyReward: null,
});

export const useArenaStore = create<ArenaState>((set, get) => ({
  ...createInitialArenaState(),

  initArena: () => {
    const loaded = get().loadArena();
    if (!loaded) {
      const gameState = useGameStore.getState();
      const ownedTemplateIds = new Set(gameState.ownedAnimals.map(a => a.templateId));
      const opponents = generateArenaOpponents(0, 'rookie', Array.from(ownedTemplateIds));

      set({
        ...createInitialArenaState(),
        isInitialized: true,
        isLoading: false,
        opponents,
        opponentsRefreshTime: Date.now(),
      });
      get().saveArena();
    } else {
      get().updateDailyCounters();
      const pendingReward = get().checkDailyReward();
      if (pendingReward) {
        set({ pendingDailyReward: pendingReward, showDailyRewardModal: true });
      }
    }
  },

  saveArena: () => {
    const state = get();
    const saveData: ArenaSaveData = {
      defenseConfig: state.defenseConfig,
      rankInfo: state.rankInfo,
      challengeHistory: state.challengeHistory.slice(-100),
      dailyRewards: state.dailyRewards.slice(-30),
      lastDailyRewardDate: state.lastDailyRewardDate,
      lastAttackTime: state.lastAttackTime,
      lastDefenseTime: state.lastDefenseTime,
      attackCountToday: state.attackCountToday,
      defenseCountToday: state.defenseCountToday,
      maxDailyAttacks: state.maxDailyAttacks,
      maxDailyDefenses: state.maxDailyDefenses,
      opponents: state.opponents,
      opponentsRefreshTime: state.opponentsRefreshTime,
    };

    try {
      localStorage.setItem(ARENA_SAVE_KEY, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to save arena:', error);
    }
  },

  loadArena: (): boolean => {
    try {
      const raw = localStorage.getItem(ARENA_SAVE_KEY);
      if (!raw) return false;

      const data: ArenaSaveData = JSON.parse(raw);

      set({
        isInitialized: true,
        isLoading: false,
        defenseConfig: data.defenseConfig,
        rankInfo: data.rankInfo,
        challengeHistory: data.challengeHistory || [],
        dailyRewards: data.dailyRewards || [],
        lastDailyRewardDate: data.lastDailyRewardDate || '',
        lastAttackTime: data.lastAttackTime || 0,
        lastDefenseTime: data.lastDefenseTime || 0,
        attackCountToday: data.attackCountToday || 0,
        defenseCountToday: data.defenseCountToday || 0,
        maxDailyAttacks: data.maxDailyAttacks || ARENA_CONSTANTS.MAX_DAILY_ATTACKS,
        maxDailyDefenses: data.maxDailyDefenses || ARENA_CONSTANTS.MAX_DAILY_DEFENSES,
        opponents: data.opponents || [],
        opponentsRefreshTime: data.opponentsRefreshTime || 0,
      });

      return true;
    } catch (error) {
      console.error('Failed to load arena:', error);
      return false;
    }
  },

  resetArena: () => {
    try {
      localStorage.removeItem(ARENA_SAVE_KEY);
    } catch (error) {
      console.error('Failed to reset arena:', error);
    }

    const gameState = useGameStore.getState();
    const ownedTemplateIds = new Set(gameState.ownedAnimals.map(a => a.templateId));
    const opponents = generateArenaOpponents(0, 'rookie', Array.from(ownedTemplateIds));

    set({
      ...createInitialArenaState(),
      isInitialized: true,
      isLoading: false,
      opponents,
      opponentsRefreshTime: Date.now(),
    });
    get().saveArena();
  },

  setDefenseConfig: (animalIds: string[], lineupConfig: LineupConfig) => {
    const config = createArenaDefenseConfig(animalIds, lineupConfig);
    set({ defenseConfig: config });
    get().saveArena();
  },

  clearDefenseConfig: () => {
    set({ defenseConfig: null });
    get().saveArena();
  },

  refreshOpponents: () => {
    const state = get();
    const cooldown = getOpponentRefreshCooldown(state.opponentsRefreshTime);

    if (cooldown > 0) {
      return { success: false, cooldown };
    }

    const gameState = useGameStore.getState();
    const ownedTemplateIds = new Set(gameState.ownedAnimals.map(a => a.templateId));
    const opponents = generateArenaOpponents(
      state.rankInfo.arenaPoints,
      state.rankInfo.tier,
      Array.from(ownedTemplateIds)
    );

    set({
      opponents,
      opponentsRefreshTime: Date.now(),
      selectedOpponent: null,
    });
    get().saveArena();

    return { success: true, cooldown: 0 };
  },

  selectOpponent: (opponent: ArenaOpponent | null) => {
    set({ selectedOpponent: opponent });
  },

  attackOpponent: async (opponent: ArenaOpponent): Promise<ArenaAttackResult> => {
    const state = get();

    if (!state.canAttack()) {
      return {
        success: false,
        isWin: false,
        arenaPointsChange: 0,
        newRank: state.rankInfo.rank,
        newPoints: state.rankInfo.arenaPoints,
      };
    }

    set({ isBattling: true });

    const gameState = useGameStore.getState();
    const playerAnimals = gameState.lineup
      .map(id => gameState.ownedAnimals.find(a => a.id === id))
      .filter(Boolean) as Animal[];

    if (playerAnimals.length === 0) {
      set({ isBattling: false });
      return {
        success: false,
        isWin: false,
        arenaPointsChange: 0,
        newRank: state.rankInfo.rank,
        newPoints: state.rankInfo.arenaPoints,
      };
    }

    const enemyAnimals = createOpponentAnimals(opponent);

    const battleResult = simulateFullBattle(
      playerAnimals,
      0,
      gameState.lineupConfig,
      undefined,
      opponent.difficulty,
      new Set(gameState.ownedAnimals.map(a => a.templateId))
    );

    const isWin = battleResult.isWin;
    const pointsChange = calculatePointsChange(
      state.rankInfo.arenaPoints,
      opponent.arenaPoints,
      isWin,
      opponent.difficulty
    );

    const newPoints = Math.max(0, state.rankInfo.arenaPoints + pointsChange);
    const newTier = calculateArenaTierFromPoints(newPoints);
    const newRank = calculateArenaRankFromPoints(newPoints);

    const winStreakBonus = isWin
      ? Math.min(ARENA_CONSTANTS.MAX_WIN_STREAK_BONUS, state.rankInfo.winStreak * ARENA_CONSTANTS.WIN_STREAK_BONUS)
      : 0;
    const finalPointsChange = isWin ? pointsChange + winStreakBonus : pointsChange;
    const finalNewPoints = Math.max(0, state.rankInfo.arenaPoints + finalPointsChange);

    const battleRecord: BattleRecord = {
      id: generateBattleId(),
      timestamp: Date.now(),
      opponentName: opponent.name,
      opponentAvatar: opponent.avatar,
      isWin,
      betAmount: 0,
      reward: 0,
      playerLineup: playerAnimals.map(a => a.id),
      enemyLineup: enemyAnimals.map(a => a.id),
      battleLog: battleResult.battleLog,
      playerUnits: battleResult.playerUnits,
      enemyUnits: battleResult.enemyUnits,
      initialPlayerUnits: battleResult.initialPlayerUnits,
      initialEnemyUnits: battleResult.initialEnemyUnits,
    };

    const challengeRecord: ArenaChallengeRecord = {
      id: generateId('challenge'),
      timestamp: Date.now(),
      challengerName: '你',
      challengerAvatar: '⚔️',
      defenderName: opponent.name,
      defenderAvatar: opponent.avatar,
      isPlayerAttacker: true,
      isWin,
      arenaPointsChange: finalPointsChange,
      battleRecordId: battleRecord.id,
      battleLog: battleResult.battleLog,
      playerUnits: battleResult.playerUnits,
      enemyUnits: battleResult.enemyUnits,
      initialPlayerUnits: battleResult.initialPlayerUnits,
      initialEnemyUnits: battleResult.initialEnemyUnits,
    };

    const updatedRankInfo: ArenaRankInfo = {
      ...state.rankInfo,
      arenaPoints: finalNewPoints,
      tier: newTier,
      rank: newRank,
      wins: state.rankInfo.wins + (isWin ? 1 : 0),
      losses: state.rankInfo.losses + (isWin ? 0 : 1),
      winStreak: isWin ? state.rankInfo.winStreak + 1 : 0,
      highestRank: Math.min(state.rankInfo.highestRank, newRank),
      highestPoints: Math.max(state.rankInfo.highestPoints, finalNewPoints),
      totalAttacks: state.rankInfo.totalAttacks + 1,
    };

    const newOpponents = state.opponents.filter(o => o.id !== opponent.id);

    set(s => ({
      isBattling: false,
      rankInfo: updatedRankInfo,
      challengeHistory: [...s.challengeHistory, challengeRecord].slice(-100),
      attackCountToday: s.attackCountToday + 1,
      lastAttackTime: Date.now(),
      opponents: newOpponents,
      selectedOpponent: null,
      lastAttackResult: {
        success: true,
        isWin,
        arenaPointsChange: finalPointsChange,
        newRank,
        newPoints: finalNewPoints,
        battleRecord,
      },
    }));

    useGameStore.getState().battleHistory.push(battleRecord);
    useGameStore.getState().saveGame();
    get().saveArena();

    return {
      success: true,
      isWin,
      arenaPointsChange: finalPointsChange,
      newRank,
      newPoints: finalNewPoints,
      battleRecord,
    };
  },

  simulateDefense: (): ArenaChallengeRecord | null => {
    const state = get();
    if (!state.defenseConfig || state.defenseConfig.animalIds.length === 0) {
      return null;
    }

    if (state.defenseCountToday >= state.maxDailyDefenses) {
      return null;
    }

    const gameState = useGameStore.getState();
    const defenseAnimals = state.defenseConfig.animalIds
      .map(id => gameState.ownedAnimals.find(a => a.id === id))
      .filter(Boolean) as Animal[];

    if (defenseAnimals.length === 0) {
      return null;
    }

    const ownedTemplateIds = new Set(gameState.ownedAnimals.map(a => a.templateId));
    const opponents = generateArenaOpponents(
      state.rankInfo.arenaPoints,
      state.rankInfo.tier,
      Array.from(ownedTemplateIds)
    );
    const attacker = opponents[Math.floor(Math.random() * opponents.length)];
    const attackerAnimals = createOpponentAnimals(attacker);

    const battleResult = simulateFullBattle(
      attackerAnimals,
      0,
      attacker.lineupConfig,
      undefined,
      attacker.difficulty
    );

    const isWin = !battleResult.isWin;

    const pointsChange = calculatePointsChange(
      state.rankInfo.arenaPoints,
      attacker.arenaPoints,
      isWin,
      attacker.difficulty
    );

    const newPoints = Math.max(0, state.rankInfo.arenaPoints + (isWin ? Math.abs(pointsChange) : -Math.abs(pointsChange)));
    const newTier = calculateArenaTierFromPoints(newPoints);
    const newRank = calculateArenaRankFromPoints(newPoints);

    const challengeRecord: ArenaChallengeRecord = {
      id: generateId('challenge'),
      timestamp: Date.now(),
      challengerName: attacker.name,
      challengerAvatar: attacker.avatar,
      defenderName: '你',
      defenderAvatar: '⚔️',
      isPlayerAttacker: false,
      isWin,
      arenaPointsChange: isWin ? Math.abs(pointsChange) : -Math.abs(pointsChange),
      battleRecordId: generateBattleId(),
      battleLog: battleResult.battleLog,
      playerUnits: battleResult.enemyUnits,
      enemyUnits: battleResult.playerUnits,
      initialPlayerUnits: battleResult.initialEnemyUnits,
      initialEnemyUnits: battleResult.initialPlayerUnits,
    };

    const updatedRankInfo: ArenaRankInfo = {
      ...state.rankInfo,
      arenaPoints: newPoints,
      tier: newTier,
      rank: newRank,
      wins: state.rankInfo.wins + (isWin ? 1 : 0),
      losses: state.rankInfo.losses + (isWin ? 0 : 1),
      winStreak: isWin ? state.rankInfo.winStreak + 1 : 0,
      highestRank: Math.min(state.rankInfo.highestRank, newRank),
      highestPoints: Math.max(state.rankInfo.highestPoints, newPoints),
      totalDefenses: state.rankInfo.totalDefenses + 1,
      defenseWins: state.rankInfo.defenseWins + (isWin ? 1 : 0),
    };

    set(s => ({
      rankInfo: updatedRankInfo,
      challengeHistory: [...s.challengeHistory, challengeRecord].slice(-100),
      defenseCountToday: s.defenseCountToday + 1,
      lastDefenseTime: Date.now(),
    }));
    get().saveArena();

    return challengeRecord;
  },

  claimDailyReward: () => {
    const state = get();
    const reward = state.pendingDailyReward || state.checkDailyReward();

    if (!reward || reward.claimed) {
      return { success: false, reward: null };
    }

    const gameState = useGameStore.getState();
    gameState.addCoins(reward.coins);
    gameState.addGems(reward.gems);

    if (reward.materials) {
      gameState.addMaterials(reward.materials);
    }

    const claimedReward: ArenaDailyReward = { ...reward, claimed: true };

    set(s => ({
      dailyRewards: [...s.dailyRewards, claimedReward].slice(-30),
      lastDailyRewardDate: reward.date,
      showDailyRewardModal: false,
      pendingDailyReward: null,
    }));
    get().saveArena();

    return { success: true, reward: claimedReward };
  },

  checkDailyReward: (): ArenaDailyReward | null => {
    const state = get();
    const cooldown = getDailyRewardCooldown(state.lastDailyRewardDate);

    if (cooldown > 0) {
      return null;
    }

    const reward = calculateDailyReward(
      state.rankInfo.rank,
      state.rankInfo.tier,
      state.rankInfo.arenaPoints
    );

    return reward;
  },

  getAttackCooldown: (): number => {
    const state = get();
    const cooldownMs = ARENA_CONSTANTS.ATTACK_COOLDOWN * 1000;
    return Math.max(0, cooldownMs - (Date.now() - state.lastAttackTime));
  },

  getRefreshCooldown: (): number => {
    return getOpponentRefreshCooldown(get().opponentsRefreshTime);
  },

  canAttack: (): boolean => {
    const state = get();
    return state.attackCountToday < state.maxDailyAttacks && state.getAttackCooldown() === 0;
  },

  canRefreshOpponents: (): boolean => {
    return get().getRefreshCooldown() === 0;
  },

  updateDailyCounters: () => {
    const state = get();
    let needUpdate = false;

    let newAttackCount = state.attackCountToday;
    let newDefenseCount = state.defenseCountToday;

    if (!isSameDay(state.lastAttackTime)) {
      newAttackCount = 0;
      needUpdate = true;
    }

    if (!isSameDay(state.lastDefenseTime)) {
      newDefenseCount = 0;
      needUpdate = true;
    }

    if (needUpdate) {
      set({
        attackCountToday: newAttackCount,
        defenseCountToday: newDefenseCount,
      });
      get().saveArena();
    }
  },
}));
