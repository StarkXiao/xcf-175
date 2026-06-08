import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trophy, ArrowLeft, Play, FastForward, RotateCcw, Clock } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { BattleUnitDisplay } from '@/components/BattleUnitDisplay';
import { EffectLayer } from '@/components/EffectLayer';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { useReplayStore } from '@/store/useReplayStore';
import type { BattleLogEntry } from '@/types';
import { formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';

export default function Replay() {
  const navigate = useNavigate();
  const params = useParams();
  const replayId = params.id;

  const { battleHistory } = useGameStore();
  const {
    playerUnits,
    enemyUnits,
    battleLog,
    currentLogIndex,
    isPlaying,
    speed,
    isPaused,
    battleRecord,
    loadReplay,
    playReplay,
    pauseReplay,
    resumeReplay,
    setSpeed,
    seekTo,
    resetReplay,
    attackingUnitId,
    hurtUnitId,
  } = useReplayStore();

  const [selectedRecord, setSelectedRecord] = useState<string | null>(replayId || null);

  useEffect(() => {
    if (replayId) {
      const record = battleHistory.find(b => b.id === replayId);
      if (record) {
        loadReplay(record);
        setSelectedRecord(replayId);
      }
    }
  }, [replayId, battleHistory, loadReplay]);

  useEffect(() => {
    if (battleRecord && isPlaying && !isPaused) {
      const timer = playReplay();
      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [battleRecord, isPlaying, isPaused, playReplay]);

  const handleSelectRecord = (id: string) => {
    const record = battleHistory.find(b => b.id === id);
    if (record) {
      loadReplay(record);
      setSelectedRecord(id);
      navigate(`/replay/${id}`, { replace: true });
    }
  };

  const currentLog = battleLog[currentLogIndex] as BattleLogEntry | undefined;
  const progress = battleLog.length > 0 ? ((currentLogIndex + 1) / battleLog.length) * 100 : 0;

  if (!selectedRecord) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
              </NeonButton>
              <h1 className="text-2xl font-cyber font-bold text-cyber-yellow">战斗回放</h1>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {battleHistory.length === 0 ? (
            <Empty
              icon={Trophy}
              title="暂无战斗记录"
              description="去参加战斗，创造你的辉煌战绩吧！"
              action={
                <NeonButton onClick={() => navigate('/battle')}>
                  开始战斗
                </NeonButton>
              }
            />
          ) : (
            <div className="space-y-3">
              {[...battleHistory].reverse().map(record => (
                <NeonCard
                  key={record.id}
                  className="cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => handleSelectRecord(record.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
                        record.isWin ? 'bg-cyber-green/20' : 'bg-cyber-red/20'
                      )}>
                        {record.isWin ? '🏆' : '💀'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-cyber font-bold ${record.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                            {record.isWin ? '胜利' : '失败'}
                          </span>
                          <span className="text-gray-400">vs</span>
                          <span className="text-white">{record.opponentName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(record.timestamp)}
                          </span>
                          <span>回合数: {record.battleLog.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-cyber font-bold ${record.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                        {record.isWin ? '+' : '-'}{record.reward} 💰
                      </div>
                      <div className="text-xs text-gray-500">
                        下注: {record.betAmount}
                      </div>
                    </div>
                  </div>
                </NeonCard>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <EffectLayer active={isPlaying} />

      <div className="absolute inset-0 bg-gradient-to-b from-cyber-yellow/10 via-transparent to-cyber-purple/10" />
      <div className="absolute inset-0 scanlines opacity-30" />
      <div className="absolute inset-0 grid-bg opacity-20" />

      <div className="relative z-10">
        <div className="sticky top-0 bg-cyber-darker/90 backdrop-blur-sm border-b border-gray-800 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <NeonButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    resetReplay();
                    setSelectedRecord(null);
                    navigate('/replay', { replace: true });
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </NeonButton>
                <div>
                  <h1 className="text-xl font-cyber font-bold text-cyber-yellow">
                    战斗回放
                  </h1>
                  {battleRecord && (
                    <p className="text-xs text-gray-400">
                      VS <span className="text-cyber-pink">{battleRecord.opponentName}</span>
                      <span className="mx-2">·</span>
                      {formatTime(battleRecord.timestamp)}
                    </p>
                  )}
                </div>
              </div>

              {battleRecord && (
                <div className="flex items-center gap-2">
                  <span className="text-cyber-yellow font-cyber text-sm">
                    {currentLogIndex + 1}/{battleLog.length}
                  </span>
                  <NeonButton
                    size="sm"
                    onClick={() => resetReplay()}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </NeonButton>
                  <NeonButton
                    size="sm"
                    onClick={() => isPaused ? resumeReplay() : pauseReplay()}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : '⏸'}
                  </NeonButton>
                  <NeonButton size="sm" onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 3 : 1)}>
                    {speed}x
                  </NeonButton>
                </div>
              )}
            </div>

            {battleRecord && (
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max={battleLog.length - 1}
                  value={currentLogIndex}
                  onChange={(e) => seekTo(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyber-yellow"
                />
              </div>
            )}
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
                <div className="text-6xl font-cyber font-black text-cyber-yellow/30 animate-pulse">
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
                        ? 'bg-cyber-yellow/10 text-cyber-yellow'
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
                  <NeonButton onClick={() => resetReplay()}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重新播放
                  </NeonButton>
                  <NeonButton variant="cyan" onClick={() => navigate('/battle')}>
                    再来一局
                  </NeonButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
