import { cn } from '@/lib/utils';
import type { BattleUnit, FormationPosition, TargetStrategy } from '@/types';
import { ELEMENT_EMOJIS, ELEMENT_COLORS, ELEMENT_NAMES, STATUS_EFFECT_CONFIG } from '@/engine/constants';
import { HealthBar } from './HealthBar';
import { SkillIcon } from './SkillIcon';

const FORMATION_LABELS: Record<FormationPosition, { emoji: string; label: string; color: string }> = {
  front: { emoji: '🛡️', label: '前排', color: '#00ffff' },
  mid: { emoji: '⚔️', label: '中排', color: '#ffee00' },
  back: { emoji: '🏹', label: '后排', color: '#ff0080' },
};

const TARGET_LABELS: Record<TargetStrategy, { emoji: string; label: string }> = {
  lowestHp: { emoji: '🎯', label: '残血' },
  highestAtk: { emoji: '🔥', label: '威胁' },
  weakest: { emoji: '💥', label: '破防' },
  highestThreat: { emoji: '⚠️', label: '高危' },
  random: { emoji: '🎲', label: '随机' },
};

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

        <div
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs border border-white/50 bg-cyber-darker"
          style={{ boxShadow: `0 0 8px ${ELEMENT_COLORS[unit.element]}` }}
          title={`${ELEMENT_NAMES[unit.element]}属性`}
        >
          {ELEMENT_EMOJIS[unit.element]}
        </div>

        <div
          className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs border bg-cyber-darker"
          style={{
            borderColor: FORMATION_LABELS[unit.formationPosition].color,
            boxShadow: `0 0 6px ${FORMATION_LABELS[unit.formationPosition].color}40`,
          }}
          title={`${FORMATION_LABELS[unit.formationPosition].label}站位`}
        >
          {FORMATION_LABELS[unit.formationPosition].emoji}
        </div>

        {unit.side === 'player' && (
          <div
            className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-[10px] font-cyber border bg-cyber-darker border-cyber-yellow/50 text-cyber-yellow"
            title={`目标策略: ${TARGET_LABELS[unit.targetStrategy].label}`}
          >
            {TARGET_LABELS[unit.targetStrategy].emoji}
          </div>
        )}

        {(unit.buffs.length > 0 || unit.statusEffects.length > 0) && (
          <div className="absolute -top-2 -right-2 flex gap-0.5 flex-wrap max-w-[40px]">
            {unit.buffs.slice(0, 2).map((buff, i) => (
              <div
                key={`buff-${i}`}
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
            {unit.statusEffects.slice(0, 2).map((se, i) => {
              const config = STATUS_EFFECT_CONFIG[se.type];
              return (
                <div
                  key={`status-${i}`}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs border"
                  style={{
                    backgroundColor: `${config.color}40`,
                    borderColor: config.color,
                    color: config.color,
                  }}
                  title={`${config.name} (${se.remainingTurns}回合)`}
                >
                  {config.emoji}
                </div>
              );
            })}
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
        {unit.comboCount > 1 && (
          <div className="text-xs font-cyber text-cyber-yellow animate-pulse">
            🔥 {unit.comboCount}连击
          </div>
        )}
      </div>

      <div className="w-full">
        <HealthBar current={unit.currentHp} max={unit.maxHp} size="sm" />
      </div>

      {unit.statusEffects.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap justify-center">
          {unit.statusEffects.map((se, i) => {
            const config = STATUS_EFFECT_CONFIG[se.type];
            return (
              <span
                key={i}
                className="text-xs px-1 py-0.5 rounded"
                style={{
                  backgroundColor: `${config.color}20`,
                  color: config.color,
                  border: `1px solid ${config.color}40`,
                }}
              >
                {config.emoji}{se.remainingTurns}
              </span>
            );
          })}
        </div>
      )}

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
