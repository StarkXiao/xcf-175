import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trophy, ArrowLeft, Play, RotateCcw, Clock, Zap, Skull, Flame, Heart, Swords, ChevronDown, ChevronUp, AlertTriangle, Target, TrendingDown } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { BattleUnitDisplay } from '@/components/BattleUnitDisplay';
import { EffectLayer } from '@/components/EffectLayer';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { useReplayStore } from '@/store/useReplayStore';
import type { BattleLogEntry, BattleUnit } from '@/types';
import { formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';

interface KeyEvent {
  index: number;
  type: 'crit' | 'death' | 'combo' | 'elementAdvantage' | 'skill' | 'comboTrigger';
  label: string;
  icon: string;
  color: string;
  message: string;
}

interface BattleSummary {
  playerTotalDamage: number;
  enemyTotalDamage: number;
  playerTotalHealing: number;
  enemyTotalHealing: number;
  playerBiggestHit: { value: number; sourceName: string; targetName: string };
  enemyBiggestHit: { value: number; sourceName: string; targetName: string };
  playerCritCount: number;
  enemyCritCount: number;
  playerComboCount: number;
  enemyComboCount: number;
  playerDeathCount: number;
  enemyDeathCount: number;
  playerSkillCount: number;
  enemySkillCount: number;
  totalRounds: number;
  elementAdvantageCount: number;
}

interface FailureAnalysis {
  firstPlayerDeath: { unitName: string; roundIndex: number; killerName: string } | null;
  biggestDamageTaken: { value: number; sourceName: string; targetName: string } | null;
  enemyComboHighlights: { roundIndex: number; sourceName: string; message: string }[];
  elementDisadvantageCount: number;
  playerHealTotal: number;
  enemyHealTotal: number;
  survivedUnits: number;
  totalPlayerUnits: number;
  deathTimeline: { unitName: string; roundIndex: number; killerName: string }[];
}

const extractKeyEvents = (battleLog: BattleLogEntry[], playerUnitIds: Set<string>): KeyEvent[] => {
  const events: KeyEvent[] = [];

  battleLog.forEach((log, index) => {
    if (log.type === 'crit') {
      events.push({
        index,
        type: 'crit',
        label: '暴击',
        icon: '💥',
        color: 'text-cyber-yellow',
        message: `${log.sourceName || '?'} → ${log.targetName || '?'} 暴击 ${log.value || 0}`,
      });
    }
    if (log.type === 'death') {
      events.push({
        index,
        type: 'death',
        label: '阵亡',
        icon: '💀',
        color: 'text-cyber-red',
        message: `${log.targetName || '?'} 阵亡`,
      });
    }
    if (log.type === 'combo' || log.type === 'comboTrigger') {
      events.push({
        index,
        type: 'combo',
        label: '连击',
        icon: '⚡',
        color: 'text-cyber-pink',
        message: log.message,
      });
    }
    if (log.type === 'elementAdvantage') {
      events.push({
        index,
        type: 'elementAdvantage',
        label: '克制',
        icon: '🔥',
        color: 'text-orange-400',
        message: log.message,
      });
    }
    if (log.type === 'skill' && log.value && log.value > 0) {
      const isPlayerSkill = log.sourceId ? playerUnitIds.has(log.sourceId) : false;
      if (isPlayerSkill) {
        events.push({
          index,
          type: 'skill',
          label: '技能',
          icon: '✨',
          color: 'text-cyber-cyan',
          message: `${log.sourceName || '?'} 使用 ${log.skillName || '技能'}`,
        });
      }
    }
  });

  return events;
};

const computeBattleSummary = (battleLog: BattleLogEntry[], playerUnitIds: Set<string>): BattleSummary => {
  let playerTotalDamage = 0;
  let enemyTotalDamage = 0;
  let playerTotalHealing = 0;
  let enemyTotalHealing = 0;
  let playerBiggestHit: BattleSummary['playerBiggestHit'] = { value: 0, sourceName: '', targetName: '' };
  let enemyBiggestHit: BattleSummary['enemyBiggestHit'] = { value: 0, sourceName: '', targetName: '' };
  let playerCritCount = 0;
  let enemyCritCount = 0;
  let playerComboCount = 0;
  let enemyComboCount = 0;
  let playerDeathCount = 0;
  let enemyDeathCount = 0;
  let playerSkillCount = 0;
  let enemySkillCount = 0;
  let elementAdvantageCount = 0;

  for (const log of battleLog) {
    const isPlayerSource = log.sourceId ? playerUnitIds.has(log.sourceId) : false;
    const isPlayerTarget = log.targetId ? playerUnitIds.has(log.targetId) : false;

    if (log.type === 'damage' || log.type === 'crit' || log.type === 'elementAdvantage' || log.type === 'statusTick') {
      const dmg = log.value || 0;
      if (isPlayerSource) {
        playerTotalDamage += dmg;
        if (dmg > playerBiggestHit.value) {
          playerBiggestHit = { value: dmg, sourceName: log.sourceName || '', targetName: log.targetName || '' };
        }
      } else if (isPlayerTarget) {
        enemyTotalDamage += dmg;
        if (dmg > enemyBiggestHit.value) {
          enemyBiggestHit = { value: dmg, sourceName: log.sourceName || '', targetName: log.targetName || '' };
        }
      }
    }

    if (log.type === 'crit') {
      if (isPlayerSource) playerCritCount++;
      else enemyCritCount++;
    }

    if (log.type === 'heal') {
      const heal = log.value || 0;
      if (isPlayerTarget) playerTotalHealing += heal;
      else enemyTotalHealing += heal;
    }

    if (log.type === 'combo' || log.type === 'comboTrigger') {
      if (isPlayerSource) playerComboCount++;
      else enemyComboCount++;
    }

    if (log.type === 'death') {
      if (isPlayerTarget) playerDeathCount++;
      else enemyDeathCount++;
    }

    if (log.type === 'skill') {
      if (isPlayerSource) playerSkillCount++;
      else enemySkillCount++;
    }

    if (log.type === 'elementAdvantage') {
      elementAdvantageCount++;
    }
  }

  return {
    playerTotalDamage,
    enemyTotalDamage,
    playerTotalHealing,
    enemyTotalHealing,
    playerBiggestHit,
    enemyBiggestHit,
    playerCritCount,
    enemyCritCount,
    playerComboCount,
    enemyComboCount,
    playerDeathCount,
    enemyDeathCount,
    playerSkillCount,
    enemySkillCount,
    totalRounds: battleLog.length,
    elementAdvantageCount,
  };
};

const computeFailureAnalysis = (battleLog: BattleLogEntry[], playerUnitIds: Set<string>, initialPlayerUnits: BattleUnit[]): FailureAnalysis => {
  let firstPlayerDeath: FailureAnalysis['firstPlayerDeath'] = null;
  let biggestDamageTaken: FailureAnalysis['biggestDamageTaken'] = null;
  const enemyComboHighlights: FailureAnalysis['enemyComboHighlights'] = [];
  let elementDisadvantageCount = 0;
  let playerHealTotal = 0;
  let enemyHealTotal = 0;
  let survivedUnits = initialPlayerUnits.length;
  const deathTimeline: FailureAnalysis['deathTimeline'] = [];

  for (let i = 0; i < battleLog.length; i++) {
    const log = battleLog[i];
    const isPlayerTarget = log.targetId ? playerUnitIds.has(log.targetId) : false;
    const isPlayerSource = log.sourceId ? playerUnitIds.has(log.sourceId) : false;

    if (log.type === 'death' && isPlayerTarget) {
      if (!firstPlayerDeath) {
        firstPlayerDeath = {
          unitName: log.targetName || '未知',
          roundIndex: i,
          killerName: log.sourceName || '敌方',
        };
      }
      deathTimeline.push({
        unitName: log.targetName || '未知',
        roundIndex: i,
        killerName: log.sourceName || '敌方',
      });
      survivedUnits--;
    }

    if ((log.type === 'damage' || log.type === 'crit' || log.type === 'elementAdvantage') && isPlayerTarget) {
      const dmg = log.value || 0;
      if (!biggestDamageTaken || dmg > biggestDamageTaken.value) {
        biggestDamageTaken = {
          value: dmg,
          sourceName: log.sourceName || '敌方',
          targetName: log.targetName || '我方',
        };
      }
    }

    if ((log.type === 'combo' || log.type === 'comboTrigger') && !isPlayerSource) {
      enemyComboHighlights.push({
        roundIndex: i,
        sourceName: log.sourceName || '敌方',
        message: log.message,
      });
    }

    if (log.type === 'heal') {
      if (isPlayerTarget) playerHealTotal += log.value || 0;
      else enemyHealTotal += log.value || 0;
    }

    if (log.type === 'elementAdvantage' && !isPlayerSource) {
      elementDisadvantageCount++;
    }
  }

  return {
    firstPlayerDeath,
    biggestDamageTaken,
    enemyComboHighlights: enemyComboHighlights.slice(0, 5),
    elementDisadvantageCount,
    playerHealTotal,
    enemyHealTotal,
    survivedUnits,
    totalPlayerUnits: initialPlayerUnits.length,
    deathTimeline,
  };
};

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
  const [showKeyEvents, setShowKeyEvents] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showFailureAnalysis, setShowFailureAnalysis] = useState(false);

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

  const playerUnitIds = useMemo(() => {
    if (!battleRecord) return new Set<string>();
    const ids = new Set<string>();
    const units = battleRecord.initialPlayerUnits?.length > 0
      ? battleRecord.initialPlayerUnits
      : battleRecord.playerUnits;
    units.forEach(u => ids.add(u.id));
    return ids;
  }, [battleRecord]);

  const keyEvents = useMemo(() => {
    if (!battleLog.length) return [];
    return extractKeyEvents(battleLog, playerUnitIds);
  }, [battleLog, playerUnitIds]);

  const battleSummary = useMemo(() => {
    if (!battleLog.length) return null;
    return computeBattleSummary(battleLog, playerUnitIds);
  }, [battleLog, playerUnitIds]);

  const failureAnalysis = useMemo(() => {
    if (!battleRecord || battleRecord.isWin || !battleLog.length) return null;
    const initialUnits = battleRecord.initialPlayerUnits?.length > 0
      ? battleRecord.initialPlayerUnits
      : battleRecord.playerUnits;
    return computeFailureAnalysis(battleLog, playerUnitIds, initialUnits);
  }, [battleRecord, battleLog, playerUnitIds]);

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
              <div className="mt-2 relative">
                <input
                  type="range"
                  min="0"
                  max={battleLog.length - 1}
                  value={currentLogIndex}
                  onChange={(e) => seekTo(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyber-yellow"
                />
                <div className="absolute inset-0 pointer-events-none" style={{ top: '2px', height: '8px' }}>
                  {keyEvents.map((evt) => {
                    const pos = ((evt.index + 1) / battleLog.length) * 100;
                    return (
                      <div
                        key={evt.index}
                        className="absolute top-0 w-1.5 h-2 rounded-full"
                        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                        title={evt.message}
                      >
                        <div className={cn(
                          'w-1.5 h-2 rounded-full',
                          evt.type === 'death' ? 'bg-cyber-red' :
                          evt.type === 'crit' ? 'bg-cyber-yellow' :
                          evt.type === 'combo' ? 'bg-cyber-pink' :
                          evt.type === 'elementAdvantage' ? 'bg-orange-400' :
                          'bg-cyber-cyan'
                        )} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {battleRecord && (
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-2 mb-4 flex-wrap">
              <NeonButton
                size="sm"
                variant={showKeyEvents ? 'yellow' : 'ghost'}
                onClick={() => setShowKeyEvents(!showKeyEvents)}
              >
                <Zap className="w-3 h-3 mr-1" />
                关键事件 ({keyEvents.length})
              </NeonButton>
              <NeonButton
                size="sm"
                variant={showSummary ? 'yellow' : 'ghost'}
                onClick={() => setShowSummary(!showSummary)}
              >
                <Swords className="w-3 h-3 mr-1" />
                战报摘要
              </NeonButton>
              {!battleRecord.isWin && (
                <NeonButton
                  size="sm"
                  variant={showFailureAnalysis ? 'red' : 'ghost'}
                  onClick={() => setShowFailureAnalysis(!showFailureAnalysis)}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  失败分析
                </NeonButton>
              )}
            </div>

            {showKeyEvents && keyEvents.length > 0 && (
              <NeonCard size="sm" className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-cyber font-bold text-sm text-cyber-yellow flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    关键事件定位
                  </h3>
                  <span className="text-xs text-gray-500">点击跳转</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {keyEvents.map((evt) => (
                    <div
                      key={evt.index}
                      className={cn(
                        'flex items-center gap-2 text-sm py-1.5 px-2 rounded cursor-pointer hover:bg-white/5 transition-colors',
                        currentLogIndex >= evt.index ? 'opacity-100' : 'opacity-50'
                      )}
                      onClick={() => seekTo(evt.index)}
                    >
                      <span className="text-base flex-shrink-0">{evt.icon}</span>
                      <span className={cn('flex-shrink-0', evt.color)}>[{evt.label}]</span>
                      <span className="text-gray-300 truncate flex-1">{evt.message}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">#{evt.index + 1}</span>
                    </div>
                  ))}
                </div>
              </NeonCard>
            )}

            {showSummary && battleSummary && (
              <NeonCard size="sm" className="mb-4">
                <h3 className="font-cyber font-bold text-sm text-cyber-yellow flex items-center gap-2 mb-3">
                  <Swords className="w-4 h-4" />
                  战报摘要
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="space-y-2">
                    <div className="text-xs font-cyber text-cyber-cyan mb-1">我方</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">总伤害</span>
                      <span className="text-cyber-green font-cyber">{battleSummary.playerTotalDamage}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">总治疗</span>
                      <span className="text-cyber-cyan font-cyber">{battleSummary.playerTotalHealing}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">暴击</span>
                      <span className="text-cyber-yellow font-cyber">{battleSummary.playerCritCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">连击</span>
                      <span className="text-cyber-pink font-cyber">{battleSummary.playerComboCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">技能</span>
                      <span className="text-cyber-purple font-cyber">{battleSummary.playerSkillCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">阵亡</span>
                      <span className="text-cyber-red font-cyber">{battleSummary.playerDeathCount}</span>
                    </div>
                    {battleSummary.playerBiggestHit.value > 0 && (
                      <div className="text-xs text-gray-500">
                        最高伤害: {battleSummary.playerBiggestHit.sourceName} → {battleSummary.playerBiggestHit.targetName} ({battleSummary.playerBiggestHit.value})
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-cyber text-cyber-pink mb-1">敌方</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">总伤害</span>
                      <span className="text-cyber-red font-cyber">{battleSummary.enemyTotalDamage}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">总治疗</span>
                      <span className="text-cyber-cyan font-cyber">{battleSummary.enemyTotalHealing}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">暴击</span>
                      <span className="text-cyber-yellow font-cyber">{battleSummary.enemyCritCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">连击</span>
                      <span className="text-cyber-pink font-cyber">{battleSummary.enemyComboCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">技能</span>
                      <span className="text-cyber-purple font-cyber">{battleSummary.enemySkillCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">阵亡</span>
                      <span className="text-cyber-red font-cyber">{battleSummary.enemyDeathCount}</span>
                    </div>
                    {battleSummary.enemyBiggestHit.value > 0 && (
                      <div className="text-xs text-gray-500">
                        最高伤害: {battleSummary.enemyBiggestHit.sourceName} → {battleSummary.enemyBiggestHit.targetName} ({battleSummary.enemyBiggestHit.value})
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                  <span>总回合: {battleSummary.totalRounds}</span>
                  <span>克制触发: {battleSummary.elementAdvantageCount}</span>
                </div>
              </NeonCard>
            )}

            {showFailureAnalysis && failureAnalysis && (
              <NeonCard size="sm" variant="red" className="mb-4">
                <h3 className="font-cyber font-bold text-sm text-cyber-red flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  失败原因分析
                </h3>
                <div className="space-y-3">
                  {failureAnalysis.firstPlayerDeath && (
                    <div className="flex items-start gap-2">
                      <Skull className="w-4 h-4 text-cyber-red flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-200">首次阵亡</div>
                        <div className="text-xs text-gray-400">
                          <span className="text-cyber-red">{failureAnalysis.firstPlayerDeath.unitName}</span>
                          {' '}在第 {failureAnalysis.firstPlayerDeath.roundIndex + 1} 回合被{' '}
                          <span className="text-cyber-pink">{failureAnalysis.firstPlayerDeath.killerName}</span> 击杀
                        </div>
                      </div>
                    </div>
                  )}

                  {failureAnalysis.biggestDamageTaken && failureAnalysis.biggestDamageTaken.value > 0 && (
                    <div className="flex items-start gap-2">
                      <Flame className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-200">最大承伤</div>
                        <div className="text-xs text-gray-400">
                          <span className="text-cyber-pink">{failureAnalysis.biggestDamageTaken.sourceName}</span>
                          {' '}→ <span className="text-cyber-red">{failureAnalysis.biggestDamageTaken.targetName}</span>
                          {' '}<span className="text-orange-400 font-cyber">({failureAnalysis.biggestDamageTaken.value})</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {failureAnalysis.elementDisadvantageCount > 0 && (
                    <div className="flex items-start gap-2">
                      <TrendingDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-200">属性劣势</div>
                        <div className="text-xs text-gray-400">
                          敌方触发克制 {failureAnalysis.elementDisadvantageCount} 次，建议调整阵容属性搭配
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-cyber-cyan flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-200">存活统计</div>
                      <div className="text-xs text-gray-400">
                        {failureAnalysis.survivedUnits}/{failureAnalysis.totalPlayerUnits} 存活
                        {failureAnalysis.survivedUnits === 0 && ' · 全军覆没'}
                      </div>
                    </div>
                  </div>

                  {failureAnalysis.playerHealTotal < failureAnalysis.enemyHealTotal && (
                    <div className="flex items-start gap-2">
                      <Heart className="w-4 h-4 text-cyber-cyan flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-200">治疗差距</div>
                        <div className="text-xs text-gray-400">
                          我方治疗 {failureAnalysis.playerHealTotal} vs 敌方 {failureAnalysis.enemyHealTotal}，治疗量不足可能导致续航能力差
                        </div>
                      </div>
                    </div>
                  )}

                  {failureAnalysis.enemyComboHighlights.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-cyber-pink flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-200">敌方连击威胁</div>
                        <div className="space-y-1">
                          {failureAnalysis.enemyComboHighlights.map((combo, i) => (
                            <div key={i} className="text-xs text-gray-400 cursor-pointer hover:text-gray-200"
                              onClick={() => seekTo(combo.roundIndex)}>
                              第 {combo.roundIndex + 1} 回合: <span className="text-cyber-pink">{combo.sourceName}</span> - {combo.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {failureAnalysis.deathTimeline.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">阵亡时间线</div>
                      <div className="flex flex-wrap gap-2">
                        {failureAnalysis.deathTimeline.map((d, i) => (
                          <span
                            key={i}
                            className="text-xs bg-cyber-red/10 text-cyber-red px-2 py-0.5 rounded cursor-pointer hover:bg-cyber-red/20"
                            onClick={() => seekTo(d.roundIndex)}
                          >
                            #{d.roundIndex + 1} {d.unitName}↓
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </NeonCard>
            )}

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
                        ? log.type === 'elementAdvantage'
                          ? 'bg-cyber-yellow/10 text-cyber-yellow'
                          : log.type === 'statusTick' || log.type === 'statusApply'
                          ? 'bg-cyber-purple/10 text-cyber-purple'
                          : log.type === 'combo'
                          ? 'bg-cyber-red/10 text-cyber-red'
                          : log.type === 'bond'
                          ? 'bg-cyber-pink/10 text-cyber-pink'
                          : 'bg-cyber-yellow/10 text-cyber-yellow'
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
