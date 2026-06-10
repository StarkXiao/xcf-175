import { create } from 'zustand';
import type {
  RankInfo,
  SeasonInfo,
  SeasonRecord,
  RankChangeResult,
  DynamicDifficultyTier,
  LeaderboardEntry,
  MatchmakingResult,
  SeasonBattleSummary,
  SeasonSettlementResult,
  SeasonStats,
  RankProtectionState,
} from '@/types';
import {
  createDefaultRankInfo,
  createSeason,
  isSeasonEnded,
  isSeasonEndingSoon,
  updateRankAfterBattle,
  archiveSeason,
  settleSeason,
  generateLeaderboard,
  getSeasonRewardsForTier,
  calculateMatchmaking,
  getProtectionState,
  computeSeasonStats,
} from '@/data/seasons';
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/save';

const SEASON_SAVE_KEY = 'neon_colosseum_season_v2';

interface SeasonState {
  currentRank: RankInfo;
  currentSeason: SeasonInfo;
  seasonHistory: SeasonRecord[];
  lastRankChange: RankChangeResult | null;
  lastMatchmaking: MatchmakingResult | null;
  battleSummaries: SeasonBattleSummary[];
  protectionState: RankProtectionState;
  isMatchmaking: boolean;
  pendingSettlement: SeasonSettlementResult | null;

  initSeason: () => void;
  startMatchmaking: () => MatchmakingResult;
  processBattleResult: (isWin: boolean, winStreak: number, difficultyTier: DynamicDifficultyTier, opponentName: string, opponentAvatar: string) => RankChangeResult;
  checkSeasonReset: () => boolean;
  claimSeasonRewards: (seasonId: string) => { coins: number; gems: number } | null;
  getLeaderboard: (count?: number) => LeaderboardEntry[];
  resetSeason: () => void;
  saveSeason: () => void;
  getSeasonStats: () => SeasonStats;
  checkSeasonSettlement: () => SeasonSettlementResult | null;
  confirmSettlement: () => void;
}

interface SeasonSavePayload {
  currentRank: RankInfo;
  currentSeason: SeasonInfo;
  seasonHistory: SeasonRecord[];
  battleSummaries: SeasonBattleSummary[];
}

