import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShoppingBag, ArrowLeft, Sparkles, Coins, Package, BookOpen } from 'lucide-react';
import { NeonButton } from '@/components/NeonButton';
import { NeonCard } from '@/components/NeonCard';
import { AnimalCard } from '@/components/AnimalCard';
import { PartSlot } from '@/components/PartSlot';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty } from '@/components/Empty';
import { useGameStore } from '@/store/useGameStore';
import { GACHA_RATES, GACHA_COST } from '@/engine/constants';
import type { Animal, Part, Skill, Rarity } from '@/types';
import { getRarityColor, getRarityStars } from '@/utils/format';
import { cn } from '@/lib/utils';

type GachaType = 'animal' | 'part' | 'skill';

interface GachaResult {
  type: GachaType;
  item: Animal | Part | Skill;
  isNew: boolean;
}

export default function Shop() {
  const navigate = useNavigate();
  const {
    player,
    gachaAnimal,
    gachaPart,
    gachaSkill,
    ownedAnimals,
    ownedParts,
    ownedSkills,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<GachaType>('animal');
  const [showResult, setShowResult] = useState(false);
  const [gachaResults, setGachaResults] = useState<GachaResult[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleGacha = (type: GachaType, count: number = 1) => {
    const cost = GACHA_COST[type] * count;
    if (player.coins < cost) return;

    setIsAnimating(true);
    const results: GachaResult[] = [];

    for (let i = 0; i < count; i++) {
      let item: Animal | Part | Skill;
      let isNew: boolean;

      switch (type) {
        case 'animal':
          const animalResult = gachaAnimal();
          item = animalResult.animal;
          isNew = animalResult.isNew;
          break;
        case 'part':
          const partResult = gachaPart();
          item = partResult.part;
          isNew = partResult.isNew;
          break;
        case 'skill':
          const skillResult = gachaSkill();
          item = skillResult.skill;
          isNew = skillResult.isNew;
          break;
        default:
          return;
      }

      results.push({ type, item, isNew });
    }

    setTimeout(() => {
      setGachaResults(results);
      setShowResult(true);
      setIsAnimating(false);
    }, 1000);
  };

  const tabs = [
    { type: 'animal' as GachaType, label: '动物', icon: Sparkles, cost: GACHA_COST.animal },
    { type: 'part' as GachaType, label: '部件', icon: Package, cost: GACHA_COST.part },
    { type: 'skill' as GachaType, label: '技能', icon: BookOpen, cost: GACHA_COST.skill },
  ];

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
    }
  };

  const renderResultItem = (result: GachaResult, index: number) => {
    const rarityColor = getRarityColor(result.item.rarity);
    const stars = getRarityStars(result.item.rarity);

    return (
      <div
        key={index}
        className="flex flex-col items-center animate-bounce-in"
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
        </div>
        <div className="text-center">
          <div className="text-xs" style={{ color: rarityColor }}>{stars}</div>
          <div className="font-cyber font-bold" style={{ color: rarityColor }}>
            {result.item.name}
          </div>
          {'description' in result.item && (
            <p className="text-xs text-gray-400 mt-1 max-w-[150px]">
              {result.item.description}
            </p>
          )}
        </div>
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-lg">
              <Coins className="w-5 h-5 text-cyber-yellow" />
              <span className="font-cyber font-bold text-cyber-yellow">{player.coins}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {tabs.map(tab => (
            <NeonCard
              key={tab.type}
              variant={tab.type === 'animal' ? 'purple' : tab.type === 'part' ? 'cyan' : 'pink'}
              className={cn(
                'cursor-pointer transition-all relative overflow-hidden',
                activeTab === tab.type ? 'ring-2 ring-white/50' : 'opacity-80 hover:opacity-100'
              )}
              onClick={() => setActiveTab(tab.type)}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
                style={{ background: tab.type === 'animal' ? '#a855f7' : tab.type === 'part' ? '#06b6d4' : '#ec4899' }}
              />
              <tab.icon className="w-10 h-10 mb-3" />
              <h3 className="font-cyber font-bold text-xl mb-2">{tab.label}召唤</h3>
              <p className="text-sm text-gray-400 mb-4">
                {tab.type === 'animal' && '获得新的战斗动物'}
                {tab.type === 'part' && '获得改造部件'}
                {tab.type === 'skill' && '获得强力技能'}
              </p>
              <div className="flex gap-2">
                <NeonButton
                  size="sm"
                  variant={tab.type === 'animal' ? 'purple' : tab.type === 'part' ? 'cyan' : 'pink'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGacha(tab.type, 1);
                  }}
                  disabled={player.coins < tab.cost || isAnimating}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  单抽 {tab.cost}💰
                </NeonButton>
                <NeonButton
                  size="sm"
                  variant={tab.type === 'animal' ? 'purple' : tab.type === 'part' ? 'cyan' : 'pink'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGacha(tab.type, 10);
                  }}
                  disabled={player.coins < tab.cost * 10 || isAnimating}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  十连 {tab.cost * 10}💰
                </NeonButton>
              </div>
            </NeonCard>
          ))}
        </div>

        <NeonCard className="mb-6">
          <h3 className="font-cyber font-bold text-sm text-gray-400 mb-3">召唤概率</h3>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {([1, 2, 3, 4, 5] as Rarity[]).map(rarity => (
              <div key={rarity}>
                <div style={{ color: getRarityColor(rarity) }}>
                  {getRarityStars(rarity)}
                </div>
                <div className="text-gray-400">
                  {GACHA_RATES[activeTab][rarity]}%
                </div>
              </div>
            ))}
          </div>
        </NeonCard>

        <div>
          <h2 className="font-cyber font-bold text-lg mb-4 text-gray-300">
            我的{activeTab === 'animal' ? '动物' : activeTab === 'part' ? '部件' : '技能'}
            <span className="text-sm text-gray-500 ml-2">
              ({activeTab === 'animal' ? ownedAnimals.length : activeTab === 'part' ? ownedParts.length : ownedSkills.length})
            </span>
          </h2>
          {renderInventory()}
        </div>
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
          </div>
        </div>
      )}

      {showResult && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-purple rounded-2xl max-w-3xl w-full p-8">
            <h2 className="text-3xl font-cyber font-black text-center mb-8 bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink bg-clip-text text-transparent">
              🎉 召唤结果
            </h2>

            <div className="flex flex-wrap justify-center gap-8 mb-8">
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
                variant="purple"
                onClick={() => {
                  setShowResult(false);
                  handleGacha(activeTab, gachaResults.length);
                }}
                disabled={player.coins < GACHA_COST[activeTab] * gachaResults.length}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                再来{gachaResults.length}连
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
