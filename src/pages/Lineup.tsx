import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Swords, Plus, ArrowLeft, Info, Target, Zap, Shield } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { PartSlot } from '@/components/PartSlot';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { BATTLE_CONSTANTS } from '@/engine/constants';
import { FORMATION_MODIFIERS } from '@/engine/damageCalc';
import type { Animal, PartSlot as PartSlotType, FormationPosition, TargetStrategy, ActionPriority } from '@/types';
import { getPartTemplate } from '@/data/parts';
import { calculateAnimalStats } from '@/engine/battleEngine';
import { StatBar } from '@/components/StatBar';
import { cn } from '@/lib/utils';

const FORMATION_POSITIONS: { value: FormationPosition; label: string; emoji: string; desc: string }[] = [
  { value: 'front', label: '前排', emoji: '🛡️', desc: '承受伤害-15%，防御+15%' },
  { value: 'mid', label: '中排', emoji: '⚔️', desc: '均衡站位，无特殊加成' },
  { value: 'back', label: '后排', emoji: '🏹', desc: '输出+15%，承受伤害+10%' },
];

const TARGET_STRATEGIES: { value: TargetStrategy; label: string; emoji: string; desc: string }[] = [
  { value: 'lowestHp', label: '残血优先', emoji: '🎯', desc: '优先攻击HP最低的敌人' },
  { value: 'highestAtk', label: '威胁优先', emoji: '🔥', desc: '优先攻击ATK最高的敌人' },
  { value: 'weakest', label: '破防优先', emoji: '💥', desc: '优先攻击DEF最低的敌人' },
  { value: 'highestThreat', label: '高危优先', emoji: '⚠️', desc: '综合威胁度最高目标' },
  { value: 'random', label: '随机目标', emoji: '🎲', desc: '随机选择目标' },
];

const ACTION_PRIORITIES: { value: ActionPriority; label: string; emoji: string; desc: string }[] = [
  { value: 'speedFirst', label: '速度优先', emoji: '⚡', desc: '纯速度排序出手' },
  { value: 'strategic', label: '策略优先', emoji: '🧠', desc: '增益/治疗/前排优先出手' },
  { value: 'aggressive', label: '进攻优先', emoji: '🗡️', desc: '攻击技能就绪者优先出手' },
];

