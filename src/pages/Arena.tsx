import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Trophy, Swords, Shield, History, Award, Clock, RefreshCw, Play,
  ChevronRight, Crown, Star, Target, TrendingUp, TrendingDown,
  X, CheckCircle, XCircle, Coins, Gem, Users, Zap, ShieldAlert,
  Eye, Edit3, Save, RotateCcw
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useArenaStore } from '@/store/useArenaStore';
import { useGameStore } from '@/store/useGameStore';
import { useReplayStore } from '@/store/useReplayStore';
import {
  getArenaTierConfig,
  getPointsToNextTier,
  formatArenaTime,
  getDifficultyLabel,
  getDifficultyColor,
  getTierColor,
} from '@/data/arena';
import { ARENA_CONSTANTS, ARENA_TIER_NAMES, ARENA_TIER_EMOJIS, ARENA_TIER_COLORS } from '@/engine/constants';
import type { ArenaOpponent, ArenaChallengeRecord, ArenaDailyReward, Animal, BattleRecord } from '@/types';
import { ANIMAL_TEMPLATES } from '@/data/animals';

type ArenaTab = 'challenge' | 'defense' | 'history' | 'rewards';

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}小时${minutes % 60}分`;
  if (minutes > 0) return `${minutes}分${seconds % 60}秒`;
  return `${seconds}秒`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

const getAnimalTemplate = (templateId: string) => {
  return ANIMAL_TEMPLATES.find(t => t.id === templateId);
};

export default function Arena() {
  const navigate = useNavigate();
  const {
    isInitialized, isLoading, defenseConfig, rankInfo, challengeHistory,
    dailyRewards, opponents, selectedOpponent, isBattling, lastAttackResult,
    showDailyRewardModal, pendingDailyReward,
    initArena, setDefenseConfig, clearDefenseConfig,
    refreshOpponents, selectOpponent, attackOpponent,
    claimDailyReward, checkDailyReward, getAttackCooldown,
    getRefreshCooldown, canAttack, canRefreshOpponents, updateDailyCounters
  } = useArenaStore();

  const { ownedAnimals, lineup, lineupConfig, saveGame } = useGameStore();
  const { loadReplay } = useReplayStore();

  const [activeTab, setActiveTab] = useState<ArenaTab>('challenge');
  const [showAttackResult, setShowAttackResult] = useState(false);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ArenaChallengeRecord | null>(null);
  const [defenseLineup, setDefenseLineup] = useState<string[]>([]);
  const [isEditingDefense, setIsEditingDefense] = useState(false);
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [refreshCooldown, setRefreshCooldown] = useState(0);

  useEffect(() => {
    if (!isInitialized) {
      initArena();
    }
  }, [isInitialized, initArena]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAttackCooldown(getAttackCooldown());
      setRefreshCooldown(getRefreshCooldown());
      updateDailyCounters();
    }, 1000);
    return () => clearInterval(interval);
  }, [getAttackCooldown, getRefreshCooldown, updateDailyCounters]);

  useEffect(() => {
    if (lastAttackResult && lastAttackResult.success) {
      setShowAttackResult(true);
    }
  }, [lastAttackResult]);

  useEffect(() => {
    if (defenseConfig && !isEditingDefense) {
      setDefenseLineup([...defenseConfig.animalIds]);
    }
  }, [defenseConfig, isEditingDefense]);

  const tierConfig = useMemo(() => getArenaTierConfig(rankInfo.tier), [rankInfo.tier]);
  const pointsToNext = useMemo(() => getPointsToNextTier(rankInfo.arenaPoints, rankInfo.tier), [rankInfo.arenaPoints, rankInfo.tier]);

  const availableAnimals = useMemo(() => {
    return ownedAnimals.filter(a => a.rarity <= 5);
  }, [ownedAnimals]);

  const tabs: { key: ArenaTab; label: string; icon: typeof Trophy }[] = [
    { key: 'challenge', label: '挑战', icon: Swords },
    { key: 'defense', label: '防守', icon: Shield },
    { key: 'history', label: '记录', icon: History },
    { key: 'rewards', label: '奖励', icon: Award },
  ];

  const handleRefreshOpponents = useCallback(() => {
    const result = refreshOpponents();
    if (!result.success) {
      console.log(`刷新冷却中: ${formatDuration(result.cooldown * 1000)}`);
    }
  }, [refreshOpponents]);

  const handleAttack = useCallback(async (opponent: ArenaOpponent) => {
    if (!canAttack()) return;
    selectOpponent(opponent);
    const result = await attackOpponent(opponent);
    if (result.battleRecord) {
      saveGame();
    }
  }, [canAttack, selectOpponent, attackOpponent, saveGame]);

  const handleWatchReplay = useCallback((record: ArenaChallengeRecord) => {
    setSelectedRecord(record);
    const battleRecord: BattleRecord = {
      id: record.battleRecordId,
      timestamp: record.timestamp,
      opponentName: record.isPlayerAttacker ? record.defenderName : record.challengerName,
      opponentAvatar: record.isPlayerAttacker ? record.defenderAvatar : record.challengerAvatar,
      isWin: record.isWin,
      betAmount: 0,
      reward: 0,
      playerLineup: [],
      enemyLineup: [],
      battleLog: record.battleLog,
      playerUnits: record.playerUnits,
      enemyUnits: record.enemyUnits,
      initialPlayerUnits: record.initialPlayerUnits,
      initialEnemyUnits: record.initialEnemyUnits,
    };
    loadReplay(battleRecord);
    navigate('/replay');
  }, [loadReplay, navigate]);

  const handleSaveDefense = useCallback(() => {
    if (defenseLineup.length === 0) {
      clearDefenseConfig();
    } else {
      setDefenseConfig(defenseLineup, lineupConfig);
    }
    setIsEditingDefense(false);
  }, [defenseLineup, lineupConfig, setDefenseConfig, clearDefenseConfig]);

  const handleStartEditDefense = useCallback(() => {
    if (defenseConfig) {
      setDefenseLineup([...defenseConfig.animalIds]);
    } else {
      setDefenseLineup([]);
    }
    setIsEditingDefense(true);
  }, [defenseConfig]);

  const handleToggleDefenseAnimal = useCallback((animalId: string) => {
    setDefenseLineup(prev => {
      if (prev.includes(animalId)) {
        return prev.filter(id => id !== animalId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, animalId];
    });
  }, []);

  const handleClaimDailyReward = useCallback(() => {
    const result = claimDailyReward();
    if (result.success && result.reward) {
      console.log('领取奖励成功:', result.reward);
    }
  }, [claimDailyReward]);

  const getAnimalDisplay = (animal: Animal) => {
    const template = getAnimalTemplate(animal.templateId);
    return (
      <div
        key={animal.id}
        className="flex flex-col items-center p-2 rounded-lg bg-black/30 border border-white/10"
      >
        <div className="text-3xl mb-1">{template?.emoji || '❓'}</div>
        <div className="text-xs text-white/70 truncate w-full text-center">{template?.name || '未知'}</div>
        <div className="text-xs text-yellow-400">Lv.{animal.level}</div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 flex items-center justify-center">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 pb-20">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            异步竞技场
          </h1>
        </div>

        {/* 段位信息卡片 */}
        <NeonCard className="mb-6 p-4 border-2" style={{ borderColor: tierConfig.color }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
                style={{ backgroundColor: `${tierConfig.color}20`, border: `2px solid ${tierConfig.color}` }}
              >
                {tierConfig.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold" style={{ color: tierConfig.color }}>
                    {tierConfig.name}
                  </span>
                  <span className="text-sm text-white/50">段位</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-white">排名 #{rankInfo.rank}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-white">{rankInfo.arenaPoints} 积分</span>
                  </div>
                </div>
                {pointsToNext && (
                  <div className="text-sm text-white/50 mt-1">
                    距离下一段位还需 {pointsToNext} 积分
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-green-400 font-bold">{rankInfo.wins}</span>
                <span className="text-white/50">胜</span>
                <span className="text-red-400 font-bold">{rankInfo.losses}</span>
                <span className="text-white/50">负</span>
              </div>
              {rankInfo.winStreak > 0 && (
                <div className="text-sm text-orange-400 mt-1 flex items-center gap-1 justify-end">
                  <Zap className="w-3 h-3" />
                  连胜 {rankInfo.winStreak}
                </div>
              )}
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{rankInfo.totalAttacks}</div>
              <div className="text-xs text-white/50">总进攻</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{rankInfo.totalDefenses}</div>
              <div className="text-xs text-white/50">总防守</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">#{rankInfo.highestRank}</div>
              <div className="text-xs text-white/50">最高排名</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{rankInfo.highestPoints}</div>
              <div className="text-xs text-white/50">最高积分</div>
            </div>
          </div>
        </NeonCard>

        {/* Tab导航 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 挑战标签页 */}
        {activeTab === 'challenge' && (
          <div>
            {/* 挑战次数和冷却 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-white/70">
                  今日挑战: <span className="text-white font-bold">{useArenaStore.getState().attackCountToday}</span>/{useArenaStore.getState().maxDailyAttacks}
                </span>
                {attackCooldown > 0 && (
                  <span className="text-orange-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    挑战冷却: {formatDuration(attackCooldown)}
                  </span>
                )}
              </div>
              <NeonButton
                size="sm"
                variant="ghost"
                onClick={handleRefreshOpponents}
                disabled={!canRefreshOpponents()}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshCooldown > 0 ? 'animate-spin' : ''}`} />
                刷新对手
                {refreshCooldown > 0 && ` (${formatDuration(refreshCooldown * 1000)})`}
              </NeonButton>
            </div>

            {/* 对手列表 */}
            <div className="space-y-4">
              {opponents.length === 0 ? (
                <Empty title="暂无对手，请刷新重试" icon={Users} />
              ) : (
                opponents.map(opponent => {
                  const difficultyLabel = getDifficultyLabel(opponent.difficulty);
                  const difficultyColor = getDifficultyColor(opponent.difficulty);
                  const opponentTierConfig = getArenaTierConfig(opponent.tier);

                  return (
                    <NeonCard key={opponent.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                            style={{ backgroundColor: `${opponentTierConfig.color}20`, border: `2px solid ${opponentTierConfig.color}` }}
                          >
                            {opponent.avatar}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-white">{opponent.name}</span>
                              <span
                                className="px-2 py-0.5 rounded text-xs font-bold"
                                style={{ backgroundColor: `${difficultyColor}30`, color: difficultyColor }}
                              >
                                {difficultyLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm" style={{ color: opponentTierConfig.color }}>
                                {opponentTierConfig.emoji} {opponentTierConfig.name}
                              </span>
                              <span className="text-sm text-white/50 flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400" />
                                {opponent.arenaPoints} 积分
                              </span>
                            </div>
                            <div className="flex gap-1 mt-2">
                              {opponent.animalTemplateIds.slice(0, 4).map((templateId, i) => {
                                const template = getAnimalTemplate(templateId);
                                return (
                                  <div key={i} className="w-8 h-8 rounded bg-black/30 flex items-center justify-center text-lg">
                                    {template?.emoji || '❓'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-white/50">
                            预计获得: <span className="text-green-400 font-bold">+{opponent.expectedPointsGain}</span>
                          </div>
                          <NeonButton
                            size="sm"
                            onClick={() => handleAttack(opponent)}
                            disabled={!canAttack() || isBattling}
                          >
                            <Swords className="w-4 h-4 mr-2" />
                            {isBattling && selectedOpponent?.id === opponent.id ? '战斗中...' : '挑战'}
                          </NeonButton>
                        </div>
                      </div>
                    </NeonCard>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 防守标签页 */}
        {activeTab === 'defense' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-bold text-white">防守阵容</span>
              </div>
              {!isEditingDefense ? (
                <NeonButton size="sm" variant="ghost" onClick={handleStartEditDefense}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  编辑阵容
                </NeonButton>
              ) : (
                <div className="flex gap-2">
                  <NeonButton size="sm" variant="ghost" onClick={() => setIsEditingDefense(false)}>
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </NeonButton>
                  <NeonButton size="sm" onClick={handleSaveDefense}>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </NeonButton>
                </div>
              )}
            </div>

            {/* 当前防守阵容 */}
            <NeonCard className="p-4 mb-6">
              <div className="text-sm text-white/50 mb-3">
                {defenseConfig ? `上次更新: ${formatDate(defenseConfig.updatedAt)}` : '暂无防守阵容'}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {isEditingDefense ? (
                  <>
                    {defenseLineup.map((animalId, i) => {
                      const animal = ownedAnimals.find(a => a.id === animalId);
                      if (!animal) return null;
                      const template = getAnimalTemplate(animal.templateId);
                      return (
                        <div
                          key={animalId}
                          onClick={() => handleToggleDefenseAnimal(animalId)}
                          className="flex flex-col items-center p-3 rounded-lg bg-red-500/20 border-2 border-red-500/50 cursor-pointer hover:bg-red-500/30 transition-colors"
                        >
                          <div className="text-3xl mb-1">{template?.emoji || '❓'}</div>
                          <div className="text-xs text-white truncate w-full text-center">{template?.name || '未知'}</div>
                          <div className="text-xs text-yellow-400">Lv.{animal.level}</div>
                          <div className="text-xs text-red-400 mt-1">点击移除</div>
                        </div>
                      );
                    })}
                    {Array.from({ length: 4 - defenseLineup.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="flex flex-col items-center justify-center p-3 rounded-lg border-2 border-dashed border-white/20 min-h-[120px]"
                      >
                        <div className="text-4xl text-white/20 mb-1">+</div>
                        <div className="text-xs text-white/30">空位</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {defenseConfig?.animalIds.map(animalId => {
                      const animal = ownedAnimals.find(a => a.id === animalId);
                      if (!animal) return null;
                      return getAnimalDisplay(animal);
                    })}
                    {(!defenseConfig || defenseConfig.animalIds.length === 0) && (
                      <div className="col-span-4 flex flex-col items-center justify-center py-8 text-white/30">
                        <ShieldAlert className="w-12 h-12 mb-2" />
                        <div>暂无防守阵容，其他玩家可以随意挑战你</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </NeonCard>

            {/* 可选动物列表（编辑模式） */}
            {isEditingDefense && (
              <div>
                <div className="text-sm text-white/50 mb-3">点击动物添加到防守阵容（最多4只）</div>
                <div className="grid grid-cols-4 gap-3">
                  {availableAnimals.map(animal => {
                    const isSelected = defenseLineup.includes(animal.id);
                    const template = getAnimalTemplate(animal.templateId);
                    return (
                      <div
                        key={animal.id}
                        onClick={() => !isSelected && handleToggleDefenseAnimal(animal.id)}
                        className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="text-3xl mb-1">{template?.emoji || '❓'}</div>
                        <div className="text-xs text-white truncate w-full text-center">{template?.name || '未知'}</div>
                        <div className="text-xs text-yellow-400">Lv.{animal.level}</div>
                        {isSelected && <div className="text-xs text-green-400 mt-1">已选中</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 防守统计 */}
            <NeonCard className="p-4 mt-6">
              <div className="text-sm text-white/50 mb-3">防守统计</div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{rankInfo.totalDefenses}</div>
                  <div className="text-xs text-white/50">总防守次数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{rankInfo.defenseWins}</div>
                  <div className="text-xs text-white/50">防守胜利</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {rankInfo.totalDefenses - rankInfo.defenseWins}
                  </div>
                  <div className="text-xs text-white/50">防守失败</div>
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        {/* 记录标签页 */}
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-purple-400" />
              <span className="text-lg font-bold text-white">挑战记录</span>
              <span className="text-sm text-white/50">（最近100场）</span>
            </div>

            {challengeHistory.length === 0 ? (
              <Empty title="暂无挑战记录" icon={History} />
            ) : (
              <div className="space-y-3">
                {[...challengeHistory].reverse().map(record => (
                  <NeonCard key={record.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                            record.isWin ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}
                        >
                          {record.isPlayerAttacker
                            ? record.isWin
                              ? <CheckCircle className="w-6 h-6 text-green-400" />
                              : <XCircle className="w-6 h-6 text-red-400" />
                            : record.isWin
                              ? <Shield className="w-6 h-6 text-green-400" />
                              : <ShieldAlert className="w-6 h-6 text-red-400" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">
                              {record.isPlayerAttacker ? '进攻' : '防守'}
                            </span>
                            <span className={`text-sm font-bold ${record.isWin ? 'text-green-400' : 'text-red-400'}`}>
                              {record.isWin ? '胜利' : '失败'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-white/70">
                              {record.challengerAvatar} {record.challengerName}
                            </span>
                            <ChevronRight className="w-4 h-4 text-white/30" />
                            <span className="text-sm text-white/70">
                              {record.defenderAvatar} {record.defenderName}
                            </span>
                          </div>
                          <div className="text-xs text-white/50 mt-1">
                            {formatDate(record.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div
                          className={`text-lg font-bold flex items-center gap-1 ${
                            record.arenaPointsChange >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {record.arenaPointsChange >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {record.arenaPointsChange >= 0 ? '+' : ''}{record.arenaPointsChange}
                        </div>
                        <NeonButton size="sm" variant="ghost" onClick={() => handleWatchReplay(record)}>
                          <Play className="w-3 h-3 mr-1" />
                          回放
                        </NeonButton>
                      </div>
                    </div>
                  </NeonCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 奖励标签页 */}
        {activeTab === 'rewards' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold text-white">每日奖励</span>
            </div>

            {/* 段位奖励说明 */}
            <NeonCard className="p-4 mb-6">
              <div className="text-sm text-white/50 mb-4">各段位每日基础奖励</div>
              <div className="space-y-2">
                {['rookie', 'amateur', 'professional', 'elite', 'legendary', 'champion'].map((tier) => {
                  const config = getArenaTierConfig(tier as any);
                  return (
                    <div key={tier} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{config.emoji}</span>
                        <span className="text-white" style={{ color: config.color }}>{config.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Coins className="w-4 h-4" />
                          {config.rewards.coins}
                        </span>
                        <span className="text-purple-400 flex items-center gap-1">
                          <Gem className="w-4 h-4" />
                          {config.rewards.gems}
                        </span>
                        {config.rewards.materials && config.rewards.materials.length > 0 && (
                          <span className="text-green-400 text-sm">
                            +{config.rewards.materials.length} 材料
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </NeonCard>

            {/* 领取每日奖励 */}
            {pendingDailyReward && !pendingDailyReward.claimed && (
              <NeonCard className="p-6 mb-6 border-2" style={{ borderColor: '#fbbf24' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                      <Award className="w-6 h-6" />
                      今日奖励可领取
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-white flex items-center gap-1">
                        <Coins className="w-5 h-5 text-yellow-400" />
                        {pendingDailyReward.coins}
                      </span>
                      <span className="text-white flex items-center gap-1">
                        <Gem className="w-5 h-5 text-purple-400" />
                        {pendingDailyReward.gems}
                      </span>
                      {pendingDailyReward.materials && pendingDailyReward.materials.length > 0 && (
                        <span className="text-green-400">
                          +{pendingDailyReward.materials.length} 材料
                        </span>
                      )}
                    </div>
                  </div>
                  <NeonButton onClick={handleClaimDailyReward}>
                    领取奖励
                  </NeonButton>
                </div>
              </NeonCard>
            )}

            {/* 历史奖励记录 */}
            <div className="text-sm text-white/50 mb-3">最近领取记录</div>
            {dailyRewards.length === 0 ? (
              <Empty title="暂无奖励记录" icon={Award} />
            ) : (
              <div className="space-y-2">
                {[...dailyRewards].reverse().map((reward, i) => (
                  <NeonCard key={i} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-bold"
                          style={{ backgroundColor: `${getTierColor(reward.tier)}30`, color: getTierColor(reward.tier) }}
                        >
                          {ARENA_TIER_EMOJIS[reward.tier]} {ARENA_TIER_NAMES[reward.tier]}
                        </span>
                        <span className="text-sm text-white/50">
                          排名 #{reward.rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400 flex items-center gap-1 text-sm">
                          <Coins className="w-4 h-4" />
                          {reward.coins}
                        </span>
                        <span className="text-purple-400 flex items-center gap-1 text-sm">
                          <Gem className="w-4 h-4" />
                          {reward.gems}
                        </span>
                        <span className="text-xs text-white/30">
                          {reward.date}
                        </span>
                      </div>
                    </div>
                  </NeonCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 战斗结果弹窗 */}
      {showAttackResult && lastAttackResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <NeonCard className="max-w-md w-full p-6" style={{ borderColor: lastAttackResult.isWin ? '#22c55e' : '#ef4444' }}>
            <div className="text-center">
              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${
                  lastAttackResult.isWin ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                {lastAttackResult.isWin ? (
                  <Trophy className="w-10 h-10 text-green-400" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-400" />
                )}
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${lastAttackResult.isWin ? 'text-green-400' : 'text-red-400'}`}>
                {lastAttackResult.isWin ? '挑战成功！' : '挑战失败'}
              </h2>
              <div className="text-white/70 mb-4">
                {selectedOpponent?.name && `vs ${selectedOpponent.name}`}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm text-white/50 mb-1">积分变化</div>
                  <div
                    className={`text-xl font-bold ${
                      lastAttackResult.arenaPointsChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {lastAttackResult.arenaPointsChange >= 0 ? '+' : ''}{lastAttackResult.arenaPointsChange}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-sm text-white/50 mb-1">当前排名</div>
                  <div className="text-xl font-bold text-white">
                    #{lastAttackResult.newRank}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <NeonButton
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    if (selectedRecord) {
                      handleWatchReplay(selectedRecord);
                    }
                    setShowAttackResult(false);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  查看战报
                </NeonButton>
                <NeonButton
                  className="flex-1"
                  onClick={() => setShowAttackResult(false)}
                >
                  确定
                </NeonButton>
              </div>
            </div>
          </NeonCard>
        </div>
      )}

      {/* 每日奖励弹窗 */}
      {showDailyRewardModal && pendingDailyReward && !pendingDailyReward.claimed && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <NeonCard className="max-w-md w-full p-6" style={{ borderColor: '#fbbf24' }}>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 mx-auto flex items-center justify-center mb-4">
                <Award className="w-10 h-10 text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">每日奖励</h2>
              <p className="text-white/70 mb-4">
                你昨日排名 #{pendingDailyReward.rank}，段位 {ARENA_TIER_NAMES[pendingDailyReward.tier]}
              </p>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl mb-1">💰</div>
                  <div className="text-xl font-bold text-yellow-400">{pendingDailyReward.coins}</div>
                  <div className="text-xs text-white/50">金币</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-1">💎</div>
                  <div className="text-xl font-bold text-purple-400">{pendingDailyReward.gems}</div>
                  <div className="text-xs text-white/50">宝石</div>
                </div>
                {pendingDailyReward.materials && pendingDailyReward.materials.length > 0 && (
                  <div className="text-center">
                    <div className="text-3xl mb-1">📦</div>
                    <div className="text-xl font-bold text-green-400">{pendingDailyReward.materials.length}</div>
                    <div className="text-xs text-white/50">材料</div>
                  </div>
                )}
              </div>

              <NeonButton className="w-full" onClick={handleClaimDailyReward}>
                领取奖励
              </NeonButton>
            </div>
          </NeonCard>
        </div>
      )}
    </div>
  );
}
