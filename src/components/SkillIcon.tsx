import { cn } from '@/lib/utils';
import type { Skill, BattleSkill, EquippedSkill, SkillTemplate } from '@/types';
import { getSkillTemplate } from '@/data/skills';

interface SkillIconProps {
  skill: Skill | SkillTemplate | BattleSkill | EquippedSkill | string;
  level?: number;
  cooldown?: number;
  maxCooldown?: number;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

export const SkillIcon = ({
  skill,
  level,
  cooldown = 0,
  maxCooldown,
  onClick,
  selected = false,
  disabled = false,
  size = 'md',
  showName = false,
  className,
}: SkillIconProps) => {
  let template: SkillTemplate | null = null;

  if (typeof skill === 'string') {
    template = getSkillTemplate(skill) || null;
  } else if ('skillId' in skill) {
    template = getSkillTemplate(skill.skillId) || null;
    level = 'level' in skill ? skill.level : level;
    cooldown = 'currentCooldown' in skill ? skill.currentCooldown : cooldown;
  } else {
    template = skill;
  }

  if (!template) return null;

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  const typeColors: Record<string, string> = {
    attack: 'border-cyber-red',
    defense: 'border-cyber-cyan',
    heal: 'border-cyber-green',
    buff: 'border-cyber-yellow',
    debuff: 'border-cyber-purple',
    special: 'border-cyber-pink',
  };

  const isOnCooldown = cooldown > 0;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <button
        onClick={onClick}
        disabled={disabled || isOnCooldown}
        className={cn(
          'relative rounded-lg border-2 bg-cyber-darker transition-all duration-300',
          'flex items-center justify-center',
          sizeClasses[size],
          typeColors[template.type],
          selected && 'ring-2 ring-cyber-cyan ring-offset-2 ring-offset-cyber-darker',
          onClick && !disabled && !isOnCooldown && 'hover:scale-110 cursor-pointer',
          (disabled || isOnCooldown) && 'opacity-50 cursor-not-allowed',
          isOnCooldown && 'grayscale'
        )}
        title={`${template.name} - ${template.description}`}
      >
        <span className={cn(isOnCooldown && 'opacity-50')}>{template.emoji}</span>

        {level && level > 1 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyber-yellow text-cyber-darker text-xs font-bold rounded-full flex items-center justify-center">
            {level}
          </span>
        )}

        {isOnCooldown && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <span className="text-white font-cyber font-bold text-lg">{cooldown}</span>
          </div>
        )}

        {maxCooldown && maxCooldown > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-md overflow-hidden">
            <div
              className="h-full bg-cyber-cyan transition-all"
              style={{
                width: `${isOnCooldown ? ((maxCooldown - cooldown) / maxCooldown) * 100 : 100}%`,
              }}
            />
          </div>
        )}
      </button>

      {showName && (
        <span className="text-xs text-gray-400 font-cyber">{template.name}</span>
      )}
    </div>
  );
};
