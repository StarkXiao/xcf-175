import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Swords, Users, BookOpen, ShoppingBag, Trophy, Sparkles, Star, TrendingUp, TrendingDown, Zap, Clock, ChevronRight, Crown, Map, Link2, Gift } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { MiniChart } from '@/components/MiniChart';
import { useGameStore } from '@/store/useGameStore';
import { BATTLE_CONSTANTS, ELEMENT_EMOJIS, ELEMENT_COLORS, STAR_LEVEL_NAMES, BREAKTHROUGH_TIER_NAMES } from '@/engine/constants';
import { getAnimalTemplate } from '@/data/animals';
import { ANIMAL_TEMPLATES } from '@/data/animals';
import { BOND_TEMPLATES, calculateBondLevel, calculateAllBondBonuses } from '@/data/bonds';
import { calculateAnimalStats } from '@/engine/battleEngine';
import { getRarityColor } from '@/utils/format';
import { formatTime } from '@/utils/format';
import { useSeasonStore } from '@/store/useSeasonStore';
import { formatRankDisplay, getRankEmoji, getRankColor } from '@/data/seasons';

export default function Home() {
  const navigate = useNavigate();
  const { lineup, ownedAnimals, startBattle, battleHistory, codex, player, gachaRecords, codexData, claimMilestoneReward, refreshBonds, refreshCodexMilestones } = useGameStore();
  const { currentRank, currentSeason } = useSeasonStore();
  const canBattle = lineup.length > 0 && lineup.length <= BATTLE_CONSTANTS.MAX_TEAM_SIZE;
  const lastBattle = battleHistory[0];

  const quickBattle = () => {
    if (!canBattle) return;
    const result = startBattle(100);
    if (result.success) {
      navigate(`/battle/${result.battleRecord.id}`);
    }
  };

  const stats = [
    { icon: Trophy, label: '胜利场次', value: battleHistory.filter(b => b.isWin).length, color: 'green' },
    { icon: Swords, label: '总战斗', value: battleHistory.length, color: 'cyan' },
    { icon: Users, label: '拥有动物', value: ownedAnimals.length, color: 'pink' },
    { icon: Sparkles, label: '胜率', value: battleHistory.length > 0 ? Math.round((battleHistory.filter(b => b.isWin).length / battleHistory.length) * 100) + '%' : '0%', color: 'yellow' },
  ];

  const sortedBattles = useMemo(() =>
    [...battleHistory].sort((a, b) => a.timestamp - b.timestamp),
    [battleHistory]
  );

  const assetTrendData = useMemo(() => {
    if (sortedBattles.length === 0) return [];
    let cumulative = 0;
    return sortedBattles.map(b => {
      cumulative += b.reward - b.betAmount;
      return cumulative;
    });
  }, [sortedBattles]);

  const winRateTrendData = useMemo(() => {
    if (sortedBattles.length < 2) return [];
    const windowSize = 5;
    return sortedBattles.map((_, i) => {
      const start = Math.max(0, i - windowSize + 1);
      const window = sortedBattles.slice(start, i + 1);
      return Math.round((window.filter(b => b.isWin).length / window.length) * 100);
    });
  }, [sortedBattles]);

  const { frequentLineup, frequentLineupCount } = useMemo(() => {
    if (battleHistory.length === 0) {
      return {
        frequentLineup: lineup.map(id => ownedAnimals.find(a => a.id === id)).filter(Boolean),
        frequentLineupCount: 0,
      };
    }
    const lineupCount: Record<string, { ids: string[]; count: number }> = {};
    battleHistory.forEach(b => {
      const key = [...b.playerLineup].sort().join(',');
      const existing = lineupCount[key];
      if (existing) {
        existing.count++;
      } else {
        lineupCount[key] = { ids: [...b.playerLineup], count: 1 };
      }
    });
    let best: { ids: string[]; count: number } | null = null;
    Object.values(lineupCount).forEach(entry => {
      if (!best || entry.count > best.count) best = entry;
    });
    if (!best || best.ids.length === 0) {
      return {
        frequentLineup: lineup.map(id => ownedAnimals.find(a => a.id === id)).filter(Boolean),
        frequentLineupCount: 0,
      };
    }
    return {
      frequentLineup: best.ids.map(id => ownedAnimals.find(a => a.id === id)).filter(Boolean),
      frequentLineupCount: best.count,
    };
  }, [battleHistory, lineup, ownedAnimals]);

  const growthRecords = useMemo(() => {
    const records: { id: string; type: 'battle' | 'gacha'; icon: string; text: string; detail: string; time: number; color: string }[] = [];

    const recentBattles = sortedBattles.slice(-10);
    recentBattles.forEach(b => {
      const net = b.reward - b.betAmount;
      records.push({
        id: b.id,
        type: 'battle',
        icon: b.isWin ? '🏆' : '💀',
        text: b.isWin ? '战斗胜利' : '战斗失败',
        detail: `vs ${b.opponentName}  ${net >= 0 ? '+' : ''}${net}💰`,
        time: b.timestamp,
        color: b.isWin ? '#00ff88' : '#ff4444',
      });
    });

    const recentGacha = [...gachaRecords]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
    recentGacha.forEach(g => {
      const rarityColor = getRarityColor(g.rarity);
      records.push({
        id: g.id,
        type: 'gacha',
        icon: g.itemEmoji,
        text: g.isNew ? `获得新${g.itemType === 'animal' ? '动物' : g.itemType === 'part' ? '部件' : '技能'}` : '抽取重复',
        detail: `${g.itemName} ${'★'.repeat(g.rarity)}`,
        time: g.timestamp,
        color: rarityColor,
      });
    });

    return records.sort((a, b) => b.time - a.time).slice(0, 12);
  }, [sortedBattles, gachaRecords]);

  const recentWinRate = useMemo(() => {
    const recent = sortedBattles.slice(-10);
    if (recent.length === 0) return 0;
    return Math.round((recent.filter(b => b.isWin).length / recent.length) * 100);
  }, [sortedBattles]);

  const assetTrendDirection = useMemo(() => {
    if (assetTrendData.length < 2) return 'flat';
    const last = assetTrendData[assetTrendData.length - 1];
    const prev = assetTrendData[assetTrendData.length - 2];
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'flat';
  }, [assetTrendData]);

  const ownedTemplateIds = useMemo(
    () => new Set(ownedAnimals.map(a => a.templateId)),
    [ownedAnimals]
  );

  const activeBondsList = useMemo(() => {
    return BOND_TEMPLATES
      .map(bond => ({ bond, level: calculateBondLevel(bond, ownedTemplateIds) }))
      .filter(e => e.level > 0);
  }, [ownedTemplateIds]);

  const bondBonuses = useMemo(
    () => calculateAllBondBonuses(ownedTemplateIds),
    [ownedTemplateIds]
  );

  const claimableMilestones = useMemo(() => {
    return codexData.milestones.filter(m => {
      if (m.isClaimed) return false;
      let progress = 0;
      if (m.type === 'collection') progress = ownedTemplateIds.size;
      else if (m.type === 'bond') progress = codexData.totalBondsActivated;
      else if (m.id === 'milestone_rarity_4') progress = ownedAnimals.some(a => a.rarity >= 4) ? 1 : 0;
      else if (m.id === 'milestone_rarity_5') progress = ownedAnimals.some(a => a.rarity >= 5) ? 1 : 0;
      return progress >= m.targetValue;
    });
  }, [codexData, ownedTemplateIds, ownedAnimals]);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="relative overflow-hidden py-12 px-4 mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-purple/20 to-transparent" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyber-cyan/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-cyber-pink/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-cyber font-black mb-4 bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent leading-tight">
            霓虹斗兽场
          </h1>
          <p className="text-xl text-gray-400 mb-8 font-cyber tracking-wider">
            NEON COLOSSEUM
          </p>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            在赛博朋克的地下世界，改造流浪动物，组建最强阵容，
            下注对战，赢取荣誉与财富！
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <NeonButton
              size="lg"
              variant="cyan"
              onClick={quickBattle}
              disabled={!canBattle}
              className="text-lg px-8"
            >
              <Swords className="w-6 h-6 mr-2" />
              快速对战
            </NeonButton>
            <NeonButton
              size="lg"
              variant="pink"
              onClick={() => navigate('/lineup')}
              className="text-lg px-8"
            >
              <Users className="w-6 h-6 mr-2" />
              编辑阵容
            </NeonButton>
          </div>

          {!canBattle && lineup.length === 0 && (
            <p className="mt-4 text-cyber-yellow text-sm">
              请先在「阵容编辑」中选择出战动物
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <NeonCard key={i} variant={stat.color as any} className="text-center">
              <stat.icon className="w-8 h-8 mx-auto mb-2" />
              <div className="text-3xl font-cyber font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-gray-400 font-cyber">{stat.label}</div>
            </NeonCard>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <NeonCard variant="cyan" className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyber-cyan" />
                <h3 className="font-cyber font-bold text-cyber-cyan">资产趋势</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyber-yellow font-cyber font-bold">{player.coins.toLocaleString()}</span>
                <span className="text-xs">💰</span>
                {assetTrendDirection === 'up' && <TrendingUp className="w-4 h-4 text-cyber-green" />}
                {assetTrendDirection === 'down' && <TrendingDown className="w-4 h-4 text-cyber-red" />}
              </div>
            </div>
            {assetTrendData.length >= 2 ? (
              <MiniChart
                data={assetTrendData}
                width={400}
                height={80}
                color="#00ffff"
                gradientFrom="#00ffff"
                gradientTo="#05050a"
                className="w-full"
              />
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-600 text-sm font-cyber">
                至少需要2场战斗才能显示趋势
              </div>
            )}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>累计净收益: {assetTrendData.length > 0 ? assetTrendData[assetTrendData.length - 1] : 0} 💰</span>
              <span>近{Math.min(sortedBattles.length, 10)}场</span>
            </div>
          </NeonCard>

          <NeonCard variant="yellow" className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyber-yellow" />
                <h3 className="font-cyber font-bold text-cyber-yellow">胜率变化</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-cyber font-bold" style={{ color: recentWinRate >= 50 ? '#00ff88' : '#ff4444' }}>
                  {recentWinRate}%
                </span>
                <span className="text-xs text-gray-500">近10场</span>
              </div>
            </div>
            {winRateTrendData.length >= 2 ? (
              <MiniChart
                data={winRateTrendData}
                width={400}
                height={80}
                color="#ffdd00"
                gradientFrom="#ffdd00"
                gradientTo="#05050a"
                className="w-full"
              />
            ) : (
              <div className="h-20 flex items-center justify-center text-gray-600 text-sm font-cyber">
                至少需要2场战斗才能显示趋势
              </div>
            )}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>历史胜率: {battleHistory.length > 0 ? Math.round((battleHistory.filter(b => b.isWin).length / battleHistory.length) * 100) : 0}%</span>
              <span>连胜: {player.currentWinStreak} / 最高: {player.highestWinStreak}</span>
            </div>
          </NeonCard>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <NeonCard variant="pink">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyber-pink" />
                <h3 className="font-cyber font-bold text-cyber-pink">常用阵容</h3>
                {frequentLineupCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30">
                    出场{frequentLineupCount}次
                  </span>
                )}
              </div>
              <NeonButton size="sm" variant="ghost" onClick={() => navigate('/lineup')}>
                <ChevronRight className="w-4 h-4" />
              </NeonButton>
            </div>
            {frequentLineup.length > 0 ? (
              <div className="space-y-2">
                {frequentLineup.map((animal, i) => {
                  if (!animal) return null;
                  const template = getAnimalTemplate(animal.templateId);
                  if (!template) return null;
                  const stats = calculateAnimalStats(animal);
                  const rarityColor = getRarityColor(animal.rarity);
                  return (
                    <div
                      key={animal.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-cyber-dark/60 border border-gray-700/40 hover:border-cyber-pink/30 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl shrink-0"
                        style={{
                          border: `1px solid ${rarityColor}60`,
                          background: `${ELEMENT_COLORS[template.element]}10`,
                        }}
                      >
                        {template.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-cyber font-bold text-sm truncate" style={{ color: rarityColor }}>
                            {animal.name}
                          </span>
                          <span className="text-[10px] px-1 py-0.5 bg-gray-800 rounded text-gray-400 font-cyber">
                            Lv.{animal.level}
                          </span>
                          <span className="text-[10px]" style={{ color: ELEMENT_COLORS[template.element] }}>
                            {ELEMENT_EMOJIS[template.element]}
                          </span>
                          <span className="text-[10px] px-1 py-0.5 rounded border border-cyber-yellow/20 bg-cyber-yellow/5 text-cyber-yellow">
                            ⭐{STAR_LEVEL_NAMES[animal.starLevel]}
                          </span>
                          {animal.breakthroughTier > 0 && (
                            <span className="text-[10px] px-1 py-0.5 rounded border border-cyber-purple/20 bg-cyber-purple/5 text-cyber-purple">
                              🔮{BREAKTHROUGH_TIER_NAMES[animal.breakthroughTier]}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-0.5 text-[10px] text-gray-500">
                          <span>❤️{stats.hp}</span>
                          <span>⚔️{stats.atk}</span>
                          <span>🛡️{stats.def}</span>
                          <span>⚡{stats.spd}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-600 font-cyber">
                        {['前排', '中排', '后排'][i] || `位置${i + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-gray-500 text-sm mb-2">尚未配置阵容</p>
                <NeonButton size="sm" onClick={() => navigate('/lineup')}>
                  前往编辑
                </NeonButton>
              </div>
            )}
          </NeonCard>

          <NeonCard variant="purple">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyber-purple" />
                <h3 className="font-cyber font-bold text-cyber-purple">最近成长记录</h3>
              </div>
            </div>
            {growthRecords.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {growthRecords.map(record => (
                  <div
                    key={record.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-cyber-dark/40 border border-gray-700/30 hover:border-cyber-purple/20 transition-colors"
                  >
                    <span className="text-base shrink-0 w-6 text-center">{record.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: record.color }}>
                          {record.text}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{record.detail}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0">{formatTime(record.time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-gray-500 text-sm">暂无成长记录</p>
                <p className="text-gray-600 text-xs mt-1">进行战斗或抽取卡池来记录成长</p>
              </div>
            )}
          </NeonCard>
        </div>

        {lastBattle && (
          <NeonCard className="mb-8">
            <h3 className="font-cyber font-bold text-lg mb-4 text-cyber-cyan">
              最近战绩
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-cyber font-bold ${lastBattle.isWin ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {lastBattle.isWin ? '胜利' : '失败'}
                </span>
                <span className="text-gray-400 mx-2">vs</span>
                <span className="text-gray-300">{lastBattle.opponentName}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-cyber-yellow">
                  {lastBattle.isWin ? '+' : '-'}{lastBattle.reward} 💰
                </span>
                <NeonButton size="sm" onClick={() => navigate(`/replay/${lastBattle.id}`)}>
                  回放
                </NeonButton>
              </div>
            </div>
          </NeonCard>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <NeonCard variant="pink" className="cursor-pointer hover:border-cyber-pink transition-colors" onClick={() => navigate('/codex')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-cyber-pink" />
                <h3 className="font-cyber font-bold text-cyber-pink">羁绊加成</h3>
                {activeBondsList.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-pink/15 text-cyber-pink border border-cyber-pink/30">
                    {activeBondsList.length} 激活
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            {activeBondsList.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] mb-2">
                  {[
                    { label: 'HP', value: bondBonuses.hp, color: '#ff4444' },
                    { label: 'ATK', value: bondBonuses.atk, color: '#ff8800' },
                    { label: 'DEF', value: bondBonuses.def, color: '#00ccff' },
                    { label: 'SPD', value: bondBonuses.spd, color: '#00ff66' },
                    { label: 'CRIT', value: bondBonuses.crit, color: '#ffdd00' },
                  ].map(stat => (
                    <div key={stat.label} className="p-1 rounded bg-cyber-dark/60 border border-gray-700/30">
                      <div className="text-gray-500">{stat.label}</div>
                      <div className="font-cyber font-bold" style={{ color: stat.value > 0 ? stat.color : '#444' }}>+{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeBondsList.slice(0, 4).map(({ bond, level }) => (
                    <span
                      key={bond.id}
                      className="text-[10px] px-1.5 py-0.5 rounded font-cyber font-bold border"
                      style={{
                        backgroundColor: `${bond.color}15`,
                        color: bond.color,
                        borderColor: `${bond.color}40`,
                      }}
                    >
                      {bond.emoji} {bond.name} Lv.{level}
                    </span>
                  ))}
                  {activeBondsList.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                      +{activeBondsList.length - 4} 更多
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-xs">收集更多动物来激活羁绊加成</p>
            )}
          </NeonCard>

          <NeonCard variant="yellow" className="cursor-pointer hover:border-cyber-yellow transition-colors" onClick={() => navigate('/codex')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-cyber-yellow" />
                <h3 className="font-cyber font-bold text-cyber-yellow">图鉴成就</h3>
                {claimableMilestones.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-yellow/15 text-cyber-yellow border border-cyber-yellow/30 animate-pulse">
                    {claimableMilestones.length} 可领取
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-400">收集进度</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyber-cyan transition-all"
                    style={{ width: `${Math.round((ownedTemplateIds.size / ANIMAL_TEMPLATES.length) * 100)}%` }}
                  />
                </div>
                <span className="text-cyber-cyan font-cyber font-bold">{ownedTemplateIds.size}/{ANIMAL_TEMPLATES.length}</span>
              </div>
              {claimableMilestones.length > 0 && (
                <div className="space-y-1.5">
                  {claimableMilestones.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center gap-2 p-1.5 rounded bg-cyber-dark/60 border border-cyber-yellow/20">
                      <span className="text-sm">{m.emoji}</span>
                      <span className="text-xs text-gray-300 flex-1">{m.name}</span>
                      <span className="text-[10px] font-cyber font-bold" style={{ color: m.reward.type === 'coins' ? '#ffdd00' : '#00ccff' }}>
                        {m.reward.type === 'coins' ? '💰' : '💎'}{m.reward.amount}
                      </span>
                      <NeonButton
                        size="sm"
                        variant={m.reward.type === 'coins' ? 'yellow' : 'cyan'}
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshBonds();
                          refreshCodexMilestones();
                          claimMilestoneReward(m.id);
                          refreshCodexMilestones();
                        }}
                        className="!px-2 !py-0.5 !text-[10px]"
                      >
                        <Gift className="w-3 h-3 mr-0.5" />
                        领取
                      </NeonButton>
                    </div>
                  ))}
                </div>
              )}
              {claimableMilestones.length === 0 && (
                <p className="text-gray-500 text-xs">完成收集与羁绊条件来解锁成就奖励</p>
              )}
            </div>
          </NeonCard>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Map,
              title: '剧情闯关',
              desc: '探索霓虹都市，挑战关卡，解锁丰厚首通奖励',
              action: () => navigate('/story'),
              color: 'cyan' as const,
            },
            {
              icon: Users,
              title: '阵容编辑',
              desc: '组建你的3只动物战队，装备改造部件',
              action: () => navigate('/lineup'),
              color: 'cyan' as const,
            },
            {
              icon: BookOpen,
              title: '技能配置',
              desc: '为动物配备强力技能，打造独特战斗风格',
              action: () => navigate('/skills'),
              color: 'pink' as const,
            },
            {
              icon: ShoppingBag,
              title: '霓虹商店',
              desc: '抽取新动物、部件和技能',
              action: () => navigate('/shop'),
              color: 'purple' as const,
            },
            {
              icon: Star,
              title: '升星突破',
              desc: '消耗材料提升星级与突破等阶',
              action: () => navigate('/ascend'),
              color: 'yellow' as const,
            },
            {
              icon: BookOpen,
              title: `图鉴与羁绊`,
              desc: `收集 ${ownedTemplateIds.size}/${ANIMAL_TEMPLATES.length} · 羁绊 ${codexData.totalBondsActivated}/${BOND_TEMPLATES.length}`,
              action: () => navigate('/codex'),
              color: 'cyan' as const,
            },
            {
              icon: Swords,
              title: '开始战斗',
              desc: '下注对战AI对手，赢取丰厚奖励',
              action: () => navigate('/battle'),
              color: 'red' as const,
            },
            {
              icon: Crown,
              title: `天梯 · ${formatRankDisplay(currentRank.tier, currentRank.subTier)}`,
              desc: `${currentSeason.name} ${currentSeason.subtitle} · ${currentRank.points}积分`,
              action: () => navigate('/season'),
              color: 'yellow' as const,
            },
            {
              icon: Trophy,
              title: '战斗回放',
              desc: '回顾精彩战斗，研究战术',
              action: () => navigate('/replay'),
              color: 'yellow' as const,
            },
          ].map((item, i) => (
            <NeonCard
              key={i}
              variant={item.color}
              className="cursor-pointer hover:scale-105 transition-transform"
              onClick={item.action}
            >
              <item.icon className="w-12 h-12 mb-4" />
              <h3 className="font-cyber font-bold text-xl mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </NeonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
