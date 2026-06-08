import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Empty = ({ icon: Icon, title, description, action, className }: EmptyProps) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-cyber-dark border-2 border-gray-700 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <h3 className="font-cyber font-bold text-lg text-gray-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
};
