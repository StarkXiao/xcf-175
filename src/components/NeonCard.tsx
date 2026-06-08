import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type NeonCardVariant = 'default' | 'pink' | 'cyan' | 'purple' | 'yellow' | 'green' | 'red';
type NeonCardSize = 'sm' | 'md' | 'lg';

interface NeonCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: NeonCardVariant;
  size?: NeonCardSize;
  glow?: boolean;
  hover?: boolean;
}

export const NeonCard = forwardRef<HTMLDivElement, NeonCardProps>(
  ({ className, variant = 'default', size = 'md', glow = false, hover = true, children, ...props }, ref) => {
    const variantClasses = {
      default: 'border-gray-700',
      pink: 'border-cyber-pink/50 hover:border-cyber-pink',
      cyan: 'border-cyber-cyan/50 hover:border-cyber-cyan',
      purple: 'border-cyber-purple/50 hover:border-cyber-purple',
      yellow: 'border-cyber-yellow/50 hover:border-cyber-yellow',
      green: 'border-cyber-green/50 hover:border-cyber-green',
      red: 'border-cyber-red/50 hover:border-cyber-red',
    };

    const sizeClasses = {
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'card',
          sizeClasses[size],
          variantClasses[variant],
          glow && 'shadow-lg',
          hover && 'card-hover',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NeonCard.displayName = 'NeonCard';
