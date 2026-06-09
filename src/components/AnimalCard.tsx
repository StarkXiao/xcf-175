import { cn } from '@/lib/utils';
import type { Animal } from '@/types';
import { getAnimalTemplate } from '@/data/animals';
import { getRarityColor, getRarityStars } from '@/utils/format';
import { calculateAnimalStats } from '@/engine/battleEngine';
import { ELEMENT_EMOJIS, ELEMENT_COLORS, ELEMENT_NAMES, STAR_LEVEL_NAMES, BREAKTHROUGH_TIER_NAMES } from '@/engine/constants';
import { StatBar } from './StatBar';
import { SkillIcon } from './SkillIcon';
import { getPartTemplate, QUALITY_NAMES, QUALITY_COLORS, getPartSet, getActiveSetBonuses } from '@/data/parts';
import { Plus, X, ArrowUp } from 'lucide-react';
import { NeonButton } from './NeonButton';
import { useGameStore } from '@/store/useGameStore';

interface AnimalCardProps {
  animal: Animal;
  selected?: boolean;
  inLineup?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  onLevelUp?: () => void;
  showStats?: boolean;
  showSkills?: boolean;
  showParts?: boolean;
  compact?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export const AnimalCard = ({
  animal,
  selected = false,
  inLineup = false,
  onClick,
  onRemove,
  onLevelUp,
  showStats = true,
  showSkills = false,
  showParts = false,
  compact = false,
  action,
  className,
}: AnimalCardProps) => {
  const template = getAnimalTemplate(animal.templateId);
  const stats = calculateAnimalStats(animal);
  const rarityColor = getRarityColor(animal.rarity);
  const levelUpCost = animal.level * 100;
  const coins = useGameStore(state => state.player.coins);
  const canLevelUp = coins >= levelUpCost;

  if (!template) return null;

  const partSlots = ['head', 'body', 'limbs', 'weapon', 'core', 'special'] as const;
  const equippedParts = partSlots.map(slot => {
    const equipped = animal.parts.find(p => p.slot === slot);
    if (equipped) {
      const template = getPartTemplate(equipped.partId);
      return template ? { ...template, quality: equipped.quality || 1, setId: template.setId || equipped.setId } : null;
    }
    return null;
  });

  const activeSetBonuses = getActiveSetBonuses(animal.parts);

  return (
    <div
      onClick={onClick}
      className={cn(
        'card relative transition-all duration-300 overflow-hidden',
        selected ? 'neon-border-cyan scale-105' : 'border-gray-700',
        inLineup && 'neon-border-green',
        onClick && 'cursor-pointer hover:scale-102',
        compact ? 'p-3' : 'p-4',
        className
      )}
      style={{
        borderColor: selected ? undefined : `${rarityColor}50`,
      }}
    >
      {inLineup && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyber-green/20 border border-cyber-green rounded text-xs font-cyber text-cyber-green">
          出战中
        </div>
      )}

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-cyber-red/20 border border-cyber-red rounded-full flex items-center justify-center text-cyber-red hover:bg-cyber-red/40 transition-colors z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      <div className="flex gap-4">
        <div
          className="relative flex-shrink-0 flex items-center justify-center rounded-lg bg-cyber-dark"
          style={{
            width: compact ? '60px' : '80px',
            height: compact ? '60px' : '80px',
            border: `2px solid ${rarityColor}`,
            boxShadow: `0 0 15px ${rarityColor}40, 0 0 25px ${ELEMENT_COLORS[template.element]}20`,
          }}
        >
          <span className={cn(compact ? 'text-3xl' : 'text-5xl')}>{template.emoji}</span>
          <div
            className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border border-white/30 bg-cyber-darker"
            style={{ boxShadow: `0 0 6px ${ELEMENT_COLORS[template.element]}` }}
          >
            {ELEMENT_EMOJIS[template.element]}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-cyber font-bold text-lg truncate" style={{ color: rarityColor }}>
              {animal.name}
            </h3>
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300 font-cyber">
              Lv.{animal.level}
            </span>
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
          </div>

          <div className="text-xs" style={{ color: rarityColor }}>
            {getRarityStars(animal.rarity)}
          </div>

          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-yellow/30 bg-cyber-yellow/10 text-cyber-yellow font-cyber">
              ⭐{STAR_LEVEL_NAMES[animal.starLevel]}
            </span>
            {animal.breakthroughTier > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-cyber-purple/30 bg-cyber-purple/10 text-cyber-purple font-cyber">
                🔮{BREAKTHROUGH_TIER_NAMES[animal.breakthroughTier]}
              </span>
            )}
          </div>

