import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  FlaskConical,
  Wrench,
  Sparkles,
  Package,
  Clock,
  Check,
  X,
  ChevronRight,
  Star,
  Zap,
  Target,
  Shield,
  Heart,
  Sword,
  Cpu,
  ScrollText,
  Trash2,
} from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import {
  PART_SYNTHESIS_RECIPES,
  SKILL_MODIFICATION_RECIPES,
  PROBABILITY_EXPERIMENTS,
  getLabMaterialTemplate,
} from '@/data/lab';
import { getPartTemplate, QUALITY_NAMES, QUALITY_COLORS } from '@/data/parts';
import { getSkillTemplate } from '@/data/skills';
import { getMaterialTemplate } from '@/data/materials';
import { getRarityColor, getRarityStars, formatNumber } from '@/utils/format';
import { ELEMENT_EMOJIS, ELEMENT_NAMES, ELEMENT_COLORS } from '@/engine/constants';
import { cn } from '@/lib/utils';
import type {
  PartSynthesisRecipe,
  SkillModificationRecipe,
  ProbabilityExperiment,
  Rarity,
} from '@/types';

type LabTab = 'synthesis' | 'modification' | 'experiment' | 'materials' | 'logs';

export default function Lab() {
  const navigate = useNavigate();
  const {
    player,
    ownedParts,
    ownedSkills,
    ownedMaterials,
    labData,
    synthesizePart,
    canSynthesize,
    modifySkill,
    canModifySkill,
    runExperiment,
    canRunExperiment,
    clearLabLogs,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<LabTab>('synthesis');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<{
    type: 'synthesis' | 'modification' | 'experiment';
    success: boolean;
    rewards?: { type: string; name: string; emoji: string; rarity?: Rarity; amount?: number }[];
    message: string;
  } | null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity | 0>(0);

  const materialCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    ownedMaterials.forEach(m => {
      map[m.templateId] = (map[m.templateId] || 0) + 1;
    });
    return map;
  }, [ownedMaterials]);

  const handleSynthesize = (recipeId: string) => {
    const result = synthesizePart(recipeId);
    const recipe = PART_SYNTHESIS_RECIPES.find(r => r.id === recipeId);
    const template = recipe ? getPartTemplate(recipe.targetPartTemplateId) : null;

    setShowResult({
      type: 'synthesis',
      success: result.success,
      message: result.success
        ? `成功合成 ${template?.name || '部件'}！`
        : `合成失败，返还了部分材料`,
      rewards: result.success && template
        ? [{ type: 'part', name: template.name, emoji: template.emoji, rarity: recipe?.targetRarity }]
        : undefined,
    });
  };

  const handleModify = (recipeId: string, skillId: string) => {
    const result = modifySkill(recipeId, skillId);
    const skill = ownedSkills.find(s => s.id === skillId);

    setShowResult({
      type: 'modification',
      success: result.success,
      message: result.success
        ? `成功改造 ${skill?.name || '技能'}！`
        : `改造失败，材料已消耗`,
      rewards: result.success && skill
        ? [{ type: 'skill', name: skill.name, emoji: skill.emoji, rarity: skill.rarity }]
        : undefined,
    });
  };

  const handleExperiment = (experimentId: string) => {
    const result = runExperiment(experimentId);
    const experiment = PROBABILITY_EXPERIMENTS.find(e => e.id === experimentId);

    setShowResult({
      type: 'experiment',
      success: true,
      message: `${experiment?.name || '试验'}完成！`,
      rewards: result.rewards.map(r => ({
        type: r.type,
        name: r.name,
        emoji: r.emoji,
        rarity: r.rarity,
        amount: r.amount,
      })),
    });
  };

  const tabs: { id: LabTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'synthesis', label: '部件合成', icon: Wrench, color: 'cyan' },
    { id: 'modification', label: '技能改造', icon: Zap, color: 'purple' },
    { id: 'experiment', label: '概率试验', icon: FlaskConical, color: 'pink' },
    { id: 'materials', label: '材料仓库', icon: Package, color: 'yellow' },
    { id: 'logs', label: '研发日志', icon: ScrollText, color: 'green' },
  ];

  const renderSynthesisTab = () => {
    const filteredRecipes = filterRarity === 0
      ? PART_SYNTHESIS_RECIPES
      : PART_SYNTHESIS_RECIPES.filter(r => r.targetRarity === filterRarity);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="font-cyber font-bold text-xl text-cyber-cyan flex items-center gap-2">
            <Wrench className="w-6 h-6" />
            部件合成
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">筛选:</span>
            <div className="flex gap-1">
              <button
                className={cn(
                  'px-3 py-1 text-xs rounded transition-colors',
                  filterRarity === 0
                    ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
                )}
                onClick={() => setFilterRarity(0)}
              >
                全部
              </button>
              {[2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  className={cn(
                    'px-3 py-1 text-xs rounded transition-colors',
                    filterRarity === r
                      ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
                  )}
                  onClick={() => setFilterRarity(r as Rarity)}
                >
                  {getRarityStars(r as Rarity)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map(recipe => {
            const template = getPartTemplate(recipe.targetPartTemplateId);
            const canDo = canSynthesize(recipe.id);
            const isSelected = selectedRecipeId === recipe.id;

            return (
              <NeonCard
                key={recipe.id}
                variant={isSelected ? 'cyan' : 'default'}
                className={cn(
                  'cursor-pointer transition-all',
                  canDo ? 'hover:border-cyber-cyan/50' : 'opacity-70'
                )}
                onClick={() => setSelectedRecipeId(isSelected ? null : recipe.id)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                    style={{
                      border: `2px solid ${getRarityColor(recipe.targetRarity)}`,
                      boxShadow: `0 0 12px ${getRarityColor(recipe.targetRarity)}40`,
                      backgroundColor: `${getRarityColor(recipe.targetRarity)}10`,
                    }}
                  >
                    {template?.emoji || '❓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-cyber font-bold truncate"
                        style={{ color: getRarityColor(recipe.targetRarity) }}
                      >
                        {template?.name || recipe.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {recipe.description}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-cyber-yellow">💰 {recipe.coinCost}</span>
                      <span className={cn(
                        'font-bold',
                        recipe.successRate >= 60 ? 'text-cyber-green' :
                        recipe.successRate >= 30 ? 'text-cyber-yellow' : 'text-cyber-red'
                      )}>
                        成功率 {recipe.successRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-2 font-cyber">所需材料</div>
                    <div className="space-y-2 mb-4">
                      {recipe.materials.map(mat => {
                        const matTemplate = getLabMaterialTemplate(mat.templateId) || getMaterialTemplate(mat.templateId);
                        const owned = materialCountMap[mat.templateId] || 0;
                        const enough = owned >= mat.count;

                        return (
                          <div
                            key={mat.templateId}
                            className="flex items-center justify-between p-2 rounded bg-cyber-darker border border-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{matTemplate?.emoji || '📦'}</span>
                              <span className="text-sm text-gray-300">
                                {matTemplate?.name || mat.templateId}
                              </span>
                            </div>
                            <span className={cn(
                              'font-cyber text-sm',
                              enough ? 'text-cyber-green' : 'text-cyber-red'
                            )}>
                              {owned}/{mat.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <NeonButton
                      variant="cyan"
                      size="sm"
                      fullWidth
                      disabled={!canDo}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSynthesize(recipe.id);
                      }}
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      开始合成
                    </NeonButton>
                  </div>
                )}
              </NeonCard>
            );
          })}
        </div>
      </div>
    );
  };

  const renderModificationTab = () => {
    const availableSkills = ownedSkills;

    return (
      <div className="space-y-6">
        <h2 className="font-cyber font-bold text-xl text-cyber-purple flex items-center gap-2">
          <Zap className="w-6 h-6" />
          技能改造
        </h2>

        {availableSkills.length === 0 ? (
          <Empty
            title="没有可改造的技能"
            description="去商店抽取技能后再来改造吧！"
            action={
              <NeonButton onClick={() => navigate('/shop')}>
                前往商店
              </NeonButton>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <h3 className="font-cyber font-bold text-sm text-gray-400 mb-3">选择技能</h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {availableSkills.map(skill => {
                  const isSelected = selectedSkillId === skill.id;
                  const recipes = SKILL_MODIFICATION_RECIPES.filter(
                    r => r.targetSkillTemplateId === skill.templateId
                  );

                  return (
                    <div
                      key={skill.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        isSelected
                          ? 'border-cyber-purple/50 bg-cyber-purple/10'
                          : 'border-gray-700 bg-cyber-darker hover:border-gray-500'
                      )}
                      onClick={() => setSelectedSkillId(isSelected ? null : skill.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                          style={{
                            border: `2px solid ${getRarityColor(skill.rarity)}`,
                            boxShadow: `0 0 8px ${getRarityColor(skill.rarity)}40`,
                          }}
                        >
                          {skill.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-cyber font-bold text-sm truncate"
                            style={{ color: getRarityColor(skill.rarity) }}
                          >
                            {skill.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            伤害: {skill.damage} | CD: {skill.cooldown}
                          </div>
                        </div>
                        <ChevronRight className={cn(
                          'w-4 h-4 flex-shrink-0',
                          isSelected ? 'text-cyber-purple' : 'text-gray-600'
                        )} />
                      </div>
                      {recipes.length > 0 && (
                        <div className="mt-2 text-[10px] text-cyber-purple">
                          {recipes.length} 个改造方案
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selectedSkillId ? (
                <div className="space-y-4">
                  {(() => {
                    const skill = ownedSkills.find(s => s.id === selectedSkillId);
                    if (!skill) return null;
                    const recipes = SKILL_MODIFICATION_RECIPES.filter(
                      r => r.targetSkillTemplateId === skill.templateId
                    );

                    if (recipes.length === 0) {
                      return (
                        <Empty
                          title="暂无改造方案"
                          description="该技能暂时没有可用的改造方案"
                        />
                      );
                    }

                    return recipes.map(recipe => {
                      const canDo = canModifySkill(recipe.id, skill.id);

                      return (
                        <NeonCard key={recipe.id} variant="purple" className="p-5">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <h4 className="font-cyber font-bold text-cyber-purple mb-1">
                                {recipe.name}
                              </h4>
                              <p className="text-xs text-gray-400">{recipe.description}</p>
                            </div>
                            <span className={cn(
                              'text-xs font-bold px-2 py-1 rounded',
                              recipe.successRate >= 60 ? 'bg-cyber-green/20 text-cyber-green' :
                              recipe.successRate >= 30 ? 'bg-cyber-yellow/20 text-cyber-yellow' :
                              'bg-cyber-red/20 text-cyber-red'
                            )}>
                              {recipe.successRate}% 成功率
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {recipe.effects.damageBonus && (
                              <div className="p-2 rounded bg-cyber-darker border border-gray-700">
                                <div className="text-xs text-gray-500">伤害提升</div>
                                <div className="text-sm font-cyber text-cyber-red">
                                  +{recipe.effects.damageBonus}%
                                </div>
                              </div>
                            )}
                            {recipe.effects.cooldownReduction && (
                              <div className="p-2 rounded bg-cyber-darker border border-gray-700">
                                <div className="text-xs text-gray-500">冷却减少</div>
                                <div className="text-sm font-cyber text-cyber-cyan">
                                  -{recipe.effects.cooldownReduction} 回合
                                </div>
                              </div>
                            )}
                            {recipe.effects.statusEffectChanceBonus && (
                              <div className="p-2 rounded bg-cyber-darker border border-gray-700">
                                <div className="text-xs text-gray-500">状态概率</div>
                                <div className="text-sm font-cyber text-cyber-purple">
                                  +{recipe.effects.statusEffectChanceBonus}%
                                </div>
                              </div>
                            )}
                            {recipe.effects.addStatusEffect && (
                              <div className="p-2 rounded bg-cyber-darker border border-gray-700">
                                <div className="text-xs text-gray-500">附加状态</div>
                                <div className="text-sm font-cyber text-cyber-yellow">
                                  {recipe.effects.addStatusEffect.type}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-400 mb-2 font-cyber">所需材料</div>
                          <div className="space-y-2 mb-4">
                            {recipe.materials.map(mat => {
                              const matTemplate = getLabMaterialTemplate(mat.templateId) || getMaterialTemplate(mat.templateId);
                              const owned = materialCountMap[mat.templateId] || 0;
                              const enough = owned >= mat.count;

                              return (
                                <div
                                  key={mat.templateId}
                                  className="flex items-center justify-between p-2 rounded bg-cyber-darker border border-gray-700"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{matTemplate?.emoji || '📦'}</span>
                                    <span className="text-sm text-gray-300">
                                      {matTemplate?.name || mat.templateId}
                                    </span>
                                  </div>
                                  <span className={cn(
                                    'font-cyber text-sm',
                                    enough ? 'text-cyber-green' : 'text-cyber-red'
                                  )}>
                                    {owned}/{mat.count}
                                  </span>
                                </div>
                              );
                            })}
                            <div className="flex items-center justify-between p-2 rounded bg-cyber-darker border border-gray-700">
                              <span className="text-sm text-gray-300">💰 金币</span>
                              <span className={cn(
                                'font-cyber text-sm',
                                player.coins >= recipe.coinCost ? 'text-cyber-green' : 'text-cyber-red'
                              )}>
                                {recipe.coinCost}
                              </span>
                            </div>
                          </div>

                          <NeonButton
                            variant="purple"
                            size="sm"
                            fullWidth
                            disabled={!canDo}
                            onClick={() => handleModify(recipe.id, skill.id)}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            开始改造
                          </NeonButton>
                        </NeonCard>
                      );
                    });
                  })()}
                </div>
              ) : (
                <Empty
                  title="请选择一个技能"
                  description="从左侧选择要改造的技能"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExperimentTab = () => {
    return (
      <div className="space-y-6">
        <h2 className="font-cyber font-bold text-xl text-cyber-pink flex items-center gap-2">
          <FlaskConical className="w-6 h-6" />
          概率试验
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROBABILITY_EXPERIMENTS.map(exp => {
            const canDo = canRunExperiment(exp.id);

            return (
              <NeonCard key={exp.id} variant="pink" className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.2))',
                      border: '2px solid rgba(236,72,153,0.5)',
                      boxShadow: '0 0 20px rgba(236,72,153,0.3)',
                    }}
                  >
                    {exp.emoji}
                  </div>
                  <div>
                    <h3 className="font-cyber font-bold text-cyber-pink">{exp.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{exp.description}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-2 font-cyber">可能获得</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {exp.rewards.slice(0, 4).map((reward, i) => {
                    let name: string = reward.type;
                    let emoji = '📦';

                    if (reward.type === 'coins') {
                      emoji = '💰';
                      name = '金币';
                    } else if (reward.type === 'gems') {
                      emoji = '💎';
                      name = '宝石';
                    } else if (reward.templateId) {
                      const mat = getLabMaterialTemplate(reward.templateId) || getMaterialTemplate(reward.templateId);
                      emoji = mat?.emoji || '📦';
                      name = mat?.name || reward.templateId;
                    } else if (reward.rarity) {
                      name = `${getRarityStars(reward.rarity)} ${reward.type === 'part' ? '部件' : '技能'}`;
                    }

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-cyber-darker border border-gray-700"
                      >
                        <span className="text-sm">{emoji}</span>
                        <span className="text-[10px] text-gray-400">{name}</span>
                      </div>
                    );
                  })}
                  {exp.rewards.length > 4 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-cyber-darker border border-gray-700">
                      <span className="text-[10px] text-gray-500">+{exp.rewards.length - 4}种</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 mb-2 font-cyber">消耗</div>
                <div className="space-y-2 mb-4">
                  {exp.materials.map(mat => {
                    const matTemplate = getLabMaterialTemplate(mat.templateId) || getMaterialTemplate(mat.templateId);
                    const owned = materialCountMap[mat.templateId] || 0;
                    const enough = owned >= mat.count;

                    return (
                      <div
                        key={mat.templateId}
                        className="flex items-center justify-between p-2 rounded bg-cyber-darker border border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{matTemplate?.emoji || '📦'}</span>
                          <span className="text-sm text-gray-300">
                            {matTemplate?.name || mat.templateId}
                          </span>
                        </div>
                        <span className={cn(
                          'font-cyber text-sm',
                          enough ? 'text-cyber-green' : 'text-cyber-red'
                        )}>
                          {owned}/{mat.count}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between p-2 rounded bg-cyber-darker border border-gray-700">
                    <span className="text-sm text-gray-300">💰 金币</span>
                    <span className={cn(
                      'font-cyber text-sm',
                      player.coins >= exp.coinCost ? 'text-cyber-green' : 'text-cyber-red'
                    )}>
                      {exp.coinCost}
                    </span>
                  </div>
                </div>

                {exp.guaranteedRarity && (
                  <div className="mb-4 p-2 rounded bg-cyber-yellow/10 border border-cyber-yellow/30">
                    <div className="text-xs text-cyber-yellow font-cyber flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      保底: {getRarityStars(exp.guaranteedRarity)} 以上
                    </div>
                  </div>
                )}

                <NeonButton
                  variant="pink"
                  size="sm"
                  fullWidth
                  disabled={!canDo}
                  onClick={() => handleExperiment(exp.id)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始试验
                </NeonButton>
              </NeonCard>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMaterialsTab = () => {
    const groupedMaterials = useMemo(() => {
      const groups: Record<string, { template: any; count: number }> = {};
      ownedMaterials.forEach(m => {
        if (!groups[m.templateId]) {
          groups[m.templateId] = { template: m, count: 0 };
        }
        groups[m.templateId].count++;
      });
      return groups;
    }, [ownedMaterials]);

    const materialEntries = Object.entries(groupedMaterials);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-cyber font-bold text-xl text-cyber-yellow flex items-center gap-2">
            <Package className="w-6 h-6" />
            材料仓库
            <span className="text-sm text-gray-500 font-normal">
              ({materialEntries.length} 种)
            </span>
          </h2>
          <div className="text-sm text-gray-400">
            总数量: {ownedMaterials.length}
          </div>
        </div>

        {materialEntries.length === 0 ? (
          <Empty
            title="材料仓库为空"
            description="通过战斗、试验或合成来获取材料吧！"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {materialEntries.map(([templateId, { template, count }]) => {
              const isLabMat = getLabMaterialTemplate(templateId);
              const typeLabel = isLabMat ? '实验室' : '突破';

              return (
                <NeonCard key={templateId} className="p-4 text-center">
                  <div
                    className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-3xl mb-2"
                    style={{
                      border: `2px solid ${getRarityColor(template.rarity)}`,
                      boxShadow: `0 0 10px ${getRarityColor(template.rarity)}30`,
                      backgroundColor: `${getRarityColor(template.rarity)}10`,
                    }}
                  >
                    {template.emoji}
                  </div>
                  <div
                    className="font-cyber font-bold text-xs truncate mb-1"
                    style={{ color: getRarityColor(template.rarity) }}
                  >
                    {template.name}
                  </div>
                  <div className="text-[10px] text-gray-500 mb-2">{typeLabel}</div>
                  <div className="text-lg font-cyber text-cyber-yellow">×{count}</div>
                </NeonCard>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderLogsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-cyber font-bold text-xl text-cyber-green flex items-center gap-2">
            <ScrollText className="w-6 h-6" />
            研发日志
          </h2>
          {labData.recentLogs.length > 0 && (
            <NeonButton
              size="sm"
              variant="ghost"
              onClick={clearLabLogs}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清空日志
            </NeonButton>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <NeonCard className="p-4 text-center">
            <div className="text-3xl font-cyber text-cyber-cyan mb-1">
              {labData.synthesisCount}
            </div>
            <div className="text-xs text-gray-400">合成次数</div>
          </NeonCard>
          <NeonCard className="p-4 text-center">
            <div className="text-3xl font-cyber text-cyber-purple mb-1">
              {labData.modificationCount}
            </div>
            <div className="text-xs text-gray-400">改造次数</div>
          </NeonCard>
          <NeonCard className="p-4 text-center">
            <div className="text-3xl font-cyber text-cyber-pink mb-1">
              {labData.experimentCount}
            </div>
            <div className="text-xs text-gray-400">试验次数</div>
          </NeonCard>
          <NeonCard className="p-4 text-center">
            <div className="text-3xl font-cyber text-cyber-green mb-1">
              {labData.successCount}
            </div>
            <div className="text-xs text-gray-400">成功次数</div>
          </NeonCard>
          <NeonCard className="p-4 text-center">
            <div className="text-3xl font-cyber text-cyber-red mb-1">
              {labData.failureCount}
            </div>
            <div className="text-xs text-gray-400">失败次数</div>
          </NeonCard>
        </div>

        {labData.recentLogs.length === 0 ? (
          <Empty
            title="暂无研发记录"
            description="开始你的第一次研发吧！"
          />
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {labData.recentLogs.map(log => {
              const typeColors = {
                synthesis: 'cyan',
                modification: 'purple',
                experiment: 'pink',
              };
              const typeLabels = {
                synthesis: '合成',
                modification: '改造',
                experiment: '试验',
              };

              return (
                <div
                  key={log.id}
                  className={cn(
                    'p-4 rounded-lg border flex items-start gap-4',
                    log.success
                      ? 'bg-cyber-green/5 border-cyber-green/30'
                      : 'bg-cyber-red/5 border-cyber-red/30'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    log.success ? 'bg-cyber-green/20' : 'bg-cyber-red/20'
                  )}>
                    {log.success ? (
                      <Check className="w-5 h-5 text-cyber-green" />
                    ) : (
                      <X className="w-5 h-5 text-cyber-red" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-xs font-bold px-2 py-0.5 rounded',
                        `text-cyber-${typeColors[log.type]} bg-cyber-${typeColors[log.type]}/20`
                      )}>
                        {typeLabels[log.type]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{log.description}</p>
                    {log.rewards && log.rewards.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {log.rewards.map((reward, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-cyber-darker border border-gray-700"
                          >
                            <span className="text-sm">{reward.emoji}</span>
                            <span className="text-xs text-gray-400">
                              {reward.name}
                              {reward.amount ? ` ×${reward.amount}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
            <div>
              <h1 className="text-2xl font-cyber font-bold text-cyber-cyan flex items-center gap-2">
                <FlaskConical className="w-6 h-6" />
                实验室研发中心
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                部件合成 · 技能改造 · 概率试验
              </p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-dark/50 rounded-lg border border-cyber-yellow/30">
                <span className="text-cyber-yellow">💰</span>
                <span className="font-cyber font-bold text-cyber-yellow text-sm">
                  {formatNumber(player.coins)}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-dark/50 rounded-lg border border-cyber-purple/30">
                <span className="text-cyber-purple">💎</span>
                <span className="font-cyber font-bold text-cyber-purple text-sm">
                  {player.gems}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[73px] bg-cyber-darker/95 backdrop-blur-sm z-30 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-cyber text-sm transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? `bg-cyber-${tab.color}/20 text-cyber-${tab.color} border border-cyber-${tab.color}/50`
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'synthesis' && renderSynthesisTab()}
        {activeTab === 'modification' && renderModificationTab()}
        {activeTab === 'experiment' && renderExperimentTab()}
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'logs' && renderLogsTab()}
      </div>

      {showResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={cn(
            'bg-cyber-dark border-2 rounded-2xl max-w-md w-full overflow-hidden animate-pulse-once',
            showResult.success
              ? 'border-cyber-green shadow-lg shadow-cyber-green/20'
              : 'border-cyber-red shadow-lg shadow-cyber-red/20'
          )}>
            <div className={cn(
              'p-6 text-center',
              showResult.success ? 'bg-cyber-green/10' : 'bg-cyber-red/10'
            )}>
              <div className={cn(
                'w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4',
                showResult.success
                  ? 'bg-cyber-green/20 border-2 border-cyber-green'
                  : 'bg-cyber-red/20 border-2 border-cyber-red'
              )}>
                {showResult.success ? (
                  <Check className="w-10 h-10 text-cyber-green" />
                ) : (
                  <X className="w-10 h-10 text-cyber-red" />
                )}
              </div>
              <h3 className={cn(
                'text-xl font-cyber font-bold mb-2',
                showResult.success ? 'text-cyber-green' : 'text-cyber-red'
              )}>
                {showResult.success ? '成功！' : '失败'}
              </h3>
              <p className="text-gray-400 text-sm">{showResult.message}</p>
            </div>

            {showResult.rewards && showResult.rewards.length > 0 && (
              <div className="p-6 border-t border-gray-700">
                <div className="text-xs text-gray-400 font-cyber mb-3 text-center">获得奖励</div>
                <div className="space-y-2">
                  {showResult.rewards.map((reward, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-cyber-darker border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{reward.emoji}</span>
                        <span className="font-cyber text-white">{reward.name}</span>
                      </div>
                      {reward.amount && (
                        <span className="font-cyber text-cyber-yellow">×{reward.amount}</span>
                      )}
                      {reward.rarity && (
                        <span style={{ color: getRarityColor(reward.rarity) }}>
                          {getRarityStars(reward.rarity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-gray-700">
              <NeonButton
                variant={showResult.success ? 'green' : 'red'}
                fullWidth
                onClick={() => setShowResult(null)}
              >
                确定
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
