import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Swords, Plus, ArrowLeft, Info } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { PartSlot } from '@/components/PartSlot';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { BATTLE_CONSTANTS } from '@/engine/constants';
import type { Animal, PartSlot as PartSlotType } from '@/types';
import { getPartTemplate } from '@/data/parts';
import { calculateAnimalStats } from '@/engine/battleEngine';
import { StatBar } from '@/components/StatBar';

export default function Lineup() {
  const navigate = useNavigate();
  const {
    ownedAnimals,
    lineup,
    getLineupAnimals,
    addToLineup,
    removeFromLineup,
    levelUpAnimal,
    equipPart,
    unequipPart,
    ownedParts,
  } = useGameStore();

  const lineupAnimals = getLineupAnimals();

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PartSlotType | null>(null);
  const [showPartPicker, setShowPartPicker] = useState(false);

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
            <div className="text-sm text-gray-400 font-cyber">
              出战: <span className={lineup.length > 0 ? 'text-cyber-green' : 'text-cyber-red'}>{lineup.length}</span>
              /{BATTLE_CONSTANTS.MAX_TEAM_SIZE}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300 flex items-center gap-2">
            <Swords className="w-5 h-5 text-cyber-green" />
            出战阵容
          </h2>

          {lineupAnimals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {lineupAnimals.map(animal => (
                <AnimalCard
                  key={animal.id}
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
              ))}
            </div>
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
