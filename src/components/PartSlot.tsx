import { cn } from '@/lib/utils';
import type { Part, PartSlot as PartSlotType } from '@/types';
import { getRarityColor } from '@/utils/format';
import { Plus } from 'lucide-react';

interface PartSlotProps {
  slot: PartSlotType;
  part?: Part | null;
  onClick?: () => void;
  onRemove?: () => void;
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

export const PartSlot = ({
  slot,
  part,
  onClick,
  onRemove,
  selected = false,
  disabled = false,
  className,
}: PartSlotProps) => {
  const rarityColor = part ? getRarityColor(part.rarity) : '#4b5563';

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
          boxShadow: part ? `0 0 15px ${rarityColor}30` : 'none',
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
    </div>
  );
};
