import { cn } from '@/lib/utils';

interface StatBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: 'cyan' | 'pink' | 'yellow' | 'green' | 'purple' | 'red';
  icon?: string;
  className?: string;
}

export const StatBar = ({
  label,
  value,
  maxValue = 200,
  color = 'cyan',
  icon,
  className,
}: StatBarProps) => {
  const percent = Math.min(100, (value / maxValue) * 100);

  const colorClasses = {
    cyan: 'from-cyan-400 to-cyan-600 shadow-cyan-500/50',
    pink: 'from-pink-400 to-pink-600 shadow-pink-500/50',
    yellow: 'from-yellow-400 to-yellow-600 shadow-yellow-500/50',
    green: 'from-green-400 to-green-600 shadow-green-500/50',
    purple: 'from-purple-400 to-purple-600 shadow-purple-500/50',
    red: 'from-red-400 to-red-600 shadow-red-500/50',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {icon && <span className="text-lg">{icon}</span>}
      <span className="text-xs text-gray-400 w-10">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 bg-gradient-to-r shadow-lg',
            colorClasses[color]
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs font-cyber font-bold w-8 text-right">{value}</span>
    </div>
  );
};
