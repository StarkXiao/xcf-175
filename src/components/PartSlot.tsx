import { cn } from '@/lib/utils';
import type { Part, PartSlot as PartSlotType, PartTemplate, PartQuality } from '@/types';
import { getRarityColor } from '@/utils/format';
import { QUALITY_NAMES, QUALITY_COLORS, getPartSet } from '@/data/parts';
import { Plus, Diamond } from 'lucide-react';

interface PartSlotProps {
  slot: PartSlotType;
  part?: Part | PartTemplate | null;
  onClick?: () => void;
  onRemove?: () => void;
  onRefine?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

const slotNames: Record<PartSlotType, string> = {
  head: '头部',
  body: '躯干',
  limbs: '四肢',
  weapon: '武器',
  core: '核心',
  special: '特殊',
};

const slotEmojis: Record<PartSlotType, string> = {
  head: '👤',
  body: '🦴',
  limbs: '🦵',
  weapon: '⚔️',
  core: '💎',
  special: '✨',
};

const getQualityBadge = (quality: PartQuality) => {
  const color = QUALITY_COLORS[quality];
  const name = QUALITY_NAMES[quality];
  if (quality <= 1) return null;
  return (
    <div
      className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}60`,
      }}
    >
      {name}
    </div>
  );
};

export const PartSlot = ({
  slot,
  part,
  onClick,
  onRemove,
  onRefine,
  selected = false,
  disabled = false,
  className,
}: PartSlotProps) => {
  const rarityColor = part ? getRarityColor(part.rarity) : '#4b5563';
  const quality = 'quality' in (part || {}) ? (part as Part).quality : 1;
  const setId = part?.setId || ('setId' in (part || {}) ? (part as PartTemplate).setId : undefined);
  const setConfig = setId ? getPartSet(setId) : undefined;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-full aspect-square rounded-xl border-2 transition-all duration-300',
          'flex flex-col items-center justify-center gap-1',
          'bg-cyber-darker hover:bg-cyber-dark',
          selected && 'ring-2 ring-cyber-cyan ring-offset-2 ring-offset-cyber-darker scale-105',
          disabled && 'opacity-50 cursor-not-allowed',
          onClick && !disabled && 'cursor-pointer hover:scale-105'
        )}
        style={{
          borderColor: part ? `${rarityColor}80` : '#374151',
          boxShadow: part ? `0 0 15px ${rarityColor}30${setConfig ? `, 0 0 8px ${setConfig.color}20` : ''}` : 'none',
        }}
      >
        {part ? (
          <>
            <span className="text-3xl">{part.emoji}</span>
            <span className="text-xs font-cyber truncate w-full text-center px-1" style={{ color: rarityColor }}>
              {part.name}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl text-gray-600">{slotEmojis[slot]}</span>
            <Plus className="w-4 h-4 text-gray-600" />
          </>
        )}
      </button>

      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyber-dark border border-gray-700 rounded text-xs font-cyber text-gray-400 whitespace-nowrap">
        {slotNames[slot]}
      </div>

      {part && quality > 1 && getQualityBadge(quality)}

      {setConfig && (
        <div
          className="absolute -top-2 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{
            background: `${setConfig.color}30`,
            border: `1.5px solid ${setConfig.color}`,
            color: setConfig.color,
            fontSize: '10px',
          }}
          title={`${setConfig.name}套装`}
        >
          {setConfig.emoji}
        </div>
      )}

      {part && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-cyber-red rounded-full flex items-center justify-center text-white text-xs hover:bg-cyber-red/80 transition-colors z-10"
        >
          ×
        </button>
      )}

      {part && onRefine && quality < 5 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefine();
          }}
          className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-10 hover:scale-110 transition-transform"
          style={{
            background: `${QUALITY_COLORS[(quality + 1) as PartQuality]}30`,
            border: `1.5px solid ${QUALITY_COLORS[(quality + 1) as PartQuality]}`,
          }}
          title={`改造为${QUALITY_NAMES[(quality + 1) as PartQuality]}`}
        >
          <Diamond className="w-3 h-3" style={{ color: QUALITY_COLORS[(quality + 1) as PartQuality] }} />
        </button>
      )}
    </div>
  );
};
