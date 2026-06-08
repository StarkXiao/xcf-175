import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DamageNumber {
  id: number;
  x: number;
  y: number;
  value: number;
  type: 'normal' | 'crit' | 'heal';
}

interface DamageNumberDisplayProps {
  numbers: DamageNumber[];
  onComplete?: (id: number) => void;
}

export const DamageNumberDisplay = ({ numbers, onComplete }: DamageNumberDisplayProps) => {
  return (
    <>
      {numbers.map(num => (
        <div
          key={num.id}
          className={cn(
            'damage-text',
            num.type === 'crit' && 'crit text-cyber-red',
            num.type === 'heal' && 'heal text-cyber-green',
            num.type === 'normal' && 'normal text-white'
          )}
          style={{
            left: num.x,
            top: num.y,
          }}
          onAnimationEnd={() => onComplete?.(num.id)}
        >
          {num.type === 'heal' ? '+' : '-'}{num.value}
        </div>
      ))}
    </>
  );
};

export const useDamageNumbers = () => {
  const [numbers, setNumbers] = useState<DamageNumber[]>([]);

  const addDamageNumber = (x: number, y: number, value: number, type: DamageNumber['type'] = 'normal') => {
    const id = Date.now() + Math.random();
    setNumbers(prev => [...prev, { id, x, y, value, type }]);
  };

  const removeDamageNumber = (id: number) => {
    setNumbers(prev => prev.filter(n => n.id !== id));
  };

  return {
    numbers,
    addDamageNumber,
    removeDamageNumber,
  };
};
