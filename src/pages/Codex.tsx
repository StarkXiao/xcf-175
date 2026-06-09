import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, Lock, Star } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import type { StarLevel, BreakthroughTier } from '@/types';
import { ANIMAL_TEMPLATES } from '@/data/animals';
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

export default function Codex() {
  const navigate = useNavigate();
  const { codex, ownedAnimals } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

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

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </NeonButton>
            <h1 className="text-2xl font-cyber font-bold text-cyber-pink">图鉴</h1>
            <span className="text-sm text-gray-500 ml-auto">
              {totalUnlocked}/{entries.length} 已解锁
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
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
      </div>
    </div>
  );
}
