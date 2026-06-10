import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Swords, ArrowLeft, FastForward, Pause, Play, Flame, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { BattleUnitDisplay } from '@/components/BattleUnitDisplay';
import { EffectLayer } from '@/components/EffectLayer';
import { useGameStore } from '@/store/useGameStore';
import { useBattleStore } from '@/store/useBattleStore';
import { useSeasonStore } from '@/store/useSeasonStore';
import { BATTLE_CONSTANTS } from '@/engine/constants';
import type { BattleLogEntry, MatchmakingResult } from '@/types';
import { getRarityColor } from '@/utils/format';
import { computePlayerStrengthScore, computeLineupSignature, calculateDynamicDifficulty, DYNAMIC_TIER_NAMES, DYNAMIC_TIER_EMOJIS, DYNAMIC_TIER_COLORS } from '@/data/opponents';
import { formatRankDisplay, getRankColor, getRankEmoji } from '@/data/seasons';

const MATCH_QUALITY_LABELS: Record<MatchmakingResult['matchQuality'], { text: string; color: string }> = {
  fair: { text: '势均力敌', color: '#ffcc00' },
  advantage: { text: '实力占优', color: '#44cc44' },
  challenge: { text: '强敌挑战', color: '#ff4444' },
};

export default function Battle() {
  const navigate = useNavigate();
  const params = useParams();
  const battleId = params.id;

  const { battleHistory, lineup, getLineupAnimals, startBattle, player } = useGameStore();
  const rankChange = useSeasonStore(state => state.lastRankChange);
  const protectionState = useSeasonStore(state => state.protectionState);

  const lineupAnimals = getLineupAnimals();
  const {
    playerUnits,
    enemyUnits,
    battleLog,
    currentLogIndex,
    isPlaying,
    speed,
    isPaused,
    battleRecord,
    initBattle,
    playBattle,
    pauseBattle,
    resumeBattle,
    setSpeed,
    stepForward,
    resetBattle,
    attackingUnitId,
    hurtUnitId,
  } = useBattleStore();

  const [betAmount, setBetAmount] = useState(100);
  const [showBetModal, setShowBetModal] = useState(!battleId);

  const dynamicInfo = useMemo(() => {
    if (lineupAnimals.length === 0) return null;
    const strengthScore = computePlayerStrengthScore(lineupAnimals);
    const avgLevel = Math.floor(lineupAnimals.reduce((s, a) => s + a.level, 0) / lineupAnimals.length);
    const currentSig = computeLineupSignature(lineup);
    const recentSigs = [
      currentSig,
      ...battleHistory.slice(0, 9).map(r => computeLineupSignature(r.playerLineup)),
    ];
    return calculateDynamicDifficulty(strengthScore, avgLevel, player.currentWinStreak, recentSigs);
  }, [lineupAnimals, player.currentWinStreak, battleHistory, lineup]);

  useEffect(() => {
    if (battleId) {
      const record = battleHistory.find(b => b.id === battleId);
      if (record) {
        initBattle(record);
        setShowBetModal(false);
      }
    }
  }, [battleId, battleHistory, initBattle]);

  const handleStartBattle = useCallback(() => {
    if (lineup.length === 0) return;
    const result = startBattle(betAmount);
    if (result.success) {
      initBattle(result.battleRecord);
      setShowBetModal(false);
    }
  }, [betAmount, lineup.length, startBattle, initBattle]);

  useEffect(() => {
    if (battleRecord && isPlaying && !isPaused) {
      const timer = playBattle();
      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [battleRecord, isPlaying, isPaused, playBattle]);

  const currentLog = battleLog[currentLogIndex] as BattleLogEntry | undefined;

  const triggerEffects = useCallback((log: BattleLogEntry) => {
    if (typeof window !== 'undefined') {
      if (log.type === 'damage' || log.type === 'crit') {
        const isCrit = log.type === 'crit';
        (window as any).triggerHitEffect?.(
          window.innerWidth / 2 + (Math.random() - 0.5) * 100,
          window.innerHeight / 2,
          isCrit
        );
      } else if (log.type === 'heal') {
        (window as any).triggerHealEffect?.(
          window.innerWidth / 2,
          window.innerHeight / 2
        );
      } else if (log.type === 'skill') {
        (window as any).triggerSkillEffect?.(
          window.innerWidth / 2,
          window.innerHeight / 3,
          getRarityColor(3)
        );
      }
    }
  }, []);

  useEffect(() => {
    if (currentLog) {
      triggerEffects(currentLog);
    }
  }, [currentLogIndex, currentLog, triggerEffects]);

  const getUnitPosition = (unitId: string) => {
    const playerIndex = playerUnits.findIndex(u => u.id === unitId);
    if (playerIndex >= 0) {
      return { x: 200 + playerIndex * 150, y: 300 };
    }
    const enemyIndex = enemyUnits.findIndex(u => u.id === unitId);
    if (enemyIndex >= 0) {
      return { x: window.innerWidth - 200 - enemyIndex * 150, y: 300 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const estimatedReward = useMemo(() => {
    if (!dynamicInfo || betAmount === 0) return 0;
    const baseMultiplier = 1.5;
    const effectiveMultiplier = baseMultiplier * dynamicInfo.rewardMultiplier;
    return Math.floor(betAmount * effectiveMultiplier);
  }, [dynamicInfo, betAmount]);

  if (!battleRecord && !showBetModal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <NeonCard className="text-center p-8">
          <Swords className="w-16 h-16 mx-auto mb-4 text-cyber-red" />
          <h2 className="font-cyber font-bold text-2xl mb-2">战斗记录不存在</h2>
          <p className="text-gray-400 mb-4">该战斗可能已被删除或ID无效</p>
          <NeonButton onClick={() => navigate('/')}>返回首页</NeonButton>
        </NeonCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <EffectLayer active={isPlaying} />

      <div className="absolute inset-0 bg-gradient-to-b from-cyber-purple/10 via-transparent to-cyber-cyan/10" />
      <div className="absolute inset-0 scanlines opacity-30" />
      <div className="absolute inset-0 grid-bg opacity-20" />

      <div className="relative z-10">
        <div className="sticky top-0 bg-cyber-darker/90 backdrop-blur-sm border-b border-gray-800 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-4 h-4" />
                </NeonButton>
                <div>
                  <h1 className="text-xl font-cyber font-bold text-cyber-cyan">
                    {battleRecord ? '战斗中' : '选择对手'}
                  </h1>
                  {battleRecord && (
                    <p className="text-xs text-gray-400">
                      VS <span className="text-cyber-pink">{battleRecord.opponentName}</span>
                    </p>
                  )}
                </div>
              </div>

              {battleRecord && (
                <div className="flex items-center gap-2">
                  <span className="text-cyber-yellow font-cyber text-sm">
                    回合 {currentLogIndex + 1}/{battleLog.length}
                  </span>
                  <NeonButton
                    size="sm"
                    onClick={() => isPaused ? resumeBattle() : pauseBattle()}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </NeonButton>
                  <NeonButton size="sm" onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 3 : 1)}>
                    {speed}x
                  </NeonButton>
                  <NeonButton size="sm" onClick={() => stepForward()}>
                    <FastForward className="w-4 h-4" />
                  </NeonButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {battleRecord && (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-xs text-gray-400 font-cyber mb-1">下注</div>
                <div className="text-cyber-yellow font-cyber font-bold text-xl">
                  {battleRecord.betAmount} 💰
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 font-cyber mb-1">奖励</div>
                <div className={`font-cyber font-bold text-xl ${battleRecord.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {battleRecord.isWin ? '+' : '-'}{battleRecord.reward} 💰
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 font-cyber mb-1">结果</div>
                <div className={`font-cyber font-bold text-xl ${battleRecord.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {battleRecord.isWin ? '胜利' : '失败'}
                </div>
              </div>
            </div>

            <div className="relative min-h-[400px] mb-6">
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
                <div className="text-6xl font-cyber font-black text-cyber-pink/30 animate-pulse">
                  VS
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-cyber font-bold text-cyber-cyan text-center mb-4">我方</h3>
                  <div className="space-y-4">
                    {playerUnits.map(unit => (
                      <BattleUnitDisplay
                        key={unit.id}
                        unit={unit}
                        isAttacking={attackingUnitId === unit.id}
                        isHurt={hurtUnitId === unit.id}
                        showSkills
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-cyber font-bold text-cyber-pink text-center mb-4">敌方</h3>
                  <div className="space-y-4">
                    {enemyUnits.map(unit => (
                      <BattleUnitDisplay
                        key={unit.id}
                        unit={unit}
                        isAttacking={attackingUnitId === unit.id}
                        isHurt={hurtUnitId === unit.id}
                        showSkills
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <NeonCard className="max-h-[200px] overflow-y-auto">
              <h3 className="font-cyber font-bold text-sm text-gray-400 mb-2 sticky top-0 bg-cyber-dark py-2">
                战斗日志
              </h3>
              <div className="space-y-1">
                {battleLog.slice(Math.max(0, currentLogIndex - 10), currentLogIndex + 1).map((log, i) => (
                  <div
                    key={i}
                    className={`text-sm py-1 px-2 rounded ${
                      i === Math.min(10, currentLogIndex)
                        ? log.type === 'elementAdvantage'
                          ? 'bg-cyber-yellow/10 text-cyber-yellow'
                          : log.type === 'statusTick' || log.type === 'statusApply'
                          ? 'bg-cyber-purple/10 text-cyber-purple'
                          : log.type === 'combo'
                          ? 'bg-cyber-red/10 text-cyber-red'
                          : 'bg-cyber-cyan/10 text-cyber-cyan'
                        : 'text-gray-400'
                    }`}
                  >
                    {log.message}
                  </div>
                ))}
              </div>
            </NeonCard>

            {currentLogIndex >= battleLog.length - 1 && (
              <div className="mt-6 text-center">
                <div className={`text-4xl font-cyber font-black mb-4 ${battleRecord.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {battleRecord.isWin ? '🎉 胜利!' : '💀 失败'}
                </div>
                {rankChange && (
                  <NeonCard className="mb-4 p-3 inline-block">
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <div className={`text-sm font-cyber font-bold ${rankChange.pointsChange > 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
                          {rankChange.pointsChange > 0 ? '+' : ''}{rankChange.pointsChange} 天梯积分
                        </div>
                        <div className="text-xs text-gray-500">
                          {rankChange.protectionUsed ? '🛡️ 段位保护已触发' :
                            rankChange.isPromotion ? '🎉 晋段成功！' :
                            rankChange.isDemotion ? '📉 段位下降' : ''}
                        </div>
                      </div>
                      <div
                        className="text-sm font-cyber font-bold px-3 py-1 rounded-lg"
                        style={{
                          color: getRankColor(rankChange.newTier),
                          background: `${getRankColor(rankChange.newTier)}15`,
                          border: `1px solid ${getRankColor(rankChange.newTier)}30`,
                        }}
                      >
                        {formatRankDisplay(rankChange.newTier, rankChange.newSubTier)}
                      </div>
                    </div>
                  </NeonCard>
                )}
                {battleRecord.matchmaking && (() => {
                  const mm = battleRecord.matchmaking!;
                  const qi = MATCH_QUALITY_LABELS[mm.matchQuality];
                  return (
                    <NeonCard className="mb-4 p-3 inline-block">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" style={{ color: qi.color }} />
                          <span className="text-sm font-cyber font-bold" style={{ color: qi.color }}>
                            {qi.text}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          对手: {getRankEmoji(mm.opponentTier)} {formatRankDisplay(mm.opponentTier, mm.opponentSubTier)}
                        </div>
                        <div className="text-xs text-gray-400">
                          积分加成 ×{mm.pointBonus.toFixed(1)}
                        </div>
                      </div>
                    </NeonCard>
                  );
                })()}
                <div className="flex gap-4 justify-center">
                  <NeonButton onClick={() => navigate('/replay')}>
                    查看回放
                  </NeonButton>
                  <NeonButton variant="cyan" onClick={() => {
                    resetBattle();
                    setShowBetModal(true);
                  }}>
                    再来一局
                  </NeonButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showBetModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-cyan rounded-2xl max-w-md w-full p-6">
            <h2 className="font-cyber font-bold text-2xl text-cyber-cyan mb-6 text-center">
              下注对战
            </h2>

            {lineup.length === 0 ? (
              <div className="text-center py-8">
                <Swords className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-4">请先在阵容编辑中选择出战动物</p>
                <NeonButton onClick={() => navigate('/lineup')}>
                  编辑阵容
                </NeonButton>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 font-cyber mb-2">
                    下注金额
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[100, 200, 500, 1000].map(amount => (
                      <NeonButton
                        key={amount}
                        size="sm"
                        variant={betAmount === amount ? 'cyan' : 'ghost'}
                        onClick={() => setBetAmount(amount)}
                      >
                        {amount} 💰
                      </NeonButton>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-cyber-darker rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">战力评分</div>
                    <div className="text-cyber-cyan font-cyber font-bold text-xl">
                      {dynamicInfo?.playerStrengthScore ?? 0}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-cyber-darker rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">预计奖励</div>
                    <div className="text-cyber-green font-cyber font-bold text-xl">
                      +{estimatedReward} 💰
                    </div>
                  </div>
                </div>

                {dynamicInfo && (
                  <NeonCard className="mb-6 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{DYNAMIC_TIER_EMOJIS[dynamicInfo.difficultyTier]}</span>
                        <span
                          className="font-cyber font-bold text-sm"
                          style={{ color: DYNAMIC_TIER_COLORS[dynamicInfo.difficultyTier] }}
                        >
                          难度: {DYNAMIC_TIER_NAMES[dynamicInfo.difficultyTier]}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-cyber">
                        ×{dynamicInfo.difficultyMultiplier.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {player.currentWinStreak > 0 && (
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-cyber-yellow" />
                          <span className="text-cyber-yellow">
                            连胜×{player.currentWinStreak}
                          </span>
                        </div>
                      )}

                      {dynamicInfo.rewardMultiplier > 1.0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-cyber-green" />
                          <span className="text-cyber-green">
                            奖励×{dynamicInfo.rewardMultiplier.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {dynamicInfo.difficultyMultiplier > 1.1 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-cyber-red" />
                          <span className="text-cyber-red">
                            强敌来袭
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, dynamicInfo.difficultyMultiplier * 50)}%`,
                          background: `linear-gradient(to right, ${DYNAMIC_TIER_COLORS[dynamicInfo.difficultyTier]}, ${DYNAMIC_TIER_COLORS[dynamicInfo.difficultyTier]}88)`,
                        }}
                      />
                    </div>
                  </NeonCard>
                )}

                <div className="flex gap-4">
                  <NeonButton
                    variant="ghost"
                    className="flex-1"
                    onClick={() => navigate(-1)}
                  >
                    取消
                  </NeonButton>
                  <NeonButton
                    variant="cyan"
                    className="flex-1"
                    onClick={handleStartBattle}
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    开始战斗
                  </NeonButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
