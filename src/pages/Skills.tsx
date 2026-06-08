import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Plus, ArrowLeft, X } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import type { Animal, Skill } from '@/types';
import { getSkillTemplate } from '@/data/skills';
import { BATTLE_CONSTANTS } from '@/engine/constants';

const MAX_SKILLS_PER_ANIMAL = BATTLE_CONSTANTS.MAX_SKILLS_PER_ANIMAL;

export default function Skills() {
  const navigate = useNavigate();
  const { ownedAnimals, ownedSkills, equipSkill, unequipSkill } = useGameStore();

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showSkillPicker, setShowSkillPicker] = useState(false);

  const availableSkills = ownedSkills.filter(
    skill => !selectedAnimal?.skills.some(s => s.skillId === skill.id)
  );

  const handleEquipSkill = (skillId: string) => {
    if (!selectedAnimal) return;
    if (selectedAnimal.skills.length >= MAX_SKILLS_PER_ANIMAL) return;
    equipSkill(selectedAnimal.id, skillId);
    setShowSkillPicker(false);
    setSelectedAnimal(prev => prev ? {
      ...prev,
      skills: [...prev.skills, { skillId, level: 1 }]
    } : null);
  };

  const handleUnequipSkill = (index: number) => {
    if (!selectedAnimal) return;
    const skill = selectedAnimal.skills[index];
    unequipSkill(selectedAnimal.id, index);
    setSelectedAnimal(prev => prev ? {
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    } : null);
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
                <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyber-pink" />
                  已装备技能
                  <span className="text-sm text-gray-500 ml-2">
                    ({selectedAnimal.skills.length}/{MAX_SKILLS_PER_ANIMAL})
                  </span>
                </h2>

                <div className="space-y-3">
                  {selectedAnimal.skills.map((equipped, index) => {
                    const template = getSkillTemplate(equipped.skillId);
                    if (!template) return null;
                    return (
                      <NeonCard key={index} className="p-4">
                        <div className="flex items-center gap-4">
                          <SkillIcon skill={template} size="md" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-cyber font-bold text-white">
                                {template.name}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-cyber-pink/20 text-cyber-pink rounded">
                                Lv.{equipped.level}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>伤害: {template.damage}</span>
                              <span>CD: {template.cooldown}回合</span>
                            </div>
                          </div>
                          <NeonButton
                            size="sm"
                            variant="red"
                            onClick={() => handleUnequipSkill(index)}
                          >
                            <X className="w-4 h-4" />
                          </NeonButton>
                        </div>
                      </NeonCard>
                    );
                  })}

                  {Array.from({ length: MAX_SKILLS_PER_ANIMAL - selectedAnimal.skills.length }).map((_, i) => (
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