export const useSeasonStore = create<SeasonState>((set, get) => ({
  currentRank: createDefaultRankInfo(),
  currentSeason: createSeason(0),
  seasonHistory: [],
  lastRankChange: null,
  lastMatchmaking: null,
  battleSummaries: [],
  protectionState: { remainingCount: 99, maxCount: 99, isActive: true },
  isMatchmaking: false,
  pendingSettlement: null,

  initSeason: () => {
    try {
      const raw = localStorage.getItem(SEASON_SAVE_KEY);
      if (raw) {
        const data: SeasonSavePayload = JSON.parse(raw);
        const season = data.currentSeason;

        if (isSeasonEnded(season)) {
          const record = archiveSeason(season, data.currentRank, data.battleSummaries || []);
          const settlement = settleSeason(season, data.currentRank, data.battleSummaries || []);
          const newSeason = createSeason();
          const newRank = {
            ...createDefaultRankInfo(),
            tier: settlement.placementRank.tier,
            subTier: settlement.placementRank.subTier,
            points: settlement.placementRank.points,
            highestTier: settlement.placementRank.tier,
            highestSubTier: settlement.placementRank.subTier,
          };

          set({
            currentRank: newRank,
            currentSeason: newSeason,
            seasonHistory: [record, ...data.seasonHistory],
            lastRankChange: null,
            lastMatchmaking: null,
            battleSummaries: [],
            protectionState: getProtectionState(newRank),
            pendingSettlement: settlement,
          });
          get().saveSeason();
          return;
        }

        const protection = getProtectionState(data.currentRank);
        set({
          currentRank: data.currentRank,
          currentSeason: season,
          seasonHistory: data.seasonHistory || [],
          lastRankChange: null,
          lastMatchmaking: null,
          battleSummaries: data.battleSummaries || [],
          protectionState: protection,
        });
        return;
      }
    } catch {
      // fall through to default
    }

    const season = createSeason(0);
    const defaultRank = createDefaultRankInfo();
    set({
      currentRank: defaultRank,
      currentSeason: season,
      seasonHistory: [],
      lastRankChange: null,
      lastMatchmaking: null,
      battleSummaries: [],
      protectionState: getProtectionState(defaultRank),
    });
    get().saveSeason();
  },

  startMatchmaking: (): MatchmakingResult => {
    const state = get();
    set({ isMatchmaking: true });
    const matchmaking = calculateMatchmaking(state.currentRank);
    set({ lastMatchmaking: matchmaking, isMatchmaking: false });
    return matchmaking;
  },

  processBattleResult: (isWin: boolean, winStreak: number, difficultyTier: DynamicDifficultyTier, opponentName: string, opponentAvatar: string): RankChangeResult => {
    const state = get();
    const matchmaking = state.lastMatchmaking || undefined;
    const { rank, change } = updateRankAfterBattle(
      state.currentRank,
      isWin,
      winStreak,
      difficultyTier,
      matchmaking,
    );

    const summary: SeasonBattleSummary = {
      isWin,
      rankChange: change,
      matchmaking: matchmaking || calculateMatchmaking(state.currentRank),
      timestamp: Date.now(),
      opponentName,
      opponentAvatar,
      difficultyTier,
    };

    const newProtection = getProtectionState(rank);
    if (change.protectionUsed) {
      newProtection.remainingCount = Math.max(0, newProtection.remainingCount - 1);
    }
    if (change.isPromotion) {
      const freshProtection = getProtectionState(rank);
      newProtection.remainingCount = freshProtection.remainingCount;
    }

    set({
      currentRank: rank,
      lastRankChange: change,
      lastMatchmaking: null,
      battleSummaries: [...state.battleSummaries, summary].slice(-100),
      protectionState: newProtection,
    });

    get().saveSeason();
    return change;
  },

  checkSeasonReset: (): boolean => {
    const state = get();
    if (!isSeasonEnded(state.currentSeason)) return false;

    const record = archiveSeason(state.currentSeason, state.currentRank, state.battleSummaries);
    const settlement = settleSeason(state.currentSeason, state.currentRank, state.battleSummaries);
    const newSeason = createSeason();
    const newRank = {
      ...createDefaultRankInfo(),
      tier: settlement.placementRank.tier,
      subTier: settlement.placementRank.subTier,
      points: settlement.placementRank.points,
      highestTier: settlement.placementRank.tier,
      highestSubTier: settlement.placementRank.subTier,
    };

    set({
      currentRank: newRank,
      currentSeason: newSeason,
      seasonHistory: [record, ...state.seasonHistory],
      lastRankChange: null,
      lastMatchmaking: null,
      battleSummaries: [],
      protectionState: getProtectionState(newRank),
      pendingSettlement: settlement,
    });

    get().saveSeason();
    return true;
  },

  claimSeasonRewards: (seasonId: string): { coins: number; gems: number } | null => {
    const state = get();
    const record = state.seasonHistory.find(r => r.seasonId === seasonId);
    if (!record) return null;
    if (record.rewardsClaimed) return null;

    const rewards = getSeasonRewardsForTier(record.finalTier);
    let coins = 0;
    let gems = 0;
    for (const r of rewards) {
      if (r.type === 'coins') coins += r.amount;
      if (r.type === 'gems') gems += r.amount;
    }

    set({
      seasonHistory: state.seasonHistory.map(r =>
        r.seasonId === seasonId ? { ...r, rewardsClaimed: true } : r
      ),
    });
    get().saveSeason();

    return { coins, gems };
  },

  getLeaderboard: (count: number = 50): LeaderboardEntry[] => {
    const state = get();
    return generateLeaderboard(state.currentRank, state.currentRank.seasonWins, state.currentRank.seasonLosses, count);
  },

  resetSeason: () => {
    const newSeason = createSeason();
    const newRank = createDefaultRankInfo();
    set({
      currentRank: newRank,
      currentSeason: newSeason,
      lastRankChange: null,
      lastMatchmaking: null,
      battleSummaries: [],
      protectionState: getProtectionState(newRank),
    });
    get().saveSeason();
  },

  saveSeason: () => {
    const state = get();
    const payload: SeasonSavePayload = {
      currentRank: state.currentRank,
      currentSeason: state.currentSeason,
      seasonHistory: state.seasonHistory.slice(-20),
      battleSummaries: state.battleSummaries.slice(-50),
    };
    localStorage.setItem(SEASON_SAVE_KEY, JSON.stringify(payload));
  },

  getSeasonStats: (): SeasonStats => {
    const state = get();
    return computeSeasonStats(state.battleSummaries);
  },

  checkSeasonSettlement: (): SeasonSettlementResult | null => {
    return get().pendingSettlement;
  },

  confirmSettlement: () => {
    set({ pendingSettlement: null });
    get().saveSeason();
  },
}));
