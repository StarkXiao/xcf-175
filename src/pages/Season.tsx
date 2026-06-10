import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Trophy, Clock, ChevronRight, ChevronUp, ChevronDown, Award, History, TrendingUp, Swords, ArrowLeft, Crown, Medal, Shield, Target, Zap, BarChart3, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useSeasonStore } from '@/store/useSeasonStore';
import { useGameStore } from '@/store/useGameStore';
import {
  formatRankDisplay,
  getRankEmoji,
  getRankColor,
  getPointsToNextRank,
  getAllRankTierConfigs,
  getSeasonRemainingTime,
  getSeasonProgress,
  isSeasonEndingSoon,
} from '@/data/seasons';
import { RANK_TIER_ORDER, RANK_TIER_NAMES, RANK_TIER_COLORS, RANK_TIER_EMOJIS, RANK_SUB_TIER_NAMES } from '@/engine/constants';
import type { RankTier, RankSubTier, LeaderboardEntry, SeasonRecord, RankChangeResult, MatchmakingResult, SeasonSettlementResult, SeasonStats } from '@/types';

type SeasonTab = 'rank' | 'leaderboard' | 'rewards' | 'history';

const formatDuration = (ms: number): string => {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分`;
  return `${minutes}分钟`;
};

const MATCH_QUALITY_LABELS: Record<MatchmakingResult['matchQuality'], { text: string; color: string }> = {
  fair: { text: '势均力敌', color: '#ffcc00' },
  advantage: { text: '实力占优', color: '#44cc44' },
  challenge: { text: '强敌挑战', color: '#ff4444' },
};

export default function Season() {
  const navigate = useNavigate();
  const {
    currentRank, currentSeason, seasonHistory, lastRankChange, lastMatchmaking,
    protectionState, battleSummaries, pendingSettlement,
    getLeaderboard, claimSeasonRewards, startMatchmaking, confirmSettlement, getSeasonStats,
  } = useSeasonStore();
  const { addCoins, addGems } = useGameStore();
  const [activeTab, setActiveTab] = useState<SeasonTab>('rank');
  const [claimedSeasons, setClaimedSeasons] = useState<Set<string>>(new Set());
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showMatchmakingPreview, setShowMatchmakingPreview] = useState(false);
  const [matchmakingResult, setMatchmakingResult] = useState<MatchmakingResult | null>(null);

  const remainingTime = useMemo(() => getSeasonRemainingTime(currentSeason), [currentSeason]);
  const seasonProgress = useMemo(() => getSeasonProgress(currentSeason), [currentSeason]);
  const pointsInfo = useMemo(() => getPointsToNextRank(currentRank), [currentRank]);
  const seasonEndingSoon = useMemo(() => isSeasonEndingSoon(currentSeason), [currentSeason]);
  const seasonStats = useMemo(() => getSeasonStats(), [getSeasonStats, battleSummaries]);

  const leaderboard = useMemo(() => getLeaderboard(50), [currentRank, getLeaderboard]);
  const playerLeaderboardEntry = useMemo(() => leaderboard.find(e => e.isPlayer), [leaderboard]);

  useEffect(() => {
    const interval = setInterval(() => {
      useSeasonStore.getState().checkSeasonReset();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingSettlement) {
      setShowSettlementModal(true);
    }
  }, [pendingSettlement]);

  const handleClaim = useCallback((seasonId: string) => {
    if (claimedSeasons.has(seasonId)) return;
    const result = claimSeasonRewards(seasonId);
    if (!result) return;
    addCoins(result.coins);
    addGems(result.gems);
    setClaimedSeasons(prev => new Set(prev).add(seasonId));
  }, [claimedSeasons, claimSeasonRewards, addCoins, addGems]);

  const handleMatchmaking = useCallback(() => {
    const result = startMatchmaking();
    setMatchmakingResult(result);
    setShowMatchmakingPreview(true);
  }, [startMatchmaking]);

  const handleConfirmSettlement = useCallback(() => {
    if (pendingSettlement) {
      if (!pendingSettlement.rewards || pendingSettlement.rewards.length === 0) {
        // rewards are handled at claim time
      }
    }
    confirmSettlement();
    setShowSettlementModal(false);
  }, [pendingSettlement, confirmSettlement]);

  const tabs: { key: SeasonTab; label: string; icon: typeof Trophy }[] = [
    { key: 'rank', label: '我的段位', icon: Trophy },
    { key: 'leaderboard', label: '排行榜', icon: Crown },
    { key: 'rewards', label: '段位奖励', icon: Award },
    { key: 'history', label: '历史战绩', icon: History },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </NeonButton>
            <div className="flex-1">
              <h1 className="text-2xl font-cyber font-bold text-cyber-yellow">
                天梯赛季
              </h1>
              <p className="text-xs text-gray-400 font-cyber">
                {currentSeason.name} · {currentSeason.subtitle}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              seasonEndingSoon ? 'bg-cyber-red/10 border-cyber-red/30' : 'bg-cyber-dark/60 border-cyber-yellow/20'
            }`}>
              {seasonEndingSoon && <AlertTriangle className="w-4 h-4 text-cyber-red" />}
              {!seasonEndingSoon && <Clock className="w-4 h-4 text-cyber-yellow" />}
              <span className={`text-xs font-cyber ${seasonEndingSoon ? 'text-cyber-red' : 'text-cyber-yellow'}`}>
                {seasonEndingSoon ? '即将结束' : ''} {formatDuration(remainingTime)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <NeonButton
                key={tab.key}
                size="sm"
                variant={activeTab === tab.key ? 'yellow' : 'ghost'}
                onClick={() => setActiveTab(tab.key)}
              >
                <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
              </NeonButton>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'rank' && (
          <RankTab
            rank={currentRank}
            season={currentSeason}
            remainingTime={remainingTime}
            seasonProgress={seasonProgress}
            seasonEndingSoon={seasonEndingSoon}
            pointsInfo={pointsInfo}
            lastRankChange={lastRankChange}
            lastMatchmaking={lastMatchmaking}
            protectionState={protectionState}
            seasonStats={seasonStats}
            playerLeaderboardRank={playerLeaderboardEntry?.rank}
            onMatchmaking={handleMatchmaking}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} />
        )}
        {activeTab === 'rewards' && (
          <RewardsTab currentTier={currentRank.tier} />
        )}
        {activeTab === 'history' && (
          <HistoryTab history={seasonHistory} claimedSeasons={claimedSeasons} onClaim={handleClaim} />
        )}
      </div>

      {showMatchmakingPreview && matchmakingResult && (
        <MatchmakingPreviewModal
          matchmaking={matchmakingResult}
          onClose={() => setShowMatchmakingPreview(false)}
          onStartBattle={() => {
            setShowMatchmakingPreview(false);
            navigate('/battle');
          }}
        />
      )}

      {showSettlementModal && pendingSettlement && (
        <SeasonSettlementModal
          settlement={pendingSettlement}
          onConfirm={handleConfirmSettlement}
        />
      )}
    </div>
  );
}

