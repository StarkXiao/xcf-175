import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, Lock, Star, Link2, Trophy, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import type { StarLevel, BreakthroughTier, BondCategory } from '@/types';
import { ANIMAL_TEMPLATES } from '@/data/animals';
import { BOND_TEMPLATES, calculateBondLevel } from '@/data/bonds';
import {
  ELEMENT_EMOJIS,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
  STAR_LEVEL_NAMES,
  BREAKTHROUGH_TIER_NAMES,
  CODEX_RANK_NAMES,
} from '@/engine/constants';
import { isCodexRankUnlocked, CODEX_UNLOCK_CONDITIONS, getStarBonus, getBreakthroughBonus } from '@/data/ascendConfig';
import { getRarityColor } from '@/utils/format';

type TabType = 'codex' | 'bonds' | 'milestones';

export default function Codex() {
  const navigate = useNavigate();
  const { codex, ownedAnimals, codexData, claimMilestoneReward, refreshBonds, refreshCodexMilestones } = useGameStore();
  const [tab, setTab] = useState<TabType>('codex');
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [bondCategory, setBondCategory] = useState<BondCategory | 'all'>('all');
  const [expandedBond, setExpandedBond] = useState<string | null>(null);

  const ownedTemplateIds = useMemo(
    () => new Set(ownedAnimals.map(a => a.templateId)),
    [ownedAnimals]
  );

  const codexMap = new Map(codex.map(c => [c.templateId, c]));

  const entries = ANIMAL_TEMPLATES.map(template => {
    const entry = codexMap.get(template.id);
    const animalsOfTemplate = ownedAnimals.filter(a => a.templateId === template.id);
    const bestStar = animalsOfTemplate.reduce((max, a) => Math.max(max, a.starLevel), 0) as StarLevel;
    const bestBt = animalsOfTemplate.reduce((max, a) => Math.max(max, a.breakthroughTier), 0) as BreakthroughTier;
    const highestRank = entry?.isUnlocked
      ? [4, 3, 2, 1].find(r => isCodexRankUnlocked(r, bestStar, bestBt)) || 0
      : 0;

    return {
      template,
      bestStar,
      bestBt,
      highestRank,
      owned: animalsOfTemplate.length,
    };
  });

  const filtered = entries.filter(e => {
    if (filter === 'unlocked') return e.highestRank > 0;
    if (filter === 'locked') return e.highestRank === 0;
    return true;
  });

  const totalUnlocked = entries.filter(e => e.highestRank > 0).length;

  const bondEntries = useMemo(() => {
    return BOND_TEMPLATES.map(bond => {
      const level = calculateBondLevel(bond, ownedTemplateIds);
      const ownedInBond = bond.animalTemplateIds.filter(id => ownedTemplateIds.has(id));
      return { bond, level, ownedInBond };
    }).filter(e => bondCategory === 'all' || e.bond.category === bondCategory);
  }, [ownedTemplateIds, bondCategory]);

  const activeBonds = bondEntries.filter(e => e.level > 0);
  const totalBondBonuses = useMemo(() => {
    const total = { hp: 0, atk: 0, def: 0, spd: 0, crit: 0 };
    for (const { bond, level } of bondEntries) {
      if (level > 0) {
        const lc = bond.levels[level - 1];
        total.hp += lc.stats.hp || 0;
        total.atk += lc.stats.atk || 0;
        total.def += lc.stats.def || 0;
        total.spd += lc.stats.spd || 0;
        total.crit += lc.stats.crit || 0;
      }
    }
    return total;
  }, [bondEntries]);

  const handleClaim = (milestoneId: string) => {
    refreshBonds();
    refreshCodexMilestones();
    const success = claimMilestoneReward(milestoneId);
    if (success) {
      refreshCodexMilestones();
    }
  };

  const getMilestoneProgress = (milestone: typeof codexData.milestones[number]): number => {
    if (milestone.type === 'collection') return ownedTemplateIds.size;
    if (milestone.type === 'bond') return codexData.totalBondsActivated;
    if (milestone.id === 'milestone_rarity_4') return ownedAnimals.some(a => a.rarity >= 4) ? 1 : 0;
    if (milestone.id === 'milestone_rarity_5') return ownedAnimals.some(a => a.rarity >= 5) ? 1 : 0;
    return 0;
  };

  const tabs: { key: TabType; label: string; icon: typeof BookOpen }[] = [
    { key: 'codex', label: '图鉴', icon: BookOpen },
    { key: 'bonds', label: '羁绊', icon: Link2 },
    { key: 'milestones', label: '成就', icon: Trophy },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </NeonButton>
            <h1 className="text-2xl font-cyber font-bold text-cyber-pink">图鉴与羁绊</h1>
            <span className="text-sm text-gray-500 ml-auto">
              {totalUnlocked}/{entries.length} 已解锁
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            {tabs.map(t => (
              <NeonButton
                key={t.key}
                size="sm"
                variant={tab === t.key ? 'cyan' : 'ghost'}
                onClick={() => setTab(t.key)}
              >
                <t.icon className="w-4 h-4 mr-1" />
                {t.label}
              </NeonButton>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'codex' && (
          <>
            <div className="flex gap-2 mb-6">
              {(['all', 'unlocked', 'locked'] as const).map(f => (
                <NeonButton
                  key={f}
                  size="sm"
                  variant={filter === f ? 'cyan' : 'ghost'}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? '全部' : f === 'unlocked' ? '已解锁' : '未解锁'}
                </NeonButton>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Empty
                icon={BookOpen}
                title="暂无图鉴条目"
                description="通过升星与突破来解锁图鉴！"
                action={
                  <NeonButton onClick={() => navigate('/ascend')}>
                    前往升星
                  </NeonButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(({ template, bestStar, bestBt, highestRank, owned }) => {
                  const elementColor = ELEMENT_COLORS[template.element];
                  const starBonus = getStarBonus((bestStar || 1) as StarLevel);
                  const btBonus = getBreakthroughBonus((bestBt || 0) as BreakthroughTier);
                  const rarityColor = getRarityColor(template.rarity);
                  const rarityStars = template.rarity;

                  return (
                    <NeonCard
                      key={template.id}
                      variant={highestRank > 0 ? 'cyan' : 'default'}
                      className="relative overflow-hidden"
                    >
                      {highestRank > 0 && (
                        <div
                          className="absolute top-0 right-0 px-3 py-1 text-xs font-cyber font-bold rounded-bl-lg"
                          style={{
                            backgroundColor: `${elementColor}30`,
                            color: elementColor,
                            border: `1px solid ${elementColor}50`,
                          }}
                        >
                          {CODEX_RANK_NAMES[highestRank]}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{template.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-cyber font-bold text-white">{template.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `${elementColor}20`,
                                color: elementColor,
                              }}
                            >
                              {ELEMENT_EMOJIS[template.element]} {ELEMENT_NAMES[template.element]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {Array.from({ length: rarityStars }).map((_, i) => (
                              <Star key={i} className="w-3 h-3" style={{ color: rarityColor }} />
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mb-3">{template.description}</p>

                      {owned > 0 && (
                        <>
                          <div className="flex items-center gap-3 mb-2 text-xs">
                            <span className="text-cyber-yellow">⭐{STAR_LEVEL_NAMES[bestStar]}</span>
                            <span className="text-cyber-purple">🔮{BREAKTHROUGH_TIER_NAMES[bestBt]}</span>
                            <span className="text-gray-500">持有×{owned}</span>
                          </div>

                          {highestRank > 0 && (
                            <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-800">
                              <div className="text-xs text-gray-400 font-cyber font-bold mb-1">属性加成</div>
                              <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                                <span>HP ×{starBonus.hpMul} +{btBonus.hpFlat}</span>
                                <span>ATK ×{starBonus.atkMul} +{btBonus.atkFlat}</span>
                                <span>DEF ×{starBonus.defMul} +{btBonus.defFlat}</span>
                                <span>SPD +{starBonus.spdBonus} +{btBonus.spdFlat}</span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1 mt-3 pt-3 border-t border-gray-800">
                            <div className="text-xs text-gray-400 font-cyber font-bold mb-1">图鉴进度</div>
                            {([1, 2, 3, 4] as const).map(rank => {
                              const cond = CODEX_UNLOCK_CONDITIONS[rank];
                              const unlocked = isCodexRankUnlocked(rank, bestStar, bestBt);
                              return (
                                <div key={rank} className="flex items-center gap-2 text-xs">
                                  {unlocked ? (
                                    <Star className="w-3 h-3 text-cyber-yellow fill-cyber-yellow" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-gray-600" />
                                  )}
                                  <span className={unlocked ? 'text-cyber-yellow' : 'text-gray-600'}>
                                    {CODEX_RANK_NAMES[rank]}
                                  </span>
                                  {!unlocked && (
                                    <span className="text-gray-600 ml-auto">
                                      需⭐{cond.starLevel} 🔮{cond.breakthroughTier}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {owned === 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                          <Lock className="w-3 h-3" />
                          <span>尚未获得此动物</span>
                        </div>
                      )}
                    </NeonCard>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'bonds' && (
          <>
            <div className="flex gap-2 mb-4">
              {(['all', 'species', 'element', 'special'] as const).map(c => (
                <NeonButton
                  key={c}
                  size="sm"
                  variant={bondCategory === c ? 'cyan' : 'ghost'}
                  onClick={() => setBondCategory(c)}
                >
                  {c === 'all' ? '全部' : c === 'species' ? '种族羁绊' : c === 'element' ? '元素羁绊' : '特殊羁绊'}
                </NeonButton>
              ))}
            </div>

            {activeBonds.length > 0 && (
              <NeonCard variant="cyan" className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-5 h-5 text-cyber-cyan" />
                  <h3 className="font-cyber font-bold text-cyber-cyan">当前羁绊加成汇总</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30 ml-auto">
                    {activeBonds.length} 个激活
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { label: 'HP', value: totalBondBonuses.hp, color: '#ff4444' },
                    { label: 'ATK', value: totalBondBonuses.atk, color: '#ff8800' },
                    { label: 'DEF', value: totalBondBonuses.def, color: '#00ccff' },
                    { label: 'SPD', value: totalBondBonuses.spd, color: '#00ff66' },
                    { label: 'CRIT', value: totalBondBonuses.crit, color: '#ffdd00' },
                  ].map(stat => (
                    <div key={stat.label} className="p-2 rounded bg-cyber-dark/60 border border-gray-700/40">
                      <div className="text-gray-500 mb-0.5">{stat.label}</div>
                      <div className="font-cyber font-bold text-lg" style={{ color: stat.value > 0 ? stat.color : '#666' }}>
                        +{stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </NeonCard>
            )}

            <div className="space-y-3">
              {bondEntries.map(({ bond, level, ownedInBond }) => {
                const isExpanded = expandedBond === bond.id;
                const progress = bond.animalTemplateIds.length > 0
                  ? Math.round((ownedInBond.length / bond.animalTemplateIds.length) * 100)
                  : 0;

                return (
                  <NeonCard
                    key={bond.id}
                    variant={level > 0 ? 'cyan' : 'default'}
                    className="cursor-pointer"
                    onClick={() => setExpandedBond(isExpanded ? null : bond.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{bond.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-cyber font-bold" style={{ color: bond.color }}>
                            {bond.name}
                          </span>
                          {level > 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-cyber font-bold"
                              style={{
                                backgroundColor: `${bond.color}20`,
                                color: bond.color,
                                border: `1px solid ${bond.color}50`,
                              }}
                            >
                              Lv.{level}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                            {bond.category === 'species' ? '种族' : bond.category === 'element' ? '元素' : '特殊'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{bond.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: bond.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {ownedInBond.length}/{bond.animalTemplateIds.length}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-800 space-y-3" onClick={e => e.stopPropagation()}>
                        <div>
                          <div className="text-xs text-gray-400 font-cyber font-bold mb-2">所需动物</div>
                          <div className="flex flex-wrap gap-2">
                            {bond.animalTemplateIds.map(id => {
                              const tmpl = ANIMAL_TEMPLATES.find(t => t.id === id);
                              if (!tmpl) return null;
                              const isOwned = ownedTemplateIds.has(id);
                              return (
                                <div
                                  key={id}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border"
                                  style={{
                                    backgroundColor: isOwned ? `${ELEMENT_COLORS[tmpl.element]}10` : 'transparent',
                                    borderColor: isOwned ? `${ELEMENT_COLORS[tmpl.element]}40` : '#333',
                                    opacity: isOwned ? 1 : 0.4,
                                  }}
                                >
                                  <span>{tmpl.emoji}</span>
                                  <span style={{ color: isOwned ? ELEMENT_COLORS[tmpl.element] : '#666' }}>
                                    {tmpl.name}
                                  </span>
                                  {isOwned && <span className="text-cyber-green">✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-400 font-cyber font-bold mb-2">羁绊等级</div>
                          <div className="space-y-2">
                            {bond.levels.map((lv, i) => {
                              const isActive = level >= i + 1;
                              const currentCount = ownedInBond.length;
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 p-2 rounded border text-xs"
                                  style={{
                                    backgroundColor: isActive ? `${bond.color}08` : 'transparent',
                                    borderColor: isActive ? `${bond.color}40` : '#222',
                                  }}
                                >
                                  {isActive ? (
                                    <Star className="w-3 h-3 fill-current shrink-0" style={{ color: bond.color }} />
                                  ) : (
                                    <Lock className="w-3 h-3 text-gray-600 shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <div className={isActive ? '' : 'text-gray-600'}>
                                      Lv.{i + 1} — {lv.description}
                                    </div>
                                    {!isActive && (
                                      <div className="text-gray-600 mt-0.5">
                                        需收集 {lv.requiredCount} 种（当前 {currentCount}）
                                      </div>
                                    )}
                                  </div>
                                  {isActive && (
                                    <div className="flex gap-1 text-[10px]">
                                      {Object.entries(lv.stats).map(([stat, val]) => val ? (
                                        <span key={stat} className="px-1 py-0.5 rounded bg-cyber-dark/80" style={{ color: bond.color }}>
                                          {stat.toUpperCase()}+{val}
                                        </span>
                                      ) : null)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </NeonCard>
                );
              })}
            </div>
          </>
        )}

        {tab === 'milestones' && (
          <>
            <NeonCard variant="purple" className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-cyber-purple" />
                <h3 className="font-cyber font-bold text-cyber-purple">收集进度</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-2 rounded bg-cyber-dark/60 border border-gray-700/40">
                  <div className="text-gray-500 mb-0.5">动物种类</div>
                  <div className="font-cyber font-bold text-lg text-cyber-cyan">
                    {ownedTemplateIds.size}<span className="text-gray-600 text-sm">/{ANIMAL_TEMPLATES.length}</span>
                  </div>
                </div>
                <div className="p-2 rounded bg-cyber-dark/60 border border-gray-700/40">
                  <div className="text-gray-500 mb-0.5">激活羁绊</div>
                  <div className="font-cyber font-bold text-lg text-cyber-pink">
                    {codexData.totalBondsActivated}<span className="text-gray-600 text-sm">/{BOND_TEMPLATES.length}</span>
                  </div>
                </div>
                <div className="p-2 rounded bg-cyber-dark/60 border border-gray-700/40">
                  <div className="text-gray-500 mb-0.5">最高稀有度</div>
                  <div className="font-cyber font-bold text-lg" style={{ color: getRarityColor(Math.max(...ownedAnimals.map(a => a.rarity), 1) as any) }}>
                    {ownedAnimals.length > 0 ? '★'.repeat(Math.max(...ownedAnimals.map(a => a.rarity))) : '—'}
                  </div>
                </div>
              </div>
            </NeonCard>

            <div className="space-y-3">
              {codexData.milestones.map(milestone => {
                const progress = getMilestoneProgress(milestone);
                const progressPercent = Math.min(100, Math.round((progress / milestone.targetValue) * 100));
                const canClaim = progress >= milestone.targetValue && !milestone.isClaimed;

                return (
                  <NeonCard
                    key={milestone.id}
                    variant={milestone.isClaimed ? 'green' : canClaim ? 'yellow' : 'default'}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{milestone.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-cyber font-bold text-white">{milestone.name}</span>
                          {milestone.isClaimed && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-green/15 text-cyber-green border border-cyber-green/30">
                              已领取
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{milestone.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progressPercent}%`,
                                backgroundColor: milestone.isClaimed ? '#00ff88' : progressPercent >= 100 ? '#ffdd00' : '#00ffff',
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {Math.min(progress, milestone.targetValue)}/{milestone.targetValue}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-xs font-cyber font-bold" style={{ color: milestone.reward.type === 'coins' ? '#ffdd00' : '#00ccff' }}>
                          {milestone.reward.type === 'coins' ? '💰' : '💎'} {milestone.reward.amount}
                        </div>
                        {canClaim && (
                          <NeonButton
                            size="sm"
                            variant={milestone.reward.type === 'coins' ? 'yellow' : 'cyan'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(milestone.id);
                            }}
                          >
                            <Gift className="w-3 h-3 mr-1" />
                            领取
                          </NeonButton>
                        )}
                      </div>
                    </div>
                  </NeonCard>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