          {!compact && showStats && (
            <div className="mt-2 space-y-1">
              <StatBar label="HP" value={stats.hp} maxValue={300} color="green" icon="❤️" />
              <StatBar label="ATK" value={stats.atk} maxValue={150} color="red" icon="⚔️" />
              <StatBar label="DEF" value={stats.def} maxValue={100} color="cyan" icon="🛡️" />
              <StatBar label="SPD" value={stats.spd} maxValue={100} color="yellow" icon="⚡" />
            </div>
          )}
        </div>
      </div>

      {!compact && showParts && (
        <div className="mt-4">
          <h4 className="text-xs text-gray-400 font-cyber mb-2">改造部件</h4>
          <div className="grid grid-cols-6 gap-1">
            {partSlots.map((slot, i) => {
              const part = equippedParts[i];
              const partSet = part?.setId ? getPartSet(part.setId) : null;
              return (
                <div
                  key={slot}
                  className={cn(
                    'aspect-square rounded border flex items-center justify-center text-lg relative',
                    part
                      ? 'border-cyber-purple bg-cyber-purple/10'
                      : 'border-gray-700 bg-gray-800/50 text-gray-600'
                  )}
                  style={partSet ? { borderColor: `${partSet.color}60`, boxShadow: `0 0 6px ${partSet.color}30` } : undefined}
                  title={part ? `${part.name}${part.quality > 1 ? ` [${QUALITY_NAMES[part.quality]}]` : ''}${partSet ? ` (${partSet.name}套装)` : ''}` : slot}
                >
                  {part ? part.emoji : <Plus className="w-3 h-3" />}
                  {part && part.quality > 1 && (
                    <span className="absolute -top-1 -right-1 text-[8px] font-cyber font-bold leading-none px-0.5 rounded"
                      style={{ color: QUALITY_COLORS[part.quality], background: `${QUALITY_COLORS[part.quality]}25` }}>
                      {QUALITY_NAMES[part.quality].charAt(0)}
                    </span>
                  )}
                  {partSet && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] leading-none">
                      {partSet.emoji}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {activeSetBonuses.length > 0 && (
            <div className="mt-2 space-y-1">
              {(() => {
                const grouped = new Map<string, typeof activeSetBonuses>();
                for (const entry of activeSetBonuses) {
                  const existing = grouped.get(entry.setId) || [];
                  existing.push(entry);
                  grouped.set(entry.setId, existing);
                }
                return Array.from(grouped.entries()).map(([setId, entries]) => {
                  const first = entries[0];
                  return (
                    <div key={setId} className="flex items-center gap-1.5 px-2 py-1 rounded"
                      style={{ background: `${first.color}10`, border: `1px solid ${first.color}25` }}>
                      <span className="text-xs">{first.emoji}</span>
                      <span className="text-[10px] font-cyber" style={{ color: first.color }}>
                        {first.setName}
                      </span>
                      {entries.map((e, i) => (
                        <span key={i} className="text-[10px]" style={{ color: `${first.color}aa` }}>
                          {e.bonus.pieces}件
                        </span>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {!compact && showSkills && animal.skills.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs text-gray-400 font-cyber mb-2">技能</h4>
          <div className="flex gap-2">
            {animal.skills.map((skill, i) => (
              <SkillIcon key={i} skill={skill} size="sm" showName />
            ))}
            {Array.from({ length: 3 - animal.skills.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600"
              >
                <Plus className="w-4 h-4" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && (onLevelUp || action) && (
        <div className="mt-4 flex items-center justify-between gap-2">
          {onLevelUp ? (
            <>
              <span className="text-xs text-gray-400">
                升级费用: <span className="text-cyber-yellow font-cyber">{levelUpCost}</span>
              </span>
              <NeonButton
                size="sm"
                variant="yellow"
                onClick={(e) => {
                  e.stopPropagation();
                  onLevelUp();
                }}
                disabled={!canLevelUp}
              >
                <ArrowUp className="w-4 h-4 inline mr-1" />
                升级
              </NeonButton>
            </>
          ) : action ? (
            <div className="w-full text-center">
              {action}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