function RankTab({
  rank,
  season,
  remainingTime,
  seasonProgress,
  seasonEndingSoon,
  pointsInfo,
  lastRankChange,
  lastMatchmaking,
  protectionState,
  seasonStats,
  playerLeaderboardRank,
  onMatchmaking,
}: {
  rank: ReturnType<typeof useSeasonStore.getState>['currentRank'];
  season: ReturnType<typeof useSeasonStore.getState>['currentSeason'];
  remainingTime: number;
  seasonProgress: number;
  seasonEndingSoon: boolean;
  pointsInfo: { current: number; needed: number; progress: number };
  lastRankChange: ReturnType<typeof useSeasonStore.getState>['lastRankChange'];
  lastMatchmaking: ReturnType<typeof useSeasonStore.getState>['lastMatchmaking'];
  protectionState: ReturnType<typeof useSeasonStore.getState>['protectionState'];
  seasonStats: SeasonStats;
  playerLeaderboardRank?: number;
  onMatchmaking: () => void;
}) {
  const navigate = useNavigate();
  const rankDisplay = formatRankDisplay(rank.tier, rank.subTier);
  const rankEmoji = getRankEmoji(rank.tier);
  const rankColor = getRankColor(rank.tier);

  return (
    <div className="space-y-6">
      <NeonCard variant="yellow" glow className="text-center">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-xl opacity-10"
            style={{ background: `radial-gradient(circle at center, ${rankColor}40, transparent 70%)` }}
          />
          <div className="relative py-6">
            <div className="text-6xl mb-3">{rankEmoji}</div>
            <h2
              className="text-3xl font-cyber font-black mb-1"
              style={{ color: rankColor }}
            >
              {rankDisplay}
            </h2>
            <div className="text-sm text-gray-400 font-cyber mb-4">
              {rank.points} 积分
              {playerLeaderboardRank && (
                <span className="ml-3 text-cyber-yellow">
                  排名 #{playerLeaderboardRank}
                </span>
              )}
            </div>

            {pointsInfo.needed > 0 && (
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>距下一段位</span>
                  <span>{pointsInfo.current}/{pointsInfo.needed}</span>
                </div>
                <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pointsInfo.progress * 100}%`,
                      background: `linear-gradient(to right, ${rankColor}, ${rankColor}cc)`,
                    }}
                  />
                </div>
              </div>
            )}

            {protectionState.isActive && protectionState.remainingCount < 99 && protectionState.remainingCount > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyber-cyan" />
                <span className="text-xs text-cyber-cyan font-cyber">
                  段位保护剩余 {protectionState.remainingCount} 次
                </span>
              </div>
            )}
          </div>
        </div>
      </NeonCard>

      {lastRankChange && (
        <NeonCard className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {lastRankChange.isPromotion ? (
              <ChevronUp className="w-6 h-6 text-cyber-green" />
            ) : lastRankChange.isDemotion ? (
              <ChevronDown className="w-6 h-6 text-cyber-red" />
            ) : (
              <TrendingUp className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <div className={`text-sm font-cyber font-bold ${
                lastRankChange.pointsChange > 0 ? 'text-cyber-green' : 'text-cyber-red'
              }`}>
                {lastRankChange.pointsChange > 0 ? '+' : ''}{lastRankChange.pointsChange} 积分
              </div>
              <div className="text-xs text-gray-500">
                {lastRankChange.protectionUsed ? '🛡️ 段位保护已触发' :
                  lastRankChange.isPromotion ? '🎉 晋段成功！' :
                  lastRankChange.isDemotion ? '📉 段位下降' : '上一场结算'}
              </div>
            </div>
          </div>
          <div
            className="text-sm font-cyber font-bold px-3 py-1 rounded-lg"
            style={{
              color: getRankColor(lastRankChange.newTier),
              background: `${getRankColor(lastRankChange.newTier)}15`,
              border: `1px solid ${getRankColor(lastRankChange.newTier)}30`,
            }}
          >
            {formatRankDisplay(lastRankChange.newTier, lastRankChange.newSubTier)}
          </div>
        </NeonCard>
      )}

      {lastMatchmaking && (
        <NeonCard className="flex items-center gap-3">
          <Target className="w-5 h-5" style={{ color: MATCH_QUALITY_LABELS[lastMatchmaking.matchQuality].color }} />
          <div className="flex-1">
            <div className="text-sm font-cyber font-bold" style={{ color: MATCH_QUALITY_LABELS[lastMatchmaking.matchQuality].color }}>
              {MATCH_QUALITY_LABELS[lastMatchmaking.matchQuality].text}
            </div>
            <div className="text-xs text-gray-500">
              对手段位: {getRankEmoji(lastMatchmaking.opponentTier)} {formatRankDisplay(lastMatchmaking.opponentTier, lastMatchmaking.opponentSubTier)}
              {lastMatchmaking.pointBonus !== 1.0 && (
                <span className="ml-2 text-cyber-yellow">积分加成 ×{lastMatchmaking.pointBonus.toFixed(1)}</span>
              )}
            </div>
          </div>
        </NeonCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NeonCard className="text-center">
          <Swords className="w-5 h-5 mx-auto mb-1 text-cyber-cyan" />
          <div className="text-xl font-cyber font-bold">{rank.seasonWins + rank.seasonLosses}</div>
          <div className="text-[10px] text-gray-500 font-cyber">赛季场次</div>
        </NeonCard>
        <NeonCard className="text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-cyber-green" />
          <div className="text-xl font-cyber font-bold text-cyber-green">{rank.seasonWins}</div>
          <div className="text-[10px] text-gray-500 font-cyber">赛季胜场</div>
        </NeonCard>
        <NeonCard className="text-center">
          <Medal className="w-5 h-5 mx-auto mb-1 text-cyber-yellow" />
          <div className="text-xl font-cyber font-bold">
            {rank.seasonWins + rank.seasonLosses > 0
              ? Math.round((rank.seasonWins / (rank.seasonWins + rank.seasonLosses)) * 100)
              : 0}%
          </div>
          <div className="text-[10px] text-gray-500 font-cyber">赛季胜率</div>
        </NeonCard>
        <NeonCard className="text-center">
          <Crown className="w-5 h-5 mx-auto mb-1" style={{ color: getRankColor(rank.highestTier) }} />
          <div className="text-sm font-cyber font-bold" style={{ color: getRankColor(rank.highestTier) }}>
            {formatRankDisplay(rank.highestTier, rank.highestSubTier)}
          </div>
          <div className="text-[10px] text-gray-500 font-cyber">历史最高</div>
        </NeonCard>
      </div>

      {seasonStats.totalBattles > 0 && (
        <NeonCard variant="purple">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-cyber-purple" />
            <h3 className="font-cyber font-bold text-cyber-purple">赛季数据</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-cyber-darker/50 rounded-lg">
              <div className="text-lg font-cyber font-bold text-cyber-cyan">{seasonStats.avgPointsPerWin}</div>
              <div className="text-[10px] text-gray-500">场均得分</div>
            </div>
            <div className="text-center p-2 bg-cyber-darker/50 rounded-lg">
              <div className="text-lg font-cyber font-bold text-cyber-red">{seasonStats.avgPointsPerLoss}</div>
              <div className="text-[10px] text-gray-500">场均失分</div>
            </div>
            <div className="text-center p-2 bg-cyber-darker/50 rounded-lg">
              <div className="text-lg font-cyber font-bold text-cyber-yellow">{seasonStats.longestWinStreak}</div>
              <div className="text-[10px] text-gray-500">最长连胜</div>
            </div>
            <div className="text-center p-2 bg-cyber-darker/50 rounded-lg">
              <div className="text-lg font-cyber font-bold text-cyber-green">{seasonStats.promotionsCount}</div>
              <div className="text-[10px] text-gray-500">晋级次数</div>
            </div>
          </div>
        </NeonCard>
      )}

      <div className="flex gap-3">
        <NeonButton variant="cyan" className="flex-1" onClick={onMatchmaking}>
          <Target className="w-4 h-4 mr-2" />
          天梯匹配
        </NeonButton>
        <NeonButton variant="yellow" className="flex-1" onClick={() => navigate('/battle')}>
          <Swords className="w-4 h-4 mr-2" />
          快速对战
        </NeonButton>
      </div>

      <NeonCard variant="purple">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-cyber-purple" />
          <h3 className="font-cyber font-bold text-cyber-purple">赛季进度</h3>
          {seasonEndingSoon && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-red/20 text-cyber-red font-bold animate-pulse">
              即将结束
            </span>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>{season.name} {season.subtitle}</span>
          <span>{Math.floor(seasonProgress * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              seasonEndingSoon ? 'bg-gradient-to-r from-cyber-red to-cyber-pink' : 'bg-gradient-to-r from-cyber-purple to-cyber-pink'
            }`}
            style={{ width: `${seasonProgress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>开始: {new Date(season.startTime).toLocaleDateString('zh-CN')}</span>
          <span>剩余: {formatDuration(remainingTime)}</span>
          <span>结束: {new Date(season.endTime).toLocaleDateString('zh-CN')}</span>
        </div>
      </NeonCard>
    </div>
  );
}

function LeaderboardTab({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const [filterTier, setFilterTier] = useState<RankTier | 'all'>('all');

  const filtered = useMemo(() => {
    if (filterTier === 'all') return leaderboard;
    return leaderboard.filter(e => e.tier === filterTier);
  }, [leaderboard, filterTier]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <NeonButton
          size="sm"
          variant={filterTier === 'all' ? 'cyan' : 'ghost'}
          onClick={() => setFilterTier('all')}
        >
          全部
        </NeonButton>
        {RANK_TIER_ORDER.map(tier => (
          <NeonButton
            key={tier}
            size="sm"
            variant={filterTier === tier ? 'cyan' : 'ghost'}
            onClick={() => setFilterTier(tier)}
          >
            <span style={{ color: RANK_TIER_COLORS[tier] }}>
              {RANK_TIER_EMOJIS[tier]}
            </span>
            <span className="ml-1" style={{ color: filterTier === tier ? RANK_TIER_COLORS[tier] : undefined }}>
              {RANK_TIER_NAMES[tier]}
            </span>
          </NeonButton>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(entry => (
          <div
            key={entry.rank}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              entry.isPlayer
                ? 'bg-cyber-yellow/5 border-cyber-yellow/30'
                : entry.rank <= 3
                ? 'bg-cyber-dark/60 border-gray-700/40'
                : 'bg-cyber-dark/30 border-gray-700/20'
            }`}
          >
            <div className={`w-8 text-center font-cyber font-bold text-lg shrink-0 ${
              entry.rank === 1 ? 'text-cyber-yellow' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : 'text-gray-500'
            }`}>
              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
            </div>

            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
              style={{
                background: `${RANK_TIER_COLORS[entry.tier]}15`,
                border: `1px solid ${RANK_TIER_COLORS[entry.tier]}30`,
              }}
            >
              {entry.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-cyber font-bold truncate ${entry.isPlayer ? 'text-cyber-yellow' : 'text-white'}`}>
                  {entry.playerName}
                </span>
                {entry.isPlayer && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-yellow/20 text-cyber-yellow font-bold">
                    你
                  </span>
                )}
                {entry.trend === 'up' && <ChevronUp className="w-3 h-3 text-cyber-green" />}
                {entry.trend === 'down' && <ChevronDown className="w-3 h-3 text-cyber-red" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: RANK_TIER_COLORS[entry.tier] }}>
                  {RANK_TIER_EMOJIS[entry.tier]} {formatRankDisplay(entry.tier, entry.subTier)}
                </span>
                <span className="text-[10px] text-gray-500">
                  {entry.wins}胜{entry.losses}负
                </span>
                <span className="text-[10px] text-cyber-cyan">
                  胜率{entry.winRate}%
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-cyber font-bold text-sm" style={{ color: RANK_TIER_COLORS[entry.tier] }}>
                {entry.points}
              </div>
              <div className="text-[10px] text-gray-500">积分</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RewardsTab({ currentTier }: { currentTier: RankTier }) {
  const configs = getAllRankTierConfigs();
  const currentTierIndex = RANK_TIER_ORDER.indexOf(currentTier);

  return (
    <div className="space-y-4">
      <NeonCard variant="yellow" className="text-center">
        <Award className="w-8 h-8 mx-auto mb-2 text-cyber-yellow" />
        <h3 className="font-cyber font-bold text-lg text-cyber-yellow mb-2">赛季结算奖励</h3>
        <p className="text-xs text-gray-400">赛季结束时，根据最终段位发放奖励。段位越高奖励越丰厚！</p>
      </NeonCard>

      <div className="space-y-3">
        {configs.map((config, idx) => {
          const isCurrent = config.tier === currentTier;
          const isReached = idx <= currentTierIndex;

          return (
            <NeonCard
              key={config.tier}
              variant={isCurrent ? 'yellow' : 'default'}
              glow={isCurrent}
              className={`transition-all ${isReached ? '' : 'opacity-50'}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                  style={{
                    background: `${config.color}15`,
                    border: `2px solid ${config.color}${isCurrent ? '80' : '30'}`,
                  }}
                >
                  {config.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-cyber font-bold" style={{ color: config.color }}>
                      {config.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-yellow/20 text-cyber-yellow font-bold border border-cyber-yellow/30">
                        当前
                      </span>
                    )}
                    {isReached && !isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-green/20 text-cyber-green font-bold">
                        ✓ 已达到
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    需要 {config.pointThreshold}+ 积分
                  </div>
                  <div className="flex gap-3 mt-2">
                    {config.rewards.map((reward, ri) => (
                      <span
                        key={ri}
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{
                          background: reward.type === 'coins' ? '#ffd70015' : '#00ffff15',
                          color: reward.type === 'coins' ? '#ffd700' : '#00ffff',
                          border: `1px solid ${reward.type === 'coins' ? '#ffd70030' : '#00ffff30'}`,
                        }}
                      >
                        {reward.type === 'coins' ? '💰' : '💎'} {reward.description}
                      </span>
                    ))}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
              </div>
            </NeonCard>
          );
        })}
      </div>
    </div>
  );
}

