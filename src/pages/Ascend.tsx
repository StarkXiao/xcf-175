import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Star, Zap, BookOpen, Package, ChevronRight, Lock } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { STAR_LEVEL_NAMES, BREAKTHROUGH_TIER_NAMES, CODEX_RANK_NAMES } from '@/engine/constants';
import { getAnimalTemplate } from '@/data/animals';
import { getMaterialTemplate } from '@/data/materials';
import { getStarUpCost, getBreakthroughCost, getStarBonus, getBreakthroughBonus, isCodexRankUnlocked, CODEX_UNLOCK_CONDITIONS } from '@/data/ascendConfig';
import { calculateAnimalStats } from '@/engine/battleEngine';
import { getRarityColor, getRarityStars } from '@/utils/format';
import { ELEMENT_EMOJIS, ELEMENT_NAMES, ELEMENT_COLORS } from '@/engine/constants';
import { cn } from '@/lib/utils';
import type { Animal, StarLevel, BreakthroughTier } from '@/types';

export default function Ascend() {
  const navigate = useNavigate();
  const {
    ownedAnimals,
    ownedMaterials,
    codex,
    player,
    canStarUp,
    canBreakthrough,
    starUpAnimal,
    breakthroughAnimal,
    getAnimalById,
  } = useGameStore();

  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  const selectedAnimal = selectedAnimalId ? getAnimalById(selectedAnimalId) : null;

  const materialCountMap: Record<string, number> = {};
  ownedMaterials.forEach(m => {
    materialCountMap[m.templateId] = (materialCountMap[m.templateId] || 0) + 1;
  });

  const renderStarUpPanel = (animal: Animal) => {
    const template = getAnimalTemplate(animal.templateId);
    if (!template) return null;

    const cost = getStarUpCost(animal.starLevel);
    const currentBonus = getStarBonus(animal.starLevel);
    const nextStarLevel = Math.min(animal.starLevel + 1, 6) as StarLevel;
    const nextBonus = getStarBonus(nextStarLevel);
    const canDo = canStarUp(animal.id);
    const isMax = animal.starLevel >= 6;

    return (
      <NeonCard variant="yellow" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-cyber-yellow" />
          <h2 className="font-cyber font-bold text-lg text-cyber-yellow">升星</h2>
          <span className="text-sm text-gray-400 ml-2">
            当前: {STAR_LEVEL_NAMES[animal.starLevel]} → {STAR_LEVEL_NAMES[nextStarLevel]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg border border-gray-700 bg-cyber-darker">
            <div className="text-xs text-gray-400 mb-2">当前星级属性</div>
            <div className="text-sm space-y-1">
              <div>HP ×{currentBonus.hpMul.toFixed(2)}</div>
              <div>ATK ×{currentBonus.atkMul.toFixed(2)}</div>
              <div>DEF ×{currentBonus.defMul.toFixed(2)}</div>
              <div>SPD +{currentBonus.spdBonus}</div>
              <div>技能槽 {currentBonus.skillSlots}</div>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-cyber-yellow/30 bg-cyber-yellow/5">
            <div className="text-xs text-cyber-yellow mb-2">升星后属性</div>
            <div className="text-sm space-y-1">
              <div>HP ×{nextBonus.hpMul.toFixed(2)}</div>
              <div>ATK ×{nextBonus.atkMul.toFixed(2)}</div>
              <div>DEF ×{nextBonus.defMul.toFixed(2)}</div>
              <div>SPD +{nextBonus.spdBonus}</div>
              <div>技能槽 {nextBonus.skillSlots}</div>
            </div>
          </div>
        </div>

        {!isMax && cost && (
          <div className="mb-4">
            <h3 className="text-xs text-gray-400 font-cyber mb-2">消耗材料</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                <span className="text-sm text-gray-300">💰 金币</span>
                <span className={cn('font-cyber text-sm', player.coins >= cost.coins ? 'text-cyber-yellow' : 'text-cyber-red')}>
                  {cost.coins} (拥有: {player.coins})
                </span>
              </div>
              {cost.materials.map(mat => {
                const matTemplate = getMaterialTemplate(mat.templateId);
                const owned = materialCountMap[mat.templateId] || 0;
                const enough = owned >= mat.count;
                return (
                  <div key={mat.templateId} className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                    <span className="text-sm text-gray-300">
                      {matTemplate?.emoji || '📦'} {matTemplate?.name || mat.templateId}
                    </span>
                    <span className={cn('font-cyber text-sm', enough ? 'text-cyber-green' : 'text-cyber-red')}>
                      {mat.count} (拥有: {owned})
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                <span className="text-sm text-gray-300">📊 等级要求</span>
                <span className={cn('font-cyber text-sm', animal.level >= cost.requiredLevel ? 'text-cyber-green' : 'text-cyber-red')}>
                  Lv.{cost.requiredLevel} (当前: Lv.{animal.level})
                </span>
              </div>
            </div>
          </div>
        )}

        {isMax ? (
          <div className="text-center text-cyber-yellow font-cyber py-2">已达到最高星级</div>
        ) : (
          <NeonButton
            variant="yellow"
            className="w-full"
            disabled={!canDo}
            onClick={() => {
              starUpAnimal(animal.id);
            }}
          >
            <Star className="w-4 h-4 mr-2" />
            升星至{STAR_LEVEL_NAMES[nextStarLevel]}
          </NeonButton>
        )}
      </NeonCard>
    );
  };

  const renderBreakthroughPanel = (animal: Animal) => {
    const template = getAnimalTemplate(animal.templateId);
    if (!template) return null;

    const cost = getBreakthroughCost(animal.breakthroughTier, template.element);
    const currentBonus = getBreakthroughBonus(animal.breakthroughTier);
    const nextTier = Math.min(animal.breakthroughTier + 1, 4) as BreakthroughTier;
    const nextBonus = getBreakthroughBonus(nextTier);
    const canDo = canBreakthrough(animal.id);
    const isMax = animal.breakthroughTier >= 4;

    return (
      <NeonCard variant="purple" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-cyber-purple" />
          <h2 className="font-cyber font-bold text-lg text-cyber-purple">突破</h2>
          <span className="text-sm text-gray-400 ml-2">
            当前: {BREAKTHROUGH_TIER_NAMES[animal.breakthroughTier]} → {BREAKTHROUGH_TIER_NAMES[nextTier]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg border border-gray-700 bg-cyber-darker">
            <div className="text-xs text-gray-400 mb-2">当前突破加成</div>
            <div className="text-sm space-y-1">
              <div>HP +{currentBonus.hpFlat}</div>
              <div>ATK +{currentBonus.atkFlat}</div>
              <div>DEF +{currentBonus.defFlat}</div>
              <div>SPD +{currentBonus.spdFlat}</div>
              <div>技能等级上限 Lv.{currentBonus.skillLevelCap}</div>
            </div>
          </div>
          <div className="p-3 rounded-lg border border-cyber-purple/30 bg-cyber-purple/5">
            <div className="text-xs text-cyber-purple mb-2">突破后加成</div>
            <div className="text-sm space-y-1">
              <div>HP +{nextBonus.hpFlat}</div>
              <div>ATK +{nextBonus.atkFlat}</div>
              <div>DEF +{nextBonus.defFlat}</div>
              <div>SPD +{nextBonus.spdFlat}</div>
              <div>技能等级上限 Lv.{nextBonus.skillLevelCap}</div>
            </div>
          </div>
        </div>

        {!isMax && cost && (
          <div className="mb-4">
            <h3 className="text-xs text-gray-400 font-cyber mb-2">消耗材料</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                <span className="text-sm text-gray-300">💰 金币</span>
                <span className={cn('font-cyber text-sm', player.coins >= cost.coins ? 'text-cyber-yellow' : 'text-cyber-red')}>
                  {cost.coins} (拥有: {player.coins})
                </span>
              </div>
              {cost.materials.map(mat => {
                const matTemplate = getMaterialTemplate(mat.templateId);
                const owned = materialCountMap[mat.templateId] || 0;
                const enough = owned >= mat.count;
                return (
                  <div key={mat.templateId} className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                    <span className="text-sm text-gray-300">
                      {matTemplate?.emoji || '📦'} {matTemplate?.name || mat.templateId}
                    </span>
                    <span className={cn('font-cyber text-sm', enough ? 'text-cyber-green' : 'text-cyber-red')}>
                      {mat.count} (拥有: {owned})
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                <span className="text-sm text-gray-300">📊 等级要求</span>
                <span className={cn('font-cyber text-sm', animal.level >= cost.requiredLevel ? 'text-cyber-green' : 'text-cyber-red')}>
                  Lv.{cost.requiredLevel} (当前: Lv.{animal.level})
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded border border-gray-700 bg-cyber-darker">
                <span className="text-sm text-gray-300">⭐ 星级要求</span>
                <span className={cn('font-cyber text-sm', animal.starLevel >= cost.requiredStarLevel ? 'text-cyber-green' : 'text-cyber-red')}>
                  {STAR_LEVEL_NAMES[cost.requiredStarLevel]} (当前: {STAR_LEVEL_NAMES[animal.starLevel]})
                </span>
              </div>
            </div>
          </div>
        )}

        {isMax ? (
          <div className="text-center text-cyber-purple font-cyber py-2">已达到最高突破阶</div>
        ) : (
          <NeonButton
            variant="purple"
            className="w-full"
            disabled={!canDo}
            onClick={() => {
              breakthroughAnimal(animal.id);
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            突破至{BREAKTHROUGH_TIER_NAMES[nextTier]}
          </NeonButton>
        )}
      </NeonCard>
    );
  };

  const renderCodexPanel = (animal: Animal) => {
    const entry = codex.find(c => c.templateId === animal.templateId);

    return (
      <NeonCard variant="cyan" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-cyber-cyan" />
          <h2 className="font-cyber font-bold text-lg text-cyber-cyan">图鉴进度</h2>
        </div>

        <div className="space-y-3">
          {([1, 2, 3, 4] as const).map(rank => {
            const condition = CODEX_UNLOCK_CONDITIONS[rank];
            const unlocked = isCodexRankUnlocked(rank, animal.starLevel, animal.breakthroughTier);
            return (
              <div
                key={rank}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  unlocked ? 'border-cyber-cyan/30 bg-cyber-cyan/5' : 'border-gray-700 bg-cyber-darker'
                )}
              >
                <div className="flex items-center gap-2">
                  {unlocked ? (
                    <span className="text-cyber-cyan">{CODEX_RANK_NAMES[rank]}</span>
                  ) : (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={cn('font-cyber text-sm', unlocked ? 'text-white' : 'text-gray-500')}>
                    {CODEX_RANK_NAMES[rank]}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  需要: ⭐{STAR_LEVEL_NAMES[condition.starLevel]} + 🔮{BREAKTHROUGH_TIER_NAMES[condition.breakthroughTier]}
                </div>
              </div>
            );
          })}
        </div>

        {entry && (
          <div className="mt-4 p-3 rounded-lg border border-gray-700 bg-cyber-darker text-xs text-gray-400">
            <div>历史最高星级: {STAR_LEVEL_NAMES[entry.highestStarLevel]}</div>
            <div>历史最高突破: {BREAKTHROUGH_TIER_NAMES[entry.highestBreakthroughTier]}</div>
          </div>
        )}
      </NeonCard>
    );
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="sticky top-0 bg-cyber-darker/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <NeonButton size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </NeonButton>
            <h1 className="text-2xl font-cyber font-bold text-cyber-yellow">升星与突破</h1>
            <span className="text-sm text-gray-400 ml-auto">
              💰 {player.coins}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300">选择动物</h2>
            {ownedAnimals.length === 0 ? (
              <Empty
                title="还没有动物"
                description="去商店抽取你的第一只战斗动物吧！"
                action={
                  <NeonButton onClick={() => navigate('/shop')}>
                    前往商店
                  </NeonButton>
                }
              />
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {ownedAnimals.map(animal => {
                  const template = getAnimalTemplate(animal.templateId);
                  const isSelected = selectedAnimalId === animal.id;
                  return (
                    <div
                      key={animal.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        isSelected
                          ? 'border-cyber-yellow/50 bg-cyber-yellow/10'
                          : 'border-gray-700 bg-cyber-darker hover:border-gray-500'
                      )}
                      onClick={() => setSelectedAnimalId(animal.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                          style={{
                            border: `2px solid ${getRarityColor(animal.rarity)}`,
                            boxShadow: `0 0 8px ${getRarityColor(animal.rarity)}40`,
                          }}
                        >
                          {template?.emoji || '❓'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-cyber font-bold text-sm truncate" style={{ color: getRarityColor(animal.rarity) }}>
                              {animal.name}
                            </span>
                            <span className="text-xs text-gray-500">Lv.{animal.level}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-cyber-yellow">⭐{animal.starLevel}</span>
                            <span className="text-xs text-cyber-purple">🔮{animal.breakthroughTier}</span>
                            {template && (
                              <span className="text-xs" style={{ color: ELEMENT_COLORS[template.element] }}>
                                {ELEMENT_EMOJIS[template.element]} {ELEMENT_NAMES[template.element]}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={cn('w-4 h-4', isSelected ? 'text-cyber-yellow' : 'text-gray-600')} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {ownedMaterials.length > 0 && (
              <div className="mt-6">
                <h3 className="font-cyber font-bold text-sm text-gray-400 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  材料仓库
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {(() => {
                    const grouped: Record<string, { template: typeof ownedMaterials[0]; count: number }> = {};
                    ownedMaterials.forEach(m => {
                      if (!grouped[m.templateId]) {
                        grouped[m.templateId] = { template: m, count: 1 };
                      } else {
                        grouped[m.templateId].count++;
                      }
                    });
                    return Object.entries(grouped).map(([templateId, { template, count }]) => (
                      <div
                        key={templateId}
                        className="flex flex-col items-center p-2 rounded-lg border border-gray-700 bg-cyber-darker"
                      >
                        <span className="text-xl">{template.emoji}</span>
                        <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">{template.name}</span>
                        <span className="text-xs font-cyber text-cyber-cyan">×{count}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedAnimal ? (
              <div className="space-y-6">
                <NeonCard className="p-5">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const template = getAnimalTemplate(selectedAnimal.templateId);
                      const stats = calculateAnimalStats(selectedAnimal);
                      return (
                        <>
                          <div
                            className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl flex-shrink-0"
                            style={{
                              border: `3px solid ${getRarityColor(selectedAnimal.rarity)}`,
                              boxShadow: `0 0 20px ${getRarityColor(selectedAnimal.rarity)}40`,
                            }}
                          >
                            {template?.emoji || '❓'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h2 className="font-cyber font-bold text-xl" style={{ color: getRarityColor(selectedAnimal.rarity) }}>
                                {selectedAnimal.name}
                              </h2>
                              <span className="text-sm px-2 py-0.5 bg-gray-800 rounded text-gray-300 font-cyber">
                                Lv.{selectedAnimal.level}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm" style={{ color: getRarityColor(selectedAnimal.rarity) }}>
                                {getRarityStars(selectedAnimal.rarity)}
                              </span>
                              <span className="text-sm px-2 py-0.5 rounded border border-cyber-yellow/30 bg-cyber-yellow/10 text-cyber-yellow font-cyber">
                                ⭐ {STAR_LEVEL_NAMES[selectedAnimal.starLevel]}
                              </span>
                              <span className="text-sm px-2 py-0.5 rounded border border-cyber-purple/30 bg-cyber-purple/10 text-cyber-purple font-cyber">
                                🔮 {BREAKTHROUGH_TIER_NAMES[selectedAnimal.breakthroughTier]}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-sm">
                              <div><span className="text-gray-400">❤️</span> <span className="text-cyber-green font-cyber">{stats.hp}</span></div>
                              <div><span className="text-gray-400">⚔️</span> <span className="text-cyber-red font-cyber">{stats.atk}</span></div>
                              <div><span className="text-gray-400">🛡️</span> <span className="text-cyber-cyan font-cyber">{stats.def}</span></div>
                              <div><span className="text-gray-400">⚡</span> <span className="text-cyber-yellow font-cyber">{stats.spd}</span></div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </NeonCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderStarUpPanel(selectedAnimal)}
                  {renderBreakthroughPanel(selectedAnimal)}
                </div>

                {renderCodexPanel(selectedAnimal)}
              </div>
            ) : (
              <Empty
                title="请选择一只动物"
                description="从左侧列表中选择一只动物进行升星或突破操作"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
