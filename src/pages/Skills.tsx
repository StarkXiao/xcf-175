import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Plus, ArrowLeft, X, ChevronUp, Lock, GitBranch, Zap, Flame } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import type { Animal, SkillBranch } from '@/types';
import { getSkillTemplate } from '@/data/skills';
import { getSkillSlotsForStar, getSkillLevelCapForBreakthrough } from '@/data/ascendConfig';
import { ELEMENT_EMOJIS, ELEMENT_COLORS, ELEMENT_NAMES, STATUS_EFFECT_CONFIG, STAR_LEVEL_NAMES, BREAKTHROUGH_TIER_NAMES } from '@/engine/constants';

const SKILL_UPGRADE_COST = (level: number) => level * 50;
const BRANCH_COST = (requiredLevel: number) => requiredLevel * 100;

export default function Skills() {
  const navigate = useNavigate();
  const { ownedAnimals, ownedSkills, equipSkill, unequipSkill, upgradeSkill, chooseBranch, player } = useGameStore();

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [expandedSkillIndex, setExpandedSkillIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedAnimal) {
      const updated = ownedAnimals.find(a => a.id === selectedAnimal.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAnimal)) {
        setSelectedAnimal(updated);
      }
    }
  }, [ownedAnimals, selectedAnimal]);

  const maxSkillSlots = selectedAnimal ? getSkillSlotsForStar(selectedAnimal.starLevel) : 1;
  const skillLevelCap = selectedAnimal ? getSkillLevelCapForBreakthrough(selectedAnimal.breakthroughTier) : 1;

  const availableSkills = ownedSkills.filter(
    skill => !selectedAnimal?.skills.some(s => s.skillId === skill.templateId)
  );

  const handleEquipSkill = (skillId: string) => {
    if (!selectedAnimal) return;
    if (selectedAnimal.skills.length >= maxSkillSlots) return;
    const ok = equipSkill(selectedAnimal.id, skillId);
    if (ok) {
      setShowSkillPicker(false);
    }
  };

  const handleUnequipSkill = (index: number) => {
    if (!selectedAnimal) return;
    unequipSkill(selectedAnimal.id, index);
  };

  const handleUpgradeSkill = (index: number) => {
    if (!selectedAnimal) return;
    const equipped = selectedAnimal.skills[index];
    if (!equipped) return;
    const cost = SKILL_UPGRADE_COST(equipped.level);
    if (player.coins < cost) return;
    if (equipped.level >= skillLevelCap) return;
    upgradeSkill(selectedAnimal.id, index);
  };

  const handleChooseBranch = (skillIndex: number, branchId: string) => {
    if (!selectedAnimal) return;
    chooseBranch(selectedAnimal.id, skillIndex, branchId);
  };

  const renderBranchSelector = (
    template: ReturnType<typeof getSkillTemplate>,
    equipped: { level: number; branchId?: string },
    skillIndex: number
  ) => {
    if (!template?.branches || template.branches.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-700/50">
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch className="w-3.5 h-3.5 text-cyber-purple" />
          <span className="text-xs font-cyber font-bold text-cyber-purple">升级分支</span>
        </div>
        <div className="space-y-2">
          {template.branches.map((branch: SkillBranch) => {
            const isSelected = equipped.branchId === branch.id;
            const isLocked = equipped.level < branch.requiredLevel;
            const branchCost = BRANCH_COST(branch.requiredLevel);
            const canChoose = !isLocked && !isSelected && player.coins >= branchCost;

            return (
              <div
                key={branch.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-cyber-purple/15 border-cyber-purple/50'
                    : isLocked
                    ? 'bg-gray-900/50 border-gray-700/30 opacity-50'
                    : 'bg-gray-900/30 border-gray-700/50 hover:border-cyber-purple/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm">{branch.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-cyber font-bold ${isSelected ? 'text-cyber-purple' : 'text-gray-300'}`}>
                          {branch.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyber-purple/20 text-cyber-purple font-bold">
                            已选
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-500 font-bold">
                            Lv.{branch.requiredLevel}解锁
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{branch.description}</p>
                    </div>
                  </div>
                  {!isSelected && !isLocked && (
                    <NeonButton
                      size="sm"
                      variant={canChoose ? 'purple' : 'ghost'}
                      disabled={!canChoose}
                      onClick={() => handleChooseBranch(skillIndex, branch.id)}
                      className="shrink-0"
                    >
                      <span className="text-[10px]">{branchCost}💰</span>
                    </NeonButton>
                  )}
                </div>
                {branch.passive && (
                  <div className="mt-1.5 flex items-center gap-1.5 pl-6">
                    <Zap className="w-3 h-3 text-cyber-yellow" />
                    <span className="text-[10px] text-cyber-yellow font-bold">{branch.passive.name}</span>
                    <span className="text-[10px] text-gray-500">- {branch.passive.description}</span>
                  </div>
                )}
                <div className="mt-1 flex gap-3 pl-6 text-[10px] text-gray-600">
                  {branch.damageModifier && (
                    <span>伤害 ×{branch.damageModifier}</span>
                  )}
                  {branch.cooldownModifier && (
                    <span>CD {branch.cooldownModifier > 0 ? '+' : ''}{branch.cooldownModifier}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPassiveTag = (passive: NonNullable<ReturnType<typeof getSkillTemplate>['passive']>) => {
    return (
      <div
        key={passive.id}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/30"
      >
        <Zap className="w-3 h-3 text-cyber-yellow" />
        <span className="text-[10px] text-cyber-yellow font-bold">{passive.name}</span>
      </div>
    );
  };

  const renderComboTags = (template: ReturnType<typeof getSkillTemplate>) => {
    if (!template?.comboTriggers || template.comboTriggers.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {template.comboTriggers.map(combo => (
          <div
            key={combo.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30"
          >
            <Flame className="w-3 h-3 text-cyber-cyan" />
            <span className="text-[10px] text-cyber-cyan font-bold">{combo.name}</span>
            <span className="text-[10px] text-gray-400">+{combo.bonusDamage}伤害</span>
            {combo.teamBuff && (
              <span className="text-[10px] text-cyber-yellow">全队{combo.teamBuff.stat.toUpperCase()}+{combo.teamBuff.value}%</span>
            )}
          </div>
        ))}
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
            <h1 className="text-2xl font-cyber font-bold text-cyber-pink">技能配置</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {selectedAnimal ? (
          <div>
            <NeonButton
              size="sm"
              variant="ghost"
              className="mb-6"
              onClick={() => setSelectedAnimal(null)}
            >
              ← 返回动物列表
            </NeonButton>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <AnimalCard
                  animal={selectedAnimal}
                  showStats
                  showParts
                  showSkills={false}
                />
              </div>

              <div>
                <h2 className="font-cyber font-bold text-lg mb-2 text-gray-300 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyber-pink" />
                  已装备技能
                  <span className="text-sm text-gray-500 ml-2">
                    ({selectedAnimal.skills.length}/{maxSkillSlots})
                  </span>
                </h2>
                <div className="flex items-center gap-3 mb-4 text-xs">
                  <span className="text-cyber-yellow">⭐{STAR_LEVEL_NAMES[selectedAnimal.starLevel]}</span>
                  <span className="text-cyber-purple">🔮{BREAKTHROUGH_TIER_NAMES[selectedAnimal.breakthroughTier]}</span>
                  <span className="text-gray-400">技能槽: {maxSkillSlots}</span>
                  <span className="text-gray-400">等级上限: Lv.{skillLevelCap}</span>
                </div>

                <div className="space-y-3">
                  {selectedAnimal.skills.map((equipped, index) => {
                    const template = getSkillTemplate(equipped.skillId);
                    if (!template) return null;
                    const isMaxLevel = equipped.level >= skillLevelCap;
                    const upgradeCost = SKILL_UPGRADE_COST(equipped.level);
                    const canUpgrade = !isMaxLevel && player.coins >= upgradeCost;
                    const isExpanded = expandedSkillIndex === index;
                    const activeBranch = equipped.branchId
                      ? template.branches?.find(b => b.id === equipped.branchId)
                      : null;

                    const displayDamage = (() => {
                      let base = activeBranch?.damageModifier ? Math.floor(template.damage * activeBranch.damageModifier) : template.damage;
                      if (equipped.modifications?.damageBonus) {
                        base = Math.floor(base * (1 + equipped.modifications.damageBonus / 100));
                      }
                      return base;
                    })();
                    const displayCooldown = (() => {
                      let base = activeBranch?.cooldownModifier ? template.cooldown + activeBranch.cooldownModifier : template.cooldown;
                      if (equipped.modifications?.cooldownReduction) {
                        base = Math.max(1, base - equipped.modifications.cooldownReduction);
                      }
                      return base;
                    })();
                    const displayStatusEffect = equipped.modifications?.addStatusEffect
                      ? equipped.modifications.addStatusEffect
                      : (activeBranch?.statusEffectOverride || template.statusEffect);
                    const hasModifications = !!equipped.modifications;

                    return (
                      <NeonCard key={index} className="p-4">
                        <div className="flex items-center gap-4">
                          <SkillIcon skill={template} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-cyber font-bold text-white">
                                {activeBranch ? `${template.name}·${activeBranch.name}` : template.name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${isMaxLevel ? 'bg-cyber-yellow/20 text-cyber-yellow' : 'bg-cyber-pink/20 text-cyber-pink'}`}>
                                Lv.{equipped.level}{isMaxLevel ? ' MAX' : `/${skillLevelCap}`}
                              </span>
                              {hasModifications && (
                                <span className="text-xs px-2 py-0.5 rounded font-bold bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/40">
                                  ⚡改造
                                </span>
                              )}
                              {template.element && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                                  style={{
                                    backgroundColor: `${ELEMENT_COLORS[template.element]}20`,
                                    color: ELEMENT_COLORS[template.element],
                                    border: `1px solid ${ELEMENT_COLORS[template.element]}40`,
                                  }}
                                >
                                  {ELEMENT_EMOJIS[template.element]} {ELEMENT_NAMES[template.element]}
                                </span>
                              )}
                              {template.passive && renderPassiveTag(template.passive)}
                              {activeBranch?.passive && renderPassiveTag(activeBranch.passive)}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {activeBranch ? activeBranch.description : template.description}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>伤害: {displayDamage}{equipped.modifications?.damageBonus && <span className="text-cyber-purple"> (+{equipped.modifications.damageBonus}%)</span>}</span>
                              <span>CD: {displayCooldown}回合{equipped.modifications?.cooldownReduction && <span className="text-cyber-cyan"> (-{equipped.modifications.cooldownReduction})</span>}</span>
                              {displayStatusEffect && (
                                <span
                                  style={{ color: STATUS_EFFECT_CONFIG[displayStatusEffect.type].color }}
                                >
                                  {STATUS_EFFECT_CONFIG[displayStatusEffect.type].emoji}{' '}
                                  {STATUS_EFFECT_CONFIG[displayStatusEffect.type].name}{' '}
                                  {displayStatusEffect.chance}%
                                </span>
                              )}
                            </div>
                            {renderComboTags(template)}
                            {!isMaxLevel && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                  <span>等级进度</span>
                                  <span>{upgradeCost} 💰</span>
                                </div>
                                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-cyber-pink to-cyber-purple rounded-full transition-all duration-300"
                                    style={{ width: `${(equipped.level / skillLevelCap) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {template.branches && template.branches.length > 0 && (
                              <NeonButton
                                size="sm"
                                variant={isExpanded ? 'purple' : 'ghost'}
                                onClick={() => setExpandedSkillIndex(isExpanded ? null : index)}
                                title="查看升级分支"
                              >
                                <GitBranch className="w-4 h-4" />
                              </NeonButton>
                            )}
                            <NeonButton
                              size="sm"
                              variant={canUpgrade ? 'cyan' : 'ghost'}
                              disabled={!canUpgrade}
                              onClick={() => handleUpgradeSkill(index)}
                              title={isMaxLevel ? `需突破至更高阶解锁 (当前上限Lv.${skillLevelCap})` : `升级需 ${upgradeCost} 💰`}
                            >
                              {isMaxLevel ? <Lock className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </NeonButton>
                            <NeonButton
                              size="sm"
                              variant="red"
                              onClick={() => handleUnequipSkill(index)}
                            >
                              <X className="w-4 h-4" />
                            </NeonButton>
                          </div>
                        </div>
                        {isExpanded && renderBranchSelector(template, equipped, index)}
                      </NeonCard>
                    );
                  })}

                  {Array.from({ length: maxSkillSlots - selectedAnimal.skills.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="border-2 border-dashed border-gray-700 rounded-xl p-6 flex items-center justify-center gap-3 cursor-pointer hover:border-cyber-pink/50 transition-colors"
                      onClick={() => setShowSkillPicker(true)}
                    >
                      <Plus className="w-6 h-6 text-gray-500" />
                      <span className="font-cyber text-gray-500">装备技能</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyber-pink" />
              选择动物
            </h2>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownedAnimals.map(animal => (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    showStats
                    showSkills
                    onClick={() => setSelectedAnimal(animal)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSkillPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-pink rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-cyber-pink">
                选择技能
              </h3>
              <NeonButton size="sm" variant="ghost" onClick={() => setShowSkillPicker(false)}>
                ×
              </NeonButton>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availableSkills.length === 0 ? (
                <Empty
                  title="没有可用技能"
                  description="所有技能都已装备或没有技能，去商店抽取吧！"
                  action={
                    <NeonButton onClick={() => navigate('/shop')}>
                      前往商店
                    </NeonButton>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableSkills.map(skill => (
                    <div
                      key={skill.id}
                      className="p-4 bg-cyber-darker border border-gray-700 rounded-xl cursor-pointer hover:border-cyber-pink/50 transition-colors"
                      onClick={() => handleEquipSkill(skill.id)}
                    >
                      <div className="flex items-center gap-3">
                        <SkillIcon skill={skill} size="md" />
                        <div className="flex-1">
                          <div className="font-cyber font-bold text-white">{skill.name}</div>
                          <p className="text-xs text-gray-400 mt-1">{skill.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-gray-500">
                            <span>伤害: {skill.damage}</span>
                            <span>CD: {skill.cooldown}回合</span>
                            {skill.element && (
                              <span
                                style={{ color: ELEMENT_COLORS[skill.element] }}
                              >
                                {ELEMENT_EMOJIS[skill.element]} {ELEMENT_NAMES[skill.element]}
                              </span>
                            )}
                            {skill.statusEffect && (
                              <span
                                style={{ color: STATUS_EFFECT_CONFIG[skill.statusEffect.type].color }}
                              >
                                {STATUS_EFFECT_CONFIG[skill.statusEffect.type].emoji} {STATUS_EFFECT_CONFIG[skill.statusEffect.type].name}
                              </span>
                            )}
                          </div>
                          {skill.branches && skill.branches.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <GitBranch className="w-3 h-3 text-cyber-purple" />
                              <span className="text-[10px] text-cyber-purple">{skill.branches.length}条分支</span>
                            </div>
                          )}
                          {skill.comboTriggers && skill.comboTriggers.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Flame className="w-3 h-3 text-cyber-cyan" />
                              <span className="text-[10px] text-cyber-cyan">{skill.comboTriggers.map(c => c.name).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