function HistoryTab({
  history,
  claimedSeasons,
  onClaim,
}: {
  history: SeasonRecord[];
  claimedSeasons: Set<string>;
  onClaim: (seasonId: string) => void;
}) {
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <Empty
        icon={History}
        title="暂无历史赛季"
        description="完成本赛季后，战绩将被归档到这里"
      />
    );
  }

  return (
    <div className="space-y-4">
      {history.map(record => {
        const isClaimed = claimedSeasons.has(record.seasonId) || record.rewardsClaimed;
        const rankColor = getRankColor(record.finalTier);
        const isExpanded = expandedSeason === record.seasonId;

        return (
          <NeonCard key={record.seasonId} variant="purple">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{
                  background: `${rankColor}15`,
                  border: `1px solid ${rankColor}30`,
                }}
              >
                {getRankEmoji(record.finalTier)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-cyber font-bold text-white">{record.seasonName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                    已结束
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-gray-500">最终段位：</span>
                    <span className="font-cyber font-bold" style={{ color: rankColor }}>
                      {formatRankDisplay(record.finalTier, record.finalSubTier)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">最高段位：</span>
                    <span className="font-cyber font-bold" style={{ color: getRankColor(record.highestTier) }}>
                      {formatRankDisplay(record.highestTier, record.highestSubTier)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">战绩：</span>
                    <span className="text-cyber-green">{record.totalWins}胜</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-cyber-red">{record.totalLosses}负</span>
                  </div>
                  <div>
                    <span className="text-gray-500">最终积分：</span>
                    <span className="text-cyber-yellow">{record.finalPoints}</span>
                  </div>
                </div>

                {record.stats && record.stats.totalBattles > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center p-1 bg-cyber-darker/50 rounded text-[10px]">
                      <span className="text-cyber-cyan font-bold">{record.stats.winRate}%</span>
                      <span className="text-gray-500 ml-1">胜率</span>
                    </div>
                    <div className="text-center p-1 bg-cyber-darker/50 rounded text-[10px]">
                      <span className="text-cyber-yellow font-bold">{record.stats.longestWinStreak}</span>
                      <span className="text-gray-500 ml-1">连胜</span>
                    </div>
                    <div className="text-center p-1 bg-cyber-darker/50 rounded text-[10px]">
                      <span className="text-cyber-green font-bold">{record.stats.promotionsCount}</span>
                      <span className="text-gray-500 ml-1">晋级</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-500">赛季奖励：</span>
                  {record.rewards.map((reward, ri) => (
                    <span
                      key={ri}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: reward.type === 'coins' ? '#ffd70015' : '#00ffff15',
                        color: reward.type === 'coins' ? '#ffd700' : '#00ffff',
                      }}
                    >
                      {reward.type === 'coins' ? '💰' : '💎'} {reward.description}
                    </span>
                  ))}
                </div>

                {record.battleSummaries && record.battleSummaries.length > 0 && (
                  <button
                    className="text-xs text-cyber-cyan mt-2 hover:underline"
                    onClick={() => setExpandedSeason(isExpanded ? null : record.seasonId)}
                  >
                    {isExpanded ? '收起战绩详情' : `查看 ${record.battleSummaries.length} 场对局详情`}
                  </button>
                )}

                {isExpanded && record.battleSummaries && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {record.battleSummaries.slice(-20).map((summary, si) => (
                      <div key={si} className="flex items-center gap-2 p-1.5 bg-cyber-darker/50 rounded text-[10px]">
                        <span className={summary.isWin ? 'text-cyber-green' : 'text-cyber-red'}>
                          {summary.isWin ? '胜' : '负'}
                        </span>
                        <span className={`font-cyber font-bold ${summary.rankChange.pointsChange > 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
                          {summary.rankChange.pointsChange > 0 ? '+' : ''}{summary.rankChange.pointsChange}
                        </span>
                        <span className="text-gray-500">vs {summary.opponentAvatar} {summary.opponentName}</span>
                        <span className="text-gray-600 ml-auto">
                          {new Date(summary.timestamp).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <NeonButton
                size="sm"
                variant={isClaimed ? 'ghost' : 'yellow'}
                disabled={isClaimed}
                onClick={() => onClaim(record.seasonId)}
              >
                {isClaimed ? '已领取' : '领取'}
              </NeonButton>
            </div>
          </NeonCard>
        );
      })}
    </div>
  );
}

function MatchmakingPreviewModal({
  matchmaking,
  onClose,
  onStartBattle,
}: {
  matchmaking: MatchmakingResult;
  onClose: () => void;
  onStartBattle: () => void;
}) {
  const qualityInfo = MATCH_QUALITY_LABELS[matchmaking.matchQuality];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-cyber-dark border-2 border-cyber-cyan rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-cyber font-bold text-xl text-cyber-cyan">
            天梯匹配
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-4xl mb-2">⚔️</div>
              <div className="text-sm text-cyber-cyan font-cyber font-bold">你</div>
            </div>
            <div className="text-2xl font-cyber font-black text-cyber-pink">VS</div>
            <div className="text-center">
              <div className="text-4xl mb-2">{getRankEmoji(matchmaking.opponentTier)}</div>
              <div className="text-sm font-cyber font-bold" style={{ color: getRankColor(matchmaking.opponentTier) }}>
                {formatRankDisplay(matchmaking.opponentTier, matchmaking.opponentSubTier)}
              </div>
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              background: `${qualityInfo.color}15`,
              border: `1px solid ${qualityInfo.color}30`,
            }}
          >
            <Target className="w-4 h-4" style={{ color: qualityInfo.color }} />
            <span className="font-cyber font-bold" style={{ color: qualityInfo.color }}>
              {qualityInfo.text}
            </span>
          </div>
        </div>

        <NeonCard className="mb-6 p-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">对手段位</div>
              <div className="font-cyber font-bold" style={{ color: getRankColor(matchmaking.opponentTier) }}>
                {formatRankDisplay(matchmaking.opponentTier, matchmaking.opponentSubTier)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">对手积分</div>
              <div className="font-cyber font-bold text-cyber-yellow">{matchmaking.opponentPoints}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">积分加成</div>
              <div className="font-cyber font-bold text-cyber-green">×{matchmaking.pointBonus.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">匹配质量</div>
              <div className="font-cyber font-bold" style={{ color: qualityInfo.color }}>
                {qualityInfo.text}
              </div>
            </div>
          </div>
        </NeonCard>

        <div className="flex gap-4">
          <NeonButton variant="ghost" className="flex-1" onClick={onClose}>
            取消
          </NeonButton>
          <NeonButton variant="cyan" className="flex-1" onClick={onStartBattle}>
            <Swords className="w-4 h-4 mr-2" />
            开始战斗
          </NeonButton>
        </div>
      </div>
    </div>
  );
}

function SeasonSettlementModal({
  settlement,
  onConfirm,
}: {
  settlement: SeasonSettlementResult;
  onConfirm: () => void;
}) {
  const finalRankColor = getRankColor(settlement.finalRank.tier);
  const placementRankColor = getRankColor(settlement.placementRank.tier);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-cyber-dark border-2 border-cyber-yellow rounded-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="font-cyber font-bold text-2xl text-cyber-yellow mb-2">
            赛季结算
          </h2>
          <p className="text-sm text-gray-400">{settlement.seasonName} 已结束</p>
        </div>

        <div className="space-y-4 mb-6">
          <NeonCard variant="yellow" glow className="text-center">
            <div className="text-xs text-gray-400 mb-2">最终段位</div>
            <div className="text-4xl mb-2">{getRankEmoji(settlement.finalRank.tier)}</div>
            <div className="text-xl font-cyber font-black" style={{ color: finalRankColor }}>
              {formatRankDisplay(settlement.finalRank.tier, settlement.finalRank.subTier)}
            </div>
            <div className="text-sm text-cyber-yellow mt-1">{settlement.finalRank.points} 积分</div>
            <div className="text-xs text-gray-500 mt-1">
              {settlement.finalRank.seasonWins}胜 {settlement.finalRank.seasonLosses}负
            </div>
          </NeonCard>

          <NeonCard className="text-center">
            <div className="text-xs text-gray-400 mb-2">新赛季起始段位（软重置）</div>
            <div className="text-3xl mb-1">{getRankEmoji(settlement.placementRank.tier)}</div>
            <div className="text-lg font-cyber font-bold" style={{ color: placementRankColor }}>
              {formatRankDisplay(settlement.placementRank.tier, settlement.placementRank.subTier)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              保留 {settlement.placementRank.points} 积分
            </div>
          </NeonCard>

          <div>
            <div className="text-xs text-gray-400 mb-2 text-center">赛季奖励</div>
            <div className="flex gap-2 justify-center flex-wrap">
              {settlement.rewards.map((reward, ri) => (
                <span
                  key={ri}
                  className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{
                    background: reward.type === 'coins' ? '#ffd70015' : '#00ffff15',
                    color: reward.type === 'coins' ? '#ffd700' : '#00ffff',
                    border: `1px solid ${reward.type === 'coins' ? '#ffd70030' : '#00ffff30'}`,
                  }}
                >
                  {reward.type === 'coins' ? '💰' : '💎'} {reward.description}
                </span>
              ))}
            </div>
          </div>
        </div>

        <NeonButton variant="yellow" fullWidth onClick={onConfirm}>
          <CheckCircle className="w-4 h-4 mr-2" />
          确认并进入新赛季
        </NeonButton>
      </div>
    </div>
  );
}