export default function Lineup() {
  const navigate = useNavigate();
  const {
    ownedAnimals,
    lineup,
    lineupConfig,
    getLineupAnimals,
    addToLineup,
    removeFromLineup,
    levelUpAnimal,
    equipPart,
    unequipPart,
    ownedParts,
    setFormationPosition,
    setTargetStrategy,
    setActionPriority,
  } = useGameStore();

  const lineupAnimals = getLineupAnimals();

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PartSlotType | null>(null);
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [showStrategyPanel, setShowStrategyPanel] = useState(false);

  useEffect(() => {
    if (selectedAnimal) {
      const updated = ownedAnimals.find(a => a.id === selectedAnimal.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAnimal)) {
        setSelectedAnimal(updated);
      }
    }
  }, [ownedAnimals, selectedAnimal]);

  const partSlots: PartSlotType[] = ['head', 'body', 'limbs', 'weapon', 'core', 'special'];

  const availablePartsForSlot = selectedSlot
    ? ownedParts.filter(p => p.slot === selectedSlot)
    : [];

  const handleSlotClick = (slot: PartSlotType) => {
    if (!selectedAnimal) return;
    setSelectedSlot(slot);
    setShowPartPicker(true);
  };

  const handleEquipPart = (partId: string) => {
    if (!selectedAnimal || !selectedSlot) return;
    equipPart(selectedAnimal.id, partId, selectedSlot);
    setShowPartPicker(false);
    setSelectedSlot(null);
    setSelectedAnimal(prev => prev ? { ...prev, parts: [...prev.parts.filter(p => p.slot !== selectedSlot), { partId, slot: selectedSlot }] } : null);
  };

  const handleUnequipPart = (slot: PartSlotType) => {
    if (!selectedAnimal) return;
    unequipPart(selectedAnimal.id, slot);
    setSelectedAnimal(prev => prev ? { ...prev, parts: prev.parts.filter(p => p.slot !== slot) } : null);
  };

  const getEquippedPart = (animal: Animal, slot: PartSlotType) => {
    const equipped = animal.parts.find(p => p.slot === slot);
    if (equipped) {
      return getPartTemplate(equipped.partId);
    }
    return null;
  };

  const getAnimalConfig = (animalId: string) => {
    return lineupConfig.animals.find(c => c.animalId === animalId);
  };

  const totalStats = lineupAnimals.reduce(
    (acc, animal) => {
      const stats = calculateAnimalStats(animal);
      return {
        hp: acc.hp + stats.hp,
        atk: acc.atk + stats.atk,
        def: acc.def + stats.def,
        spd: acc.spd + stats.spd,
      };
    },
    { hp: 0, atk: 0, def: 0, spd: 0 }
  );

  const getPositionEmoji = (pos: FormationPosition) => {
    return FORMATION_POSITIONS.find(p => p.value === pos)?.emoji || '⚔️';
  };

  const getTargetLabel = (strategy: TargetStrategy) => {
    return TARGET_STRATEGIES.find(s => s.value === strategy)?.label || '残血优先';
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
              <h1 className="text-2xl font-cyber font-bold text-cyber-cyan">阵容编辑</h1>
            </div>
            <div className="flex items-center gap-3">
              {lineupAnimals.length > 0 && (
                <NeonButton size="sm" variant="purple" onClick={() => setShowStrategyPanel(!showStrategyPanel)}>
                  <Target className="w-4 h-4 mr-1" />
                  策略
                </NeonButton>
              )}
              <div className="text-sm text-gray-400 font-cyber">
                出战: <span className={lineup.length > 0 ? 'text-cyber-green' : 'text-cyber-red'}>{lineup.length}</span>
                /{BATTLE_CONSTANTS.MAX_TEAM_SIZE}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {showStrategyPanel && lineupAnimals.length > 0 && (
          <NeonCard variant="purple" className="p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-cyber-purple" />
              <h2 className="font-cyber font-bold text-lg text-cyber-purple">出手优先级</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ACTION_PRIORITIES.map(ap => (
                <button
                  key={ap.value}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    lineupConfig.actionPriority === ap.value
                      ? 'border-cyber-purple bg-cyber-purple/20'
                      : 'border-gray-700 bg-cyber-darker hover:border-gray-500'
                  )}
                  onClick={() => setActionPriority(ap.value)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{ap.emoji}</span>
                    <span className={cn(
                      'font-cyber font-bold text-sm',
                      lineupConfig.actionPriority === ap.value ? 'text-cyber-purple' : 'text-gray-300'
                    )}>
                      {ap.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{ap.desc}</p>
                </button>
              ))}
            </div>
          </NeonCard>
        )}

        <div className="mb-8">
          <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300 flex items-center gap-2">
            <Swords className="w-5 h-5 text-cyber-green" />
            出战阵容
          </h2>

          {lineupAnimals.length > 0 && (
            <>
              <NeonCard variant="cyan" className="p-4 mb-4">
                <h3 className="font-cyber font-bold text-sm text-gray-400 mb-3">⚔️ 站位布阵</h3>
                <div className="space-y-3">
                  {(['front', 'mid', 'back'] as FormationPosition[]).map(pos => {
                    const posConfig = FORMATION_POSITIONS.find(p => p.value === pos)!;
                    const unitsAtPos = lineupConfig.animals.filter(a => a.position === pos);
                    const modifier = FORMATION_MODIFIERS[pos];
                    return (
                      <div key={pos} className="flex items-center gap-3">
                        <div className={cn(
                          'w-16 text-center py-2 rounded-lg border-2 flex-shrink-0',
                          pos === 'front' ? 'border-cyber-cyan bg-cyber-cyan/10' :
                          pos === 'mid' ? 'border-cyber-yellow bg-cyber-yellow/10' :
                          'border-cyber-pink bg-cyber-pink/10'
                        )}>
                          <div className="text-xl">{posConfig.emoji}</div>
                          <div className="text-xs font-cyber text-gray-300">{posConfig.label}</div>
                        </div>
                        <div className="text-xs text-gray-500 w-20 flex-shrink-0">
                          <div>伤{modifier.damageDealtMul >= 1 ? `+${Math.round((modifier.damageDealtMul - 1) * 100)}%` : ''}</div>
                          <div>防{modifier.defBonus >= 0 ? `+${modifier.defBonus}%` : `${modifier.defBonus}%`}</div>
                          <div>受{modifier.damageTakenMul <= 1 ? `${Math.round((1 - modifier.damageTakenMul) * 100)}%减免` : `+${Math.round((modifier.damageTakenMul - 1) * 100)}%`}</div>
                        </div>
                        <div className="flex-1 flex gap-2 flex-wrap">
                          {unitsAtPos.length > 0 ? unitsAtPos.map(ac => {
                            const animal = lineupAnimals.find(a => a.id === ac.animalId);
                            if (!animal) return null;
                            const template = ownedAnimals.find(a => a.id === animal.id);
                            const name = template?.name || animal.name;
                            return (
                              <div
                                key={ac.animalId}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all',
                                  selectedAnimal?.id === ac.animalId
                                    ? 'border-cyber-cyan bg-cyber-cyan/10'
                                    : 'border-gray-600 bg-cyber-darker hover:border-gray-400'
                                )}
                                onClick={() => setSelectedAnimal(animal)}
                              >
                                <span className="text-sm font-cyber text-gray-200">{name}</span>
                                <span className="text-xs text-gray-500">
                                  🎯{getTargetLabel(ac.targetStrategy)}
                                </span>
                              </div>
                            );
                          }) : (
                            <div className="text-xs text-gray-600 italic py-1">空</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </NeonCard>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {lineupAnimals.map(animal => {
                  const config = getAnimalConfig(animal.id);
                  return (
                    <div key={animal.id} className="relative">
                      {config && (
                        <div className="absolute top-2 right-2 z-10 flex gap-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-cyber-purple/30 border border-cyber-purple/50 text-cyber-purple font-cyber">
                            {getPositionEmoji(config.position)}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-cyber-yellow/30 border border-cyber-yellow/50 text-cyber-yellow font-cyber">
                            🎯{getTargetLabel(config.targetStrategy)}
                          </span>
                        </div>
                      )}
                      <AnimalCard
                        animal={animal}
                        selected={selectedAnimal?.id === animal.id}
                        inLineup
                        onClick={() => setSelectedAnimal(animal)}
                        onRemove={() => removeFromLineup(animal.id)}
                        onLevelUp={() => {
                          levelUpAnimal(animal.id);
                          setSelectedAnimal(prev => prev && prev.id === animal.id ? { ...prev, level: prev.level + 1 } : prev);
                        }}
                        showStats
                        showParts
                        showSkills
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {Array.from({ length: BATTLE_CONSTANTS.MAX_TEAM_SIZE - lineup.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500"
              >
                <Plus className="w-12 h-12 mb-2" />
                <span className="font-cyber">空位 {lineup.length + i + 1}</span>
              </div>
            ))}
          </div>

          {lineup.length > 0 && (
            <NeonCard variant="cyan" className="p-4">
              <h3 className="font-cyber font-bold text-sm text-gray-400 mb-3">队伍总属性</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBar label="HP" value={totalStats.hp} maxValue={900} color="green" icon="❤️" />
                <StatBar label="ATK" value={totalStats.atk} maxValue={450} color="red" icon="⚔️" />
                <StatBar label="DEF" value={totalStats.def} maxValue={300} color="cyan" icon="🛡️" />
                <StatBar label="SPD" value={totalStats.spd} maxValue={300} color="yellow" icon="⚡" />
              </div>
            </NeonCard>
          )}
        </div>

        {selectedAnimal && lineup.includes(selectedAnimal.id) && (
          <div className="mb-8">
            <NeonCard variant="purple" className="p-5">
              <h2 className="font-cyber font-bold text-lg mb-4 text-cyber-purple flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {selectedAnimal.name} - 站位与策略
              </h2>

              <div className="mb-4">
                <h3 className="font-cyber font-bold text-sm text-gray-400 mb-2">📍 站位选择</h3>
                <div className="grid grid-cols-3 gap-3">
                  {FORMATION_POSITIONS.map(fp => {
                    const config = getAnimalConfig(selectedAnimal.id);
                    const isSelected = config?.position === fp.value;
                    return (
                      <button
                        key={fp.value}
                        className={cn(
                          'p-3 rounded-lg border-2 text-center transition-all',
                          isSelected
                            ? fp.value === 'front'
                              ? 'border-cyber-cyan bg-cyber-cyan/20'
                              : fp.value === 'mid'
                              ? 'border-cyber-yellow bg-cyber-yellow/20'
                              : 'border-cyber-pink bg-cyber-pink/20'
                            : 'border-gray-700 bg-cyber-darker hover:border-gray-500'
                        )}
                        onClick={() => setFormationPosition(selectedAnimal.id, fp.value)}
                      >
                        <div className="text-2xl mb-1">{fp.emoji}</div>
                        <div className={cn(
                          'font-cyber font-bold text-sm',
                          isSelected ? 'text-white' : 'text-gray-400'
                        )}>
                          {fp.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{fp.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-cyber font-bold text-sm text-gray-400 mb-2">🎯 目标策略</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {TARGET_STRATEGIES.map(ts => {
                    const config = getAnimalConfig(selectedAnimal.id);
                    const isSelected = config?.targetStrategy === ts.value;
                    return (
                      <button
                        key={ts.value}
                        className={cn(
                          'p-2.5 rounded-lg border-2 text-left transition-all',
                          isSelected
                            ? 'border-cyber-yellow bg-cyber-yellow/15'
                            : 'border-gray-700 bg-cyber-darker hover:border-gray-500'
                        )}
                        onClick={() => setTargetStrategy(selectedAnimal.id, ts.value)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ts.emoji}</span>
                          <span className={cn(
                            'font-cyber font-bold text-sm',
                            isSelected ? 'text-cyber-yellow' : 'text-gray-300'
                          )}>
                            {ts.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{ts.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </NeonCard>
          </div>
        )}

        {selectedAnimal && (
          <div className="mb-8">
            <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300">
              部件改造 - {selectedAnimal.name}
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {partSlots.map(slot => {
                const part = getEquippedPart(selectedAnimal, slot);
                return (
                  <PartSlot
                    key={slot}
                    slot={slot}
                    part={part}
                    onClick={() => handleSlotClick(slot)}
                    onRemove={part ? () => handleUnequipPart(slot) : undefined}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300 flex items-center gap-2">
            <Info className="w-5 h-5 text-cyber-cyan" />
            我的动物
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
              {ownedAnimals.map(animal => {
                const isInLineup = lineup.includes(animal.id);
                return (
                  <AnimalCard
                    key={animal.id}
                    animal={animal}
                    selected={selectedAnimal?.id === animal.id}
                    inLineup={isInLineup}
                    onClick={() => setSelectedAnimal(animal)}
                    onLevelUp={() => {
                      levelUpAnimal(animal.id);
                      setSelectedAnimal(prev => prev && prev.id === animal.id ? { ...prev, level: prev.level + 1 } : prev);
                    }}
                    showStats
                    showParts
                    showSkills
                    action={
                      !isInLineup && lineup.length < BATTLE_CONSTANTS.MAX_TEAM_SIZE ? (
                        <NeonButton
                          size="sm"
                          variant="green"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToLineup(animal.id);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          出战
                        </NeonButton>
                      ) : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showPartPicker && selectedSlot && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-purple rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-cyber font-bold text-lg text-cyber-purple">
                选择 {partSlots.find(s => s === selectedSlot)} 部件
              </h3>
              <NeonButton size="sm" variant="ghost" onClick={() => setShowPartPicker(false)}>
                ×
              </NeonButton>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availablePartsForSlot.length === 0 ? (
                <Empty
                  title="没有可用部件"
                  description={`没有${partSlots.find(s => s === selectedSlot)}部件，去商店抽取吧！`}
                  action={
                    <NeonButton onClick={() => navigate('/shop')}>
                      前往商店
                    </NeonButton>
                  }
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availablePartsForSlot.map(part => (
                    <PartSlot
                      key={part.id}
                      slot={selectedSlot}
                      part={part}
                      onClick={() => handleEquipPart(part.id)}
                    />
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
