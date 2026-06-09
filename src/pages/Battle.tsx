import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Swords, ArrowLeft, FastForward, Pause, Play } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { BattleUnitDisplay } from '@/components/BattleUnitDisplay';
import { EffectLayer } from '@/components/EffectLayer';
import { useGameStore } from '@/store/useGameStore';
import { useBattleStore } from '@/store/useBattleStore';
import { BATTLE_CONSTANTS } from '@/engine/constants';
import type { BattleLogEntry } from '@/types';
import { getRarityColor } from '@/utils/format';

export default function Battle() {
  const navigate = useNavigate();
  const params = useParams();
  const battleId = params.id;

  const { battleHistory, lineup, getLineupAnimals, startBattle } = useGameStore();

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

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-cyber-darker rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">我方战力</div>
                    <div className="text-cyber-cyan font-cyber font-bold text-xl">
                      {lineupAnimals.reduce((sum, a) => sum + a.level * 10, 0)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-cyber-darker rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">预计奖励</div>
                    <div className="text-cyber-green font-cyber font-bold text-xl">
                      +{Math.floor(betAmount * 1.5)} 💰
                    </div>
                  </div>
                </div>

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
