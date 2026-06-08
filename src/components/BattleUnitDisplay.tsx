import { cn } from '@/lib/utils';
import type { BattleUnit } from '@/types';
import { HealthBar } from './HealthBar';
import { SkillIcon } from './SkillIcon';

interface BattleUnitDisplayProps {
  unit: BattleUnit;
  isAttacking?: boolean;
  isHurt?: boolean;
  showSkills?: boolean;
  className?: string;
}

export const BattleUnitDisplay = ({
  unit,
  isAttacking = false,
  isHurt = false,
  showSkills = false,
  className,
}: BattleUnitDisplayProps) => {
  const isPlayer = unit.side === 'player';
  const hpPercent = (unit.currentHp / unit.maxHp) * 100;

  return (
    <div
      className={cn(
        'battle-unit relative flex flex-col items-center p-4 rounded-xl transition-all duration-300',
        !unit.isAlive && 'dead',
        isAttacking && 'attacking',
        isHurt && 'hurt',
        isPlayer ? 'bg-cyber-cyan/5' : 'bg-cyber-pink/5',
        className
      )}
      style={{
        borderColor: isPlayer ? '#00ffff' : '#ff0080',
        borderWidth: '2px',
        borderStyle: 'solid',
        boxShadow: unit.isAlive
          ? `0 0 20px ${isPlayer ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 0, 128, 0.3)'}`
          : 'none',
      }}
    >
      <div
        className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center mb-2',
          'transition-all duration-300',
          isPlayer ? 'bg-cyber-cyan/20' : 'bg-cyber-pink/20'
        )}
        style={{
          border: `3px solid ${isPlayer ? '#00ffff' : '#ff0080'}`,
          boxShadow: `inset 0 0 20px ${isPlayer ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 0, 128, 0.2)'}`,
        }}
      >
        <span className={cn('text-4xl', !unit.isAlive && 'grayscale opacity-50')}>
          {unit.emoji}
        </span>

        {unit.buffs.length > 0 && (
          <div className="absolute -top-2 -right-2 flex gap-0.5">
            {unit.buffs.slice(0, 3).map((buff, i) => (
              <div
                key={i}
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs border',
                  buff.value > 0
                    ? 'bg-cyber-green/80 border-cyber-green text-white'
                    : 'bg-cyber-red/80 border-cyber-red text-white'
                )}
                title={`${buff.stat}: ${buff.value > 0 ? '+' : ''}${buff.value}% (${buff.remainingTurns}回合)`}
              >
                {buff.value > 0 ? '↑' : '↓'}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full text-center mb-2">
        <div className={cn(
          'font-cyber font-bold text-sm truncate',
          isPlayer ? 'text-cyber-cyan' : 'text-cyber-pink'
        )}>
          {unit.name}
        </div>
      </div>

      <div className="w-full">
        <HealthBar current={unit.currentHp} max={unit.maxHp} size="sm" />
      </div>

      {showSkills && (
        <div className="flex gap-1 mt-2">
          {unit.skills.slice(0, 3).map((skill, i) => (
            <SkillIcon
              key={i}
              skill={skill}
              size="sm"
              cooldown={skill.currentCooldown}
              maxCooldown={skill.cooldown}
            />
          ))}
        </div>
      )}

      {!unit.isAlive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <span className="text-4xl">💀</span>
        </div>
      )}
    </div>
  );
};
