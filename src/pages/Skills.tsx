import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Plus, ArrowLeft, X, ChevronUp, Lock } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import type { Animal } from '@/types';
import { getSkillTemplate } from '@/data/skills';
import { getSkillSlotsForStar, getSkillLevelCapForBreakthrough } from '@/data/ascendConfig';
import { ELEMENT_EMOJIS, ELEMENT_COLORS, ELEMENT_NAMES, STATUS_EFFECT_CONFIG, STAR_LEVEL_NAMES, BREAKTHROUGH_TIER_NAMES } from '@/engine/constants';

const SKILL_UPGRADE_COST = (level: number) => level * 50;

export default function Skills() {
  const navigate = useNavigate();
  const { ownedAnimals, ownedSkills, equipSkill, unequipSkill, upgradeSkill, player } = useGameStore();

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showSkillPicker, setShowSkillPicker] = useState(false);

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
                    return (
                      <NeonCard key={index} className="p-4">
                        <div className="flex items-center gap-4">
                          <SkillIcon skill={template} size="md" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-cyber font-bold text-white">
                                {template.name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded font-bold ${isMaxLevel ? 'bg-cyber-yellow/20 text-cyber-yellow' : 'bg-cyber-pink/20 text-cyber-pink'}`}>
                                Lv.{equipped.level}{isMaxLevel ? ' MAX' : `/${skillLevelCap}`}
                              </span>
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
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>伤害: {template.damage}</span>
                              <span>CD: {template.cooldown}回合</span>
                              {template.statusEffect && (
                                <span
                                  style={{ color: STATUS_EFFECT_CONFIG[template.statusEffect.type].color }}
                                >
                                  {STATUS_EFFECT_CONFIG[template.statusEffect.type].emoji} {STATUS_EFFECT_CONFIG[template.statusEffect.type].name} {template.statusEffect.chance}%
                                </span>
                              )}
                            </div>
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
