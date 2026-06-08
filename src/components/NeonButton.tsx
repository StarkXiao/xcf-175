import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type NeonButtonVariant = 'pink' | 'cyan' | 'purple' | 'yellow' | 'green' | 'red' | 'ghost';
type NeonButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonButtonVariant;
  size?: NeonButtonSize;
  fullWidth?: boolean;
}

export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant = 'cyan', size = 'md', fullWidth, disabled, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-6 py-2.5 text-base',
      lg: 'px-8 py-3 text-lg',
      xl: 'px-12 py-4 text-xl',
    };

    const variantClasses = {
      pink: 'neon-btn-pink',
      cyan: 'neon-btn-cyan',
      purple: 'neon-btn-purple',
      yellow: 'neon-btn-yellow',
      green: 'neon-btn-green',
      red: 'neon-btn-red',
      ghost: 'border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300 bg-transparent',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'neon-btn',
          sizeClasses[size],
          variantClasses[variant],
          fullWidth && 'w-full',
          disabled && 'neon-btn-disabled',
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

NeonButton.displayName = 'NeonButton';
