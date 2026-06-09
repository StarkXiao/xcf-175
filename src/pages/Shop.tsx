import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Sparkles, Coins, Package, BookOpen, Diamond, History, Info, X, ChevronDown, Star, Flame, Clock, SkipForward } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { PartSlot } from '@/components/PartSlot';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { GACHA_RATES, GACHA_COST, PITY_CONFIG } from '@/engine/constants';
import { getAnimalTemplate } from '@/data/animals';
import { getPartTemplate } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import type { Animal, Part, Skill, Rarity, GachaPoolType, GachaRecord, GachaMultiResult } from '@/types';
import { getRarityColor, getRarityStars, getRarityName, formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';

type GachaType = 'animal' | 'part' | 'skill' | 'limited';

export default function Shop() {
  const navigate = useNavigate();
  const {
    player,
    gachaMulti,
    ownedAnimals,
    ownedParts,
    ownedSkills,
    pityState,
    gachaRecords,
    limitedPool,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<GachaType>('animal');
  const [showResult, setShowResult] = useState(false);
  const [gachaResults, setGachaResults] = useState<GachaMultiResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<GachaPoolType>('animal');
  const [showProbDetail, setShowProbDetail] = useState(false);
  const [lastCost, setLastCost] = useState(0);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (activeTab !== 'limited' || !limitedPool.endsAt) return;

    const update = () => {
      const diff = limitedPool.endsAt - Date.now();
      if (diff <= 0) { setCountdown('已结束'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${d}天${h}时${m}分`);
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [activeTab, limitedPool.endsAt]);

  const handleGacha = (type: GachaType, count: number = 1) => {
    if (isAnimating) return;
    if (type === 'limited' && limitedPool.endsAt && Date.now() > limitedPool.endsAt) return;

    const { results, totalCost } = gachaMulti(type, count);
    if (results.length === 0) return;

    setIsAnimating(true);
    setLastCost(totalCost);

    setTimeout(() => {
      setGachaResults(results);
      setShowResult(true);
      setIsAnimating(false);
    }, 800);
  };

  const isPoolExpired = activeTab === 'limited' && !!limitedPool.endsAt && Date.now() > limitedPool.endsAt;

  const tabs = [
    { type: 'animal' as GachaType, label: '动物', icon: Sparkles, cost: GACHA_COST.animal, currency: 'coins' as const },
    { type: 'part' as GachaType, label: '部件', icon: Package, cost: GACHA_COST.part, currency: 'coins' as const },
    { type: 'skill' as GachaType, label: '技能', icon: BookOpen, cost: GACHA_COST.skill, currency: 'coins' as const },
    { type: 'limited' as GachaType, label: '限定', icon: Diamond, cost: GACHA_COST.limited, currency: 'gems' as const },
  ];

  const getPityInfo = (type: GachaType) => {
    if (type === 'limited') {
      const p = pityState.limited;
      return {
        pullsSinceR4: p.pullsSinceR4,
        pullsSinceR5: p.pullsSinceR5,
        hardPityR4: PITY_CONFIG.limitedHardPityR4,
        hardPityR5: PITY_CONFIG.limitedHardPityR5,
        guaranteedFeatured: p.guaranteedFeatured,
      };
    }
    const p = pityState[type];
    return {
      pullsSinceR4: p.pullsSinceR4,
      pullsSinceR5: p.pullsSinceR5,
      hardPityR4: PITY_CONFIG.hardPityR4,
      hardPityR5: PITY_CONFIG.hardPityR5,
      guaranteedFeatured: false,
    };
  };

  const renderInventory = () => {
    switch (activeTab) {
      case 'animal':
        if (ownedAnimals.length === 0) {
          return (
            <Empty
              icon={Sparkles}
              title="还没有动物"
              description="抽取你的第一只战斗动物吧！"
            />
          );
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedAnimals.map(animal => (
              <AnimalCard key={animal.id} animal={animal} showStats showParts showSkills compact />
            ))}
          </div>
        );

      case 'part':
        if (ownedParts.length === 0) {
          return (
            <Empty
              icon={Package}
              title="还没有部件"
              description="抽取部件来强化你的动物吧！"
            />
          );
        }
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {ownedParts.map(part => (
              <PartSlot key={part.id} slot={part.slot} part={part} />
            ))}
          </div>
        );

      case 'skill':
        if (ownedSkills.length === 0) {
          return (
            <Empty
              icon={BookOpen}
              title="还没有技能"
              description="抽取技能来增强战斗力吧！"
            />
          );
        }
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {ownedSkills.map(skill => (
              <div key={skill.id} className="flex flex-col items-center">
                <SkillIcon skill={skill} size="lg" />
                <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                  {skill.name}
                </span>
              </div>
            ))}
          </div>
        );

      case 'limited':
        return (
          <div className="space-y-4">
            {countdown && (
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 border rounded-lg',
                countdown === '已结束'
                  ? 'bg-red-900/20 border-red-500/30'
                  : 'bg-cyber-yellow/10 border-cyber-yellow/30'
              )}>
                <Clock className={cn('w-4 h-4', countdown === '已结束' ? 'text-red-400' : 'text-cyber-yellow')} />
                <span className={cn('text-sm font-cyber', countdown === '已结束' ? 'text-red-400' : 'text-cyber-yellow')}>
                  {countdown === '已结束' ? '限定池已结束' : `限定池剩余时间: ${countdown}`}
                </span>
              </div>
            )}
            {isPoolExpired && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-center">
                <p className="text-red-400 font-cyber font-bold">⚠️ 限定池已过期，无法继续抽取</p>
              </div>
            )}
            <NeonCard variant="yellow" className="border-cyber-yellow/30">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-cyber-yellow" />
                <h3 className="font-cyber font-bold text-cyber-yellow">UP! 限定加成</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-2">限定动物</p>
                  {limitedPool.featuredAnimalTemplateIds.map(id => {
                    const t = getAnimalTemplate(id);
                    if (!t) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{t.emoji}</span>
                        <span className="text-sm font-cyber" style={{ color: getRarityColor(t.rarity) }}>{t.name}</span>
                        <span className="text-xs" style={{ color: getRarityColor(t.rarity) }}>{getRarityStars(t.rarity)}</span>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">限定部件</p>
                  {limitedPool.featuredPartTemplateIds.map(id => {
                    const t = getPartTemplate(id);
                    if (!t) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{t.emoji}</span>
                        <span className="text-sm font-cyber" style={{ color: getRarityColor(t.rarity) }}>{t.name}</span>
                        <span className="text-xs" style={{ color: getRarityColor(t.rarity) }}>{getRarityStars(t.rarity)}</span>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">限定技能</p>
                  {limitedPool.featuredSkillTemplateIds.map(id => {
                    const t = getSkillTemplate(id);
                    if (!t) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{t.emoji}</span>
                        <span className="text-sm font-cyber" style={{ color: getRarityColor(t.rarity) }}>{t.name}</span>
                        <span className="text-xs" style={{ color: getRarityColor(t.rarity) }}>{getRarityStars(t.rarity)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </NeonCard>
          </div>
        );
    }
  };

  const renderPityBar = (current: number, max: number, label: string, color: string) => {
    const pct = Math.min((current / max) * 100, 100);
    const isClose = current >= max * 0.75;

    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className={cn(isClose && 'animate-pulse')} style={{ color }}>
            {current}/{max}
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
              boxShadow: isClose ? `0 0 8px ${color}` : 'none',
            }}
          />
        </div>
      </div>
    );
  };

  const renderResultItem = (result: GachaMultiResult, index: number) => {
    const rarityColor = getRarityColor(result.item.rarity);
    const stars = getRarityStars(result.item.rarity);
    const isHighRarity = result.item.rarity >= 4;

    return (
      <div
        key={index}
        className={cn(
          'flex flex-col items-center',
          isHighRarity ? 'animate-bounce-in' : 'animate-fade-in'
        )}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div
          className="relative w-24 h-24 rounded-full flex items-center justify-center mb-3"
          style={{
            border: `4px solid ${rarityColor}`,
            boxShadow: `0 0 30px ${rarityColor}60, inset 0 0 20px ${rarityColor}20`,
            background: `linear-gradient(135deg, ${rarityColor}10, ${rarityColor}30)`,
          }}
        >
          <span className="text-5xl">
            {'emoji' in result.item ? result.item.emoji : '✨'}
          </span>
          {result.isNew && (
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-cyber-yellow text-cyber-dark rounded text-xs font-cyber font-bold animate-pulse">
              NEW!
            </div>
          )}
          {result.isPity && (
            <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-cyber-pink text-white rounded text-xs font-cyber font-bold">
              保底
            </div>
          )}
          {result.isFeatured && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyber-yellow text-cyber-dark rounded text-xs font-cyber font-bold whitespace-nowrap">
              UP!
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-xs" style={{ color: rarityColor }}>{stars}</div>
          <div className="font-cyber font-bold" style={{ color: rarityColor }}>
            {result.item.name}
          </div>
          <div className="text-xs mt-0.5 px-1.5 py-0.5 rounded" style={{
            color: rarityColor,
            background: `${rarityColor}15`,
          }}>
            {result.itemType === 'animal' ? '动物' : result.itemType === 'part' ? '部件' : '技能'}
          </div>
        </div>
      </div>
    );
  };

  const highestRarityInResults = gachaResults.reduce<Rarity>(
    (max, r) => r.item.rarity > max ? r.item.rarity : max,
    1 as Rarity
  );

  const poolRecords = gachaRecords
    .filter(r => r.poolType === historyFilter)
    .slice(-50)
    .reverse();

  const renderHistoryItem = (record: GachaRecord) => {
    const color = getRarityColor(record.rarity);
    return (
      <div
        key={record.id}
        className="flex items-center gap-3 py-2 px-3 rounded-lg border border-gray-800 bg-gray-900/50"
      >
        <span className="text-2xl">{record.itemEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-cyber text-sm truncate" style={{ color }}>
              {record.itemName}
            </span>
            <span className="text-xs" style={{ color }}>{getRarityStars(record.rarity)}</span>
            {record.isNew && (
              <span className="text-xs bg-cyber-yellow/20 text-cyber-yellow px-1 rounded">NEW</span>
            )}
          </div>
          <p className="text-xs text-gray-500">{formatTime(record.timestamp)}</p>
        </div>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          record.poolType === 'limited' ? 'bg-cyber-yellow/20 text-cyber-yellow' : 'bg-gray-700 text-gray-400'
        )}>
          {record.poolType === 'limited' ? '限定' : record.itemType === 'animal' ? '动物' : record.itemType === 'part' ? '部件' : '技能'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
              </NeonButton>
              <h1 className="text-2xl font-cyber font-bold text-cyber-purple">霓虹商店</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
                <Coins className="w-5 h-5 text-cyber-yellow" />
                <span className="font-cyber font-bold text-cyber-yellow">{player.coins}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg">
                <Diamond className="w-5 h-5 text-cyber-cyan" />
                <span className="font-cyber font-bold text-cyber-cyan">{player.gems}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {tabs.map(tab => (
            <NeonCard
              key={tab.type}
              variant={tab.type === 'animal' ? 'purple' : tab.type === 'part' ? 'cyan' : tab.type === 'skill' ? 'pink' : 'yellow'}
              className={cn(
                'cursor-pointer transition-all relative overflow-hidden',
                activeTab === tab.type ? 'ring-2 ring-white/50' : 'opacity-80 hover:opacity-100'
              )}
              onClick={() => setActiveTab(tab.type)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
                style={{ background: tab.type === 'animal' ? '#a855f7' : tab.type === 'part' ? '#06b6d4' : tab.type === 'skill' ? '#ec4899' : '#f59e0b' }}
              />
              <tab.icon className="w-10 h-10 mb-3" />
              <h3 className="font-cyber font-bold text-xl mb-2">{tab.label}召唤</h3>
              <p className="text-sm text-gray-400 mb-4">
                {tab.type === 'animal' && '获得新的战斗动物'}
                {tab.type === 'part' && '获得改造部件'}
                {tab.type === 'skill' && '获得强力技能'}
                {tab.type === 'limited' && '限定UP! 高概率获得稀有物'}
              </p>
              <div className="flex gap-2">
                <NeonButton
                  size="sm"
                  variant={tab.type === 'animal' ? 'purple' : tab.type === 'part' ? 'cyan' : tab.type === 'skill' ? 'pink' : 'yellow'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGacha(tab.type, 1);
                  }}
                  disabled={player[tab.currency] < tab.cost || isAnimating || (tab.type === 'limited' && !!limitedPool.endsAt && Date.now() > limitedPool.endsAt)}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  单抽 {tab.cost}{tab.currency === 'gems' ? '💎' : '💰'}
                </NeonButton>
                <NeonButton
                  size="sm"
                  variant={tab.type === 'animal' ? 'purple' : tab.type === 'part' ? 'cyan' : tab.type === 'skill' ? 'pink' : 'yellow'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGacha(tab.type, 10);
                  }}
                  disabled={player[tab.currency] < tab.cost * 10 || isAnimating || (tab.type === 'limited' && !!limitedPool.endsAt && Date.now() > limitedPool.endsAt)}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  十连 {tab.cost * 10}{tab.currency === 'gems' ? '💎' : '💰'}
                </NeonButton>
              </div>
            </NeonCard>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <NeonCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-cyber font-bold text-sm text-gray-400">保底进度</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Info className="w-3 h-3" />
                <span>达到上限后必出高稀有</span>
              </div>
            </div>
            {(() => {
              const pity = getPityInfo(activeTab);
              return (
                <>
                  {renderPityBar(pity.pullsSinceR4, pity.hardPityR4, `${getRarityName(4)}保底`, getRarityColor(4))}
                  {renderPityBar(pity.pullsSinceR5, pity.hardPityR5, `${getRarityName(5)}保底`, getRarityColor(5))}
                  {activeTab === 'limited' && pity.guaranteedFeatured && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
                      <Star className="w-4 h-4 text-cyber-yellow" />
                      <span className="text-xs font-cyber text-cyber-yellow">大保底生效中 — 下次5★必为UP!</span>
                    </div>
                  )}
                </>
              );
            })()}
          </NeonCard>

          <NeonCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-cyber font-bold text-sm text-gray-400">召唤概率</h3>
              <button
                onClick={() => setShowProbDetail(!showProbDetail)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <ChevronDown className={cn('w-3 h-3 transition-transform', showProbDetail && 'rotate-180')} />
                详情
              </button>
            </div>
            {(() => {
              const pity = getPityInfo(activeTab);
              const isLimited = activeTab === 'limited';
              const softPityStart = isLimited ? PITY_CONFIG.limitedSoftPityR5Start : PITY_CONFIG.softPityR5Start;
              const softPityBonus = isLimited ? PITY_CONFIG.limitedSoftPityR5Bonus : PITY_CONFIG.softPityR5Bonus;
              const inSoftPity = pity.pullsSinceR5 >= softPityStart - 1;
              const currentR5Rate = inSoftPity
                ? GACHA_RATES[activeTab][5] + (pity.pullsSinceR5 - (softPityStart - 1)) * softPityBonus
                : GACHA_RATES[activeTab][5];
              const cappedR5Rate = Math.min(currentR5Rate, 100);

              return (
                <>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {([1, 2, 3, 4, 5] as Rarity[]).map(rarity => {
                      const displayRate = rarity === 5 && inSoftPity
                        ? cappedR5Rate.toFixed(1)
                        : GACHA_RATES[activeTab][rarity];
                      return (
                        <div key={rarity}>
                          <div style={{ color: getRarityColor(rarity) }}>
                            {getRarityStars(rarity)}
                          </div>
                          <div className={cn(rarity === 5 && inSoftPity && 'text-cyber-yellow font-bold')}>
                            {displayRate}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {inSoftPity && (
                    <div className="mt-2 flex items-center gap-2 px-2 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/20 rounded text-xs text-cyber-yellow">
                      <Star className="w-3 h-3" />
                      <span>软保底中！5★概率已提升至 {cappedR5Rate.toFixed(1)}%</span>
                    </div>
                  )}

                  {showProbDetail && (
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-2 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>{getRarityName(4)}保底</span>
                        <span className="text-gray-300">
                          {isLimited ? PITY_CONFIG.limitedHardPityR4 : PITY_CONFIG.hardPityR4}抽未出{getRarityName(4)}必出
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{getRarityName(5)}保底</span>
                        <span className="text-gray-300">
                          {isLimited ? PITY_CONFIG.limitedHardPityR5 : PITY_CONFIG.hardPityR5}抽未出{getRarityName(5)}必出
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>软保底</span>
                        <span className="text-gray-300">
                          {softPityStart}抽起5★概率递增 (+{softPityBonus}%/抽)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>当前5★概率</span>
                        <span className={cn(inSoftPity ? 'text-cyber-yellow' : 'text-gray-300')}>
                          {cappedR5Rate.toFixed(1)}%
                          {inSoftPity && ' (软保底加成)'}
                        </span>
                      </div>
                      {activeTab === 'limited' && (
                        <>
                          <div className="flex justify-between">
                            <span>5★UP率</span>
                            <span className="text-cyber-yellow">{PITY_CONFIG.featuredR5Rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>4★UP率</span>
                            <span className="text-cyber-yellow">{PITY_CONFIG.featuredR4Rate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>大保底机制</span>
                            <span className="text-gray-300">出5★非UP时，下次5★必为UP</span>
                          </div>
                        </>
                      )}
                      <div className="mt-2 pt-2 border-t border-gray-800">
                        <p className="text-gray-500 leading-relaxed">
                          * 概率公示：每次召唤独立计算，基础概率如上所示。软保底从第{softPityStart}抽开始生效，每抽额外增加{softPityBonus}%的5★概率，直至硬保底触发。
                        </p>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </NeonCard>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cyber font-bold text-lg text-gray-300">
            {activeTab === 'limited' ? '限定池' : `我的${activeTab === 'animal' ? '动物' : activeTab === 'part' ? '部件' : '技能'}`}
            {activeTab !== 'limited' && (
              <span className="text-sm text-gray-500 ml-2">
                ({activeTab === 'animal' ? ownedAnimals.length : activeTab === 'part' ? ownedParts.length : ownedSkills.length})
              </span>
            )}
          </h2>
          <NeonButton
            size="sm"
            variant="ghost"
            onClick={() => setShowHistory(true)}
          >
            <History className="w-4 h-4 mr-1" />
            抽卡记录
          </NeonButton>
        </div>
        {renderInventory()}
      </div>

      {isAnimating && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-cyber-purple/30 animate-ping" />
              <div className="absolute inset-4 rounded-full border-4 border-cyber-cyan/50 animate-pulse" />
              <div className="absolute inset-8 rounded-full border-4 border-cyber-pink animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl animate-bounce">✨</span>
              </div>
            </div>
            <h2 className="text-3xl font-cyber font-black bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent animate-pulse">
              召唤中...
            </h2>
            <button
              onClick={() => {
                setIsAnimating(false);
                setShowResult(true);
              }}
              className="mt-4 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1 mx-auto"
            >
              <SkipForward className="w-4 h-4" />
              跳过
            </button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-cyber-dark border-2 rounded-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto"
            style={{ borderColor: getRarityColor(highestRarityInResults) }}
          >
            <h2 className="text-3xl font-cyber font-black text-center mb-2 bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent">
              🎉 召唤结果
            </h2>
            <p className="text-center text-sm text-gray-400 mb-6">
              {gachaResults.some(r => r.isPity) && <span className="text-cyber-pink">保底触发！</span>}
              {gachaResults.some(r => r.isFeatured) && <span className="text-cyber-yellow ml-2">UP! 加成</span>}
              {lastCost > 0 && (
                <span className="ml-2">
                  消耗 <span className={cn(activeTab === 'limited' ? 'text-cyber-cyan' : 'text-cyber-yellow')}>
                    {lastCost}{activeTab === 'limited' ? '💎' : '💰'}
                  </span>
                </span>
              )}
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {gachaResults.map((result, i) => renderResultItem(result, i))}
            </div>

            <div className="flex gap-4 justify-center">
              <NeonButton
                variant="ghost"
                onClick={() => setShowResult(false)}
              >
                关闭
              </NeonButton>
              <NeonButton
                variant={activeTab === 'limited' ? 'yellow' : activeTab === 'animal' ? 'purple' : activeTab === 'part' ? 'cyan' : 'pink'}
                onClick={() => {
                  setShowResult(false);
                  handleGacha(activeTab, gachaResults.length);
                }}
                disabled={
                  (activeTab === 'limited'
                    ? player.gems < GACHA_COST.limited * gachaResults.length
                    : player.coins < GACHA_COST[activeTab] * gachaResults.length) || isAnimating || isPoolExpired
                }
              >
                <Sparkles className="w-4 h-4 mr-2" />
                再来{gachaResults.length}连
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-gray-700 rounded-2xl max-w-lg w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-cyber font-bold text-gray-300">抽卡记录</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {(['animal', 'part', 'skill', 'limited'] as GachaPoolType[]).map(poolType => (
                <button
                  key={poolType}
                  onClick={() => setHistoryFilter(poolType)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-cyber transition-colors',
                    historyFilter === poolType
                      ? poolType === 'animal' ? 'bg-cyber-purple/20 text-cyber-purple'
                        : poolType === 'part' ? 'bg-cyber-cyan/20 text-cyber-cyan'
                          : poolType === 'skill' ? 'bg-cyber-pink/20 text-cyber-pink'
                            : 'bg-cyber-yellow/20 text-cyber-yellow'
                      : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  {poolType === 'animal' ? '动物' : poolType === 'part' ? '部件' : poolType === 'skill' ? '技能' : '限定'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {poolRecords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无记录</p>
              ) : (
                poolRecords.map((record) => renderHistoryItem(record))
              )}
            </div>

            {poolRecords.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
                <span>共 {poolRecords.length} 条记录</span>
                <div className="flex gap-3">
                  <span>5★: {poolRecords.filter(r => r.rarity === 5).length} ({(poolRecords.filter(r => r.rarity === 5).length / poolRecords.length * 100).toFixed(1)}%)</span>
                  <span>4★: {poolRecords.filter(r => r.rarity === 4).length} ({(poolRecords.filter(r => r.rarity === 4).length / poolRecords.length * 100).toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
