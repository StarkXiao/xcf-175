import { cn } from '@/lib/utils';

interface HealthBarProps {
  current: number;
  max: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const HealthBar = ({ current, max, showText = true, size = 'md', className }: HealthBarProps) => {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = percent <= 25;
  const isMedium = percent <= 50 && percent > 25;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('hp-bar', sizeClasses[size])}>
        <div
          className={cn(
            'hp-bar-fill',
            isLow && 'low',
            isMedium && 'medium'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showText && (
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-gray-400">HP</span>
          <span className={cn(
            'font-cyber font-bold',
            isLow ? 'text-cyber-red' : isMedium ? 'text-cyber-yellow' : 'text-cyber-green'
          )}>
            {current} / {max}
          </span>
        </div>
      )}
    </div>
  );
};
